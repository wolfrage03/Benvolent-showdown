const store = require("../../state/inMemoryStore");
const engine = require("../../core/engine");

module.exports = (bot) => {

  /* ================= SET BATTER ================= */

bot.command("batter", (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (!isHost(match, ctx.from.id)) return;

  if (ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ Send batter number in GROUP only.");

  const num = parseInt(ctx.message.text.split(" ")[1]);
  if (!num) return ctx.reply("❌ Provide batter number");

  const players = orderedBattingPlayers(match);

  if (num < 1 || num > players.length)
    return ctx.reply("❌ Invalid number");

  const selected = players[num - 1];
  if (!selected) return ctx.reply("⚠️ Player not found");

  if (match.usedBatters.includes(selected.id))
    return ctx.reply("⚠️ Player already batted / dismissed");

  const name = selected.name;
  const orderNumber = match.usedBatters.length + 1;

  const ordinal = (n) => {
    const s = ["th","st","nd","rd"];
    const v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  };

  /* STRIKER */
  if (match.phase === "set_striker") {

    match.striker = selected.id;
    match.batterStats[selected.id] = { runs: 0, balls: 0 };

    match.usedBatters.push(selected.id);
    match.phase = "set_non_striker";

    return ctx.reply(
`🏏 ${name} is ${ordinal(orderNumber)} batter at STRIKER end

Now send NON-STRIKER:
/batter number`);
  }

  /* NON STRIKER */
  if (match.phase === "set_non_striker") {

    if (selected.id === match.striker)
      return ctx.reply("⚠️ Choose different player");

    match.nonStriker = selected.id;
    match.usedBatters.push(selected.id);
    match.maxWickets = players.length - 1;

    match.phase = "set_bowler";

    return ctx.reply(
`🏏 ${name} is ${ordinal(orderNumber)} batter at NON-STRIKER end

🎯 Send bowler:
/bowler number`);
  }

  /* NEW BATTER */
  if (match.phase === "new_batter") {

    if (selected.id === match.nonStriker)
      return ctx.reply("⚠️ Choose different player");

    match.striker = selected.id;
    match.batterStats[selected.id] = { runs: 0, balls: 0 };

    match.usedBatters.push(selected.id);
    match.phase = "play";

    ctx.reply(`🏏 ${name} is ${ordinal(orderNumber)} batter`);

    return startBall();
  }
  

});

/* ================= SET BOWLER ================= */

bot.command("bowler", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (match.phase !== "set_bowler")
    return ctx.reply("⚠️ You can set bowler only when bot asks.");

  if (ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ This match is not running here.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can set bowler.");

  const num = parseInt(ctx.message.text.split(" ")[1]);
  if (!num) return ctx.reply("Invalid number");

  const base = bowlingPlayers(match);
  const captainId =
    match.bowlingTeam === "A"
      ? match.captains.A
      : match.captains.B;

  const players = [
    ...base.filter(p => p.id === captainId),
    ...base.filter(p => p.id !== captainId)
  ];

  if (num < 1 || num > players.length)
    return ctx.reply("⚠️ Invalid player number.");

  const player = players[num - 1];

  if (match.lastOverBowler === player.id)
    return ctx.reply("⚠️ Same bowler cannot bowl consecutive overs.");

  if (match.suspendedBowlers?.[player.id] >= match.currentOver)
    return ctx.reply("⚠️ This bowler is suspended for this over.");

  match.bowler = player.id;
  match.lastOverBowler = player.id;

  match.overHistory.push({
    over: match.currentOver + 1,
    bowler: match.bowler,
    balls: []
  });

  match.phase = "play";
  match.awaitingBat = false;
  match.awaitingBowl = true;

  await ctx.reply(
`🎯 Bowler Selected: ${player.name}

Ball starting...`
  );

  advanceGame();
});


/* ================= SCORE ================= */

function getLiveScore(match) {

  if (!match) return "⚠️ No active match.";

  const overs = `${match.currentOver}.${match.currentBall}`;

  const ballsBowled = (match.currentOver * 6) + match.currentBall;
  const totalBalls = (match.totalOvers || 0) * 6;
  const ballsLeft = Math.max(totalBalls - ballsBowled, 0);

  const runRate =
    ballsBowled > 0
      ? ((match.score / ballsBowled) * 6).toFixed(2)
      : "0.00";

  let requiredRuns = "";
  let requiredRR = "";

  if (match.innings === 2) {
    const runsNeeded = (match.firstInningsScore + 1) - match.score;

    requiredRuns = runsNeeded > 0
      ? `🎯 Need ${runsNeeded} from ${ballsLeft} balls`
      : "✅ Target Achieved";

    requiredRR =
      (runsNeeded > 0 && ballsLeft > 0)
        ? ((runsNeeded / ballsLeft) * 6).toFixed(2)
        : "-";
  }

  const strikerStats =
    match.batterStats?.[match.striker] || { runs: 0, balls: 0 };

  const nonStrikerStats =
    match.batterStats?.[match.nonStriker] || { runs: 0, balls: 0 };

  const strikerSR =
    strikerStats.balls > 0
      ? ((strikerStats.runs / strikerStats.balls) * 100).toFixed(1)
      : "0.0";

  const nonStrikerSR =
    nonStrikerStats.balls > 0
      ? ((nonStrikerStats.runs / nonStrikerStats.balls) * 100).toFixed(1)
      : "0.0";

  const bowlerStats =
    match.bowlerStats?.[match.bowler] || {
      balls: 0,
      runs: 0,
      wickets: 0,
      history: []
    };

  const bowlerOvers =
    Math.floor(bowlerStats.balls / 6) + "." + (bowlerStats.balls % 6);

  const economy =
    bowlerStats.balls > 0
      ? ((bowlerStats.runs / bowlerStats.balls) * 6).toFixed(2)
      : "0.00";

  const dots =
    bowlerStats.history?.filter(x => x === 0).length || 0;

  const overHistoryFormatted =
    match.overHistory?.length
      ? match.overHistory
          .map((o, i) => `${i + 1}: ${o.balls.join(" ")}`)
          .join(" | ")
      : "Yet to start";

  const partnershipRuns = match.currentPartnershipRuns || 0;
  const partnershipBalls = match.currentPartnershipBalls || 0;

  return `
╔═══════════════════╗
🏏  LIVE SCOREBOARD
╚═══════════════════╝

📊 ${match.score}/${match.wickets}  (${overs}/${match.totalOvers})
⚡ RR: ${runRate}${match.innings === 2 ? ` | RRR: ${requiredRR}` : ""}

${match.innings === 2 ? requiredRuns + "\n" : ""}
🔵 Batting: ${
  match.battingTeam === "A"
    ? `${match.teamAName} (A)`
    : `${match.teamBName} (B)`
}

🔴 Bowling: ${
  match.bowlingTeam === "A"
    ? `${match.teamAName} (A)`
    : `${match.teamBName} (B)`
}

━━━━━━━━━━━━━━━━━━
🏏 Batters
⭐ ${getName(match.striker)}*  ${strikerStats.runs}(${strikerStats.balls})  SR:${strikerSR}
   ${getName(match.nonStriker)}  ${nonStrikerStats.runs}(${nonStrikerStats.balls})  SR:${nonStrikerSR}

🎯 Bowler
${getName(match.bowler)}
${bowlerOvers}-${dots}-${bowlerStats.runs}-${bowlerStats.wickets}  Econ:${economy}

🤝 Partnership: ${partnershipRuns} (${partnershipBalls})

📜 Overs: ${overHistoryFormatted}
`;
}

bot.command("score", (ctx) => {

  const match = getMatch(ctx);
  if (!match)
    return ctx.reply("⚠️ No active match.");

  ctx.reply(getLiveScore(match));
});


/* ================= BALL TIMEOUT ================= */

async function ballTimeout(match) {

  if (!match || match.phase === "idle") return;
  if (match.phase !== "play") return;

  // 🔒 Prevent collision with processBall
  if (match.ballLocked) return;
  match.ballLocked = true;

  try {

    clearTimers(match);

    /* ================= BOWLER MISSED ================= */

    if (match.awaitingBowl) {

      match.awaitingBowl = false;
      match.bowlerMissCount = (match.bowlerMissCount || 0) + 1;

      match.score += 6;

      await bot.telegram.sendMessage(
        match.groupId,
`⚠️ Bowler missed!
+6 runs awarded (Ball does NOT count)`
      );

      if (match.bowlerMissCount >= 2) {

        match.bowlerMissCount = 0;

        if (!match.suspendedBowlers)
          match.suspendedBowlers = {};

        match.suspendedBowlers[match.bowler] =
          match.currentOver + 1;

        match.phase = "set_bowler";

        await bot.telegram.sendMessage(
          match.groupId,
`🚫 Bowler removed due to consecutive delays.
Cannot bowl this over and next over.

Host select new bowler:
/bowler number`
        );

        return;
      }

      if (handleOverCompletion(match)) return;

      advanceGame(match);
      return;
    }

    /* ================= BATTER MISSED ================= */

    if (match.awaitingBat) {

      match.awaitingBat = false;
      match.batterMissCount = (match.batterMissCount || 0) + 1;

      match.currentBall++;
      match.score -= 6; // ✅ negative score allowed

      if (!match.batterStats[match.striker])
        match.batterStats[match.striker] = { runs: 0, balls: 0 };

      match.batterStats[match.striker].runs -= 6;
      match.batterStats[match.striker].balls++;

      await bot.telegram.sendMessage(
        match.groupId,
`⚠️ Batter missed!
-6 runs penalty (Ball counted)`
      );

      if (match.batterMissCount >= 2) {

        match.batterMissCount = 0;
        match.wickets++;

        await bot.telegram.sendMessage(
          match.groupId,
          "❌ Batter OUT due to consecutive delay!"
        );

        if (match.wickets >= match.maxWickets) {
          await endInnings(match);
          return;
        }

        match.phase = "new_batter";

        await bot.telegram.sendMessage(
          match.groupId,
          "📢 Send new batter:\n/batter number"
        );

        return;
      }

      if (handleOverCompletion(match)) return;

      advanceGame(match);
      return;
    }

  } catch (err) {
    console.error("ballTimeout error:", err);
  } finally {

    // 🔓 Always unlock
    match.ballLocked = false;

    // 🔄 Reset inputs
    match.batNumber = null;
    match.bowlNumber = null;
  }
}

};