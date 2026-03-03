function addRuns(match, runs) {
  if (match.innings === 1) match.scoreA += runs;
  else match.scoreB += runs;
}

function addWicket(match) {
  if (match.innings === 1) match.wicketsA++;
  else match.wicketsB++;
}

function switchInnings(match) {
  match.innings = 2;

const battingPlayers = (match) =>
  match.battingTeam === "A" ? match.teamA : match.teamB;

const bowlingPlayers = (match) =>
  match.bowlingTeam === "A" ? match.teamA : match.teamB;

function orderedBattingPlayers(match) {
  if (!match) return [];

  const players = battingPlayers(match);
  const captainId =
    match.battingTeam === "A" ? match.captains.A : match.captains.B;

  return [
    ...players.filter(p => p.id === captainId),
    ...players.filter(p => p.id !== captainId)
  ];
}

function swapStrike(match) {
  if (!match) return;
  const t = match.striker;
  match.striker = match.nonStriker;
  match.nonStriker = t;
}

function clearTimers(match) {
  if (!match) return;

  if (match.warning30) clearTimeout(match.warning30);
  if (match.warning10) clearTimeout(match.warning10);
  if (match.ballTimer) clearTimeout(match.ballTimer);

  match.warning30 = null;
  match.warning10 = null;
  match.ballTimer = null;
}

function advanceGame(match) {
  if (!match) return;

  if (match.phase === "switch") return;

  if (match.wickets >= match.maxWickets) {
    endInnings(match);
    return;
  }

  if (match.currentOver >= match.totalOvers) {
    endInnings(match);
    return;
  }

  startBall(match);
}
}



/* ================= START BALL ================= */

async function startBall(match) {

  if (!match) return;

  // 🔥 HARD STOPS
  if (match.phase === "switch") return;
  if (match.currentOver >= match.totalOvers) return;
  if (match.wickets >= match.maxWickets) return;

  // ✅ Stop previous timers
  clearTimers(match);

  // Set phase flags
  match.awaitingBowl = true;
  match.awaitingBat = false;

  // Announce the ball
  await announceBall(match);

  // Start turn timer
  startTurnTimer(match, "bowl");
}



/* ================= HANDLE INPUT ================= */

bot.on("text", async (ctx, next) => {

  // 🔥 Let commands pass through
  if (ctx.message.text.startsWith("/")) {
    return next();
  }

  const match = getMatch(ctx);
  if (!match) return;

  /* ================= GROUP BATTER INPUT ================= */

  if (ctx.chat.type !== "private") {

    if (match.phase !== "play") return;
    if (!match.awaitingBat) return;

    if (ctx.from.id !== match.striker)
      return ctx.reply("❌ You are not the striker.");

    const text = ctx.message.text.trim();

    if (!/^[0-6]$/.test(text))
      return ctx.reply("❌ Send number between 0-6.");

    match.batNumber = Number(text);
    match.awaitingBat = false;

    clearTimers(match);

    return processBall(match);
  }

  /* ================= PRIVATE BOWLER INPUT ================= */

  if (match.phase !== "play") 
    return ctx.reply("⚠️ No active ball.");

  if (!match.awaitingBowl)
    return ctx.reply("⏳ Not accepting bowl now.");

  if (ctx.from.id !== match.bowler)
    return ctx.reply("❌ You are not the current bowler.");

  const text = ctx.message.text.trim();

  if (!/^[1-6]$/.test(text))
    return ctx.reply("❌ Send number between 1-6.");

  match.bowlNumber = Number(text);
  match.awaitingBowl = false;
  match.awaitingBat = true;

  clearTimers(match);

  await ctx.reply("✅ Ball submitted!");

  const batterPing =
    `[🏏 ${getName(match.striker)}](tg://user?id=${match.striker})`;

  const ballNumber = `${match.currentOver}.${match.currentBall + 1}`;

  await bot.telegram.sendMessage(
    match.groupId,
    `${batterPing}\n\n${randomBatterPrompt()}\n\n🎱 Ball: ${ballNumber}`,
    { parse_mode: "Markdown" }
  );

  startTurnTimer(match, "bat");
});




/* ================= PROCESS BALL ================= */

async function processBall(match) {

  // 🔒 TRUE ATOMIC LOCK
  if (!match || match.ballLocked) return;
  match.ballLocked = true;

  try {

    clearTimers(match);

    const bat = Number(match.batNumber);
    const bowl = Number(match.bowlNumber);

    if (bat === null || bowl === null) return;

    // 🔄 Reset misses
    match.bowlerMissCount = 0;
    match.batterMissCount = 0;

    /* ================= HATTRICK BLOCK ================= */

    if (match.wicketStreak === 2 && bat === 0) {

      await bot.telegram.sendMessage(
        match.groupId,
        "🔥 HATTRICK BALL! Batter cannot play 0!"
      );

      match.awaitingBat = true;
      startTurnTimer("bat");
      return;
    }

    /* ================= INIT BATTER ================= */

    if (!match.batterStats[match.striker]) {
      match.batterStats[match.striker] = { runs: 0, balls: 0 };
    }

    match.batterStats[match.striker].balls++;

    /* ================= INIT BOWLER ================= */

    if (!match.bowlerStats[match.bowler]) {
      match.bowlerStats[match.bowler] = {
        balls: 0,
        runs: 0,
        wickets: 0,
        history: []
      };
    }

    match.bowlerStats[match.bowler].balls++;
    match.bowlerStats[match.bowler].history.push(bat);

    /* ================= WICKET ================= */

    if (bat === bowl) {

      match.wickets++;
      match.wicketStreak++;
      match.bowlerStats[match.bowler].wickets++;
      match.currentBall++;

      match.overHistory.at(-1)?.balls.push("W");
      match.currentPartnershipBalls++;

      const line =
        match.wicketStreak === 3
          ? randomLine("hattrick")
          : randomLine("wicket");

      await bot.telegram.sendMessage(match.groupId, line);

      await bot.telegram.sendMessage(
        match.groupId,
        `🤝 Partnership Broken!
Runs: ${match.currentPartnershipRuns}
Balls: ${match.currentPartnershipBalls}`
      );

      match.currentPartnershipRuns = 0;
      match.currentPartnershipBalls = 0;

      if (match.wickets >= match.maxWickets) {
        await endInnings();
        return;
      }

      if (handleOverCompletion()) return;

      match.phase = "new_batter";

      await bot.telegram.sendMessage(
        match.groupId,
        "📢 Send new batter:\n/batter number"
      );

      return;
    }

    /* ================= RUNS (NEGATIVE ALLOWED) ================= */

    match.score += bat;                 // ✅ negative runs allowed
    match.currentOverRuns += bat;
    match.currentPartnershipRuns += bat;
    match.currentPartnershipBalls++;

    match.batterStats[match.striker].runs += bat;
    match.bowlerStats[match.bowler].runs += bat;

    match.currentBall++;
    match.overHistory.at(-1)?.balls.push(bat);

    match.wicketStreak = 0;

    /* ================= PARTNERSHIP MILESTONES ================= */

    if (match.currentPartnershipRuns === 50) {
      await bot.telegram.sendMessage(match.groupId, "🔥 50 Run Partnership!");
    }

    if (match.currentPartnershipRuns === 100) {
      await bot.telegram.sendMessage(match.groupId, "💯 100 Run Partnership!");
    }

    /* ================= COMMENTARY ================= */

    await bot.telegram.sendMessage(
      match.groupId,
      randomLine(bat)
    );

    /* ================= STRIKE ROTATION ================= */

    if ([1, 3, 5, -1, -3, -5].includes(bat)) { // optional: rotate on negative odd
      swapStrike();
    }

    /* ================= CHASE CHECK ================= */

    if (
      match.innings === 2 &&
      match.score > match.firstInningsScore
    ) {
      await endInnings(match);
      return;
    }

    /* ================= OVER COMPLETION ================= */

    if (handleOverCompletion()) return;

    /* ================= NEXT BALL ================= */

    advanceGame();

  } catch (err) {
    console.error("processBall error:", err);
  } finally {

    // 🔓 UNLOCK AFTER COMPLETE
    match.ballLocked = false;

    match.batNumber = null;
    match.bowlNumber = null;
  }
}



module.exports = {
  addRuns,
  addWicket,
  switchInnings
};