const { randomLine, getBowlingCall, getBattingCall, getHattrickCall, randomMilestoneLine, randomGif } = require("../commentary");

/* ================= DEPS (injected via init) ================= */

let bot, getName, clearTimers, swapStrike, checkOverEnd, advanceGame,
    endInnings, sendWithGif, battingPlayers, bowlDMButton;

function init(deps) {
  bot           = deps.bot;
  getName       = deps.getName;
  clearTimers   = deps.clearTimers;
  swapStrike    = deps.swapStrike;
  checkOverEnd  = deps.checkOverEnd;
  advanceGame   = deps.advanceGame;
  endInnings    = deps.endInnings;
  sendWithGif   = deps.sendWithGif;
  battingPlayers = deps.battingPlayers;
  bowlDMButton  = deps.bowlDMButton;
}


/* ================= TEAM TIMER HELPERS ================= */

function stopTeamTimer(match) {
  if (match.bowlerTimer) {
    clearTimeout(match.bowlerTimer);
    match.bowlerTimer = null;
  }

  if (match.teamTimerStart) {
    const used = Date.now() - match.teamTimerStart;
    match.teamBowlerTimeLeft = Math.max(0, (match.teamBowlerTimeLeft || 0) - used);
    match.teamTimerStart = null;
  }
}


/* ================= TIMER CONTROLLER ================= */

function startTurnTimer(match, type) {
  clearTimers(match);

  match.warning30 = setTimeout(() => {
    if ((type === "bowl" && match.awaitingBowl) ||
        (type === "bat"  && match.awaitingBat)) {
      bot.telegram.sendMessage(
        match.groupId,
        `⏳ ${type === "bowl" ? "Bowler" : "Batter"} — 30s left`
      );
    }
  }, 30000);

  match.warning10 = setTimeout(() => {
    if ((type === "bowl" && match.awaitingBowl) ||
        (type === "bat"  && match.awaitingBat)) {
      bot.telegram.sendMessage(
        match.groupId,
        `🚨 ${type === "bowl" ? "Bowler" : "Batter"} — 10s left`
      );
    }
  }, 50000);

  match.ballTimer = setTimeout(() => ballTimeout(match), 60000);
}


/* ================= BALL TIMEOUT ================= */

async function ballTimeout(match) {

  if (!match || match.phase === "idle") return;
  if (match.phase !== "play") return;
  if (match.phase === "set_bowler") return; // ✅ FIX
  if (match.ballLocked) return;

  match.ballLocked = true;

  try {
    clearTimers(match);

    /* BOWLER MISSED */
    if (match.awaitingBowl) {

      match.awaitingBowl = false;
      match.bowlerMissCount = (match.bowlerMissCount || 0) + 1;
      match.score += 6;

      await bot.telegram.sendMessage(
        match.groupId,
`╭───────────╮
   ⏱ Bowler Timed Out
╰───────────╯
+6 runs to batting team
Ball does not count`
      );

      if (match.bowlerMissCount >= 2) {
        match.bowlerMissCount = 0;
        if (!match.suspendedBowlers) match.suspendedBowlers = {};
        match.suspendedBowlers[match.bowler] = match.currentOver + 1;
        match.phase = "set_bowler";

        await bot.telegram.sendMessage(
          match.groupId,
`╭───────────╮
   🚫 Bowler Suspended
╰───────────╯
👉 /bowler [number] new bowler`
        );
        return;
      }

      if (await checkOverEnd(match)) return;
      await advanceGame(match);
      return;
    }

    /* BATTER MISSED */
    if (match.awaitingBat) {

      match.awaitingBat = false;
      match.batterMissCount = (match.batterMissCount || 0) + 1;

      match.currentBall++;

      // ✅ FIX: prevent negative score
      match.score = Math.max(0, match.score - 6);

      if (!match.batterStats[match.striker])
        match.batterStats[match.striker] = { runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0 };

      match.batterStats[match.striker].runs =
        Math.max(0, match.batterStats[match.striker].runs - 6);

      match.batterStats[match.striker].balls++;
      match.currentPartnershipRuns -= 6;
      match.currentPartnershipBalls++;

      await bot.telegram.sendMessage(
        match.groupId,
`╭───────────╮
   ⏱ Batter Timed Out
╰───────────╯
-6 run penalty
Ball counted`
      );

      if (match.batterMissCount >= 2) {
        match.batterMissCount = 0;
        match.wickets++;

        if (!match.timedOutBatters) match.timedOutBatters = [];
        match.timedOutBatters.push(match.striker);

        await bot.telegram.sendMessage(
  match.groupId,
`╭───────────╮
   💥 Batter Dismissed
╰───────────╯
👉 /batter [number] new batter`
);

        if (match.wickets >= match.maxWickets) {
          await endInnings(match);
          return;
        }

        match.phase = "new_batter";
        return;
      }

      if (await checkOverEnd(match)) return;
      await advanceGame(match);
      return;
    }

  } catch (err) {
    console.error("ballTimeout error:", err);
  } finally {
    match.ballLocked = false;
    match.batNumber  = null;
    match.bowlNumber = null;
  }
}


/* ================= ANNOUNCE BALL ================= */

async function announceBall(match) {
  
  clearTimers(match);

  if (!match || !match.bowler || !match.striker) return;
  if (match.phase === "switch") return;
  if (match.inningsEnded) return;

  clearTimers(match);

  match.batNumber      = null;
  match.bowlNumber     = null;
  match.ballLocked     = false;
  match.processingBall = false;
  match.awaitingBowl   = true;
  match.awaitingBat    = false;

  const bowlerName = getName(match, match.bowler);

  await bot.telegram.sendMessage(
    match.groupId,
    `[🏐 ${bowlerName}](tg://user?id=${match.bowler})`,
    { parse_mode: "Markdown" }
  );

  const bowlingCall = getBowlingCall();
  const bowlingGif  = bowlingCall.gif;
  const bowlingOpts = bowlDMButton();

  if (bowlingGif) {
    try {
      if (bowlingGif.startsWith("BAAC")) {
        await bot.telegram.sendVideo(match.groupId, bowlingGif, { caption: bowlingCall.text, ...bowlingOpts });
      } else {
        await bot.telegram.sendAnimation(match.groupId, bowlingGif, { caption: bowlingCall.text, ...bowlingOpts });
      }
    } catch (e) {
      console.error("Bowling gif failed:", e.message);
      await bot.telegram.sendMessage(match.groupId, bowlingCall.text, bowlingOpts);
    }
  } else {
    await bot.telegram.sendMessage(match.groupId, bowlingCall.text, bowlingOpts);
  }

  try {
    const strikerName = getName(match, match.striker);
    await bot.telegram.sendMessage(
      match.bowler,
`╭───────────╮
   🎯 Your Turn — Bowl
╰───────────╯
🏏 Facing: ${strikerName}
Send your number 1 – 6`
    );
  } catch (e) {
    console.log("Bowler DM failed:", e.message);
  }
}


/* ================= START BALL ================= */

async function startBall(match) {
  if (!match) return;
  if (match.phase === "switch") return;
  if (match.phase === "set_bowler") return;
  if (match.phase === "new_batter") return;

  // ✅ STOP TEAM TIMER WHEN BALL STARTS
  stopTeamTimer(match);

  if (match.currentOver >= match.totalOvers) return;
  if (match.wickets >= match.maxWickets) {
    await endInnings(match);
    return;
  }

  if (!match.overHistory) match.overHistory = [];

  if (match.bowler) {
    const lastEntry = match.overHistory[match.overHistory.length - 1];
    if (!lastEntry || lastEntry.over !== match.currentOver + 1) {
      match.overHistory.push({
        over: match.currentOver + 1,
        bowler: match.bowler,
        balls: []
      });
    }
  }

  clearTimers(match);
  match.phase = "play";
  match.awaitingBowl = true;
  match.awaitingBat = false;

  await announceBall(match);
  startTurnTimer(match, "bowl");
}


/* ================= PROCESS BALL ================= */

async function processBall(match) {
  if (!match) return;
  if (match.batNumber === null || match.bowlNumber === null) return;

  clearTimers(match);

  let hattrickRetry = false;

  try {
    const bat  = parseInt(match.batNumber);
    const bowl = parseInt(match.bowlNumber);

    /* HATTRICK BLOCK */
    if (match.wicketStreak === 2 && bat === 0) {
      await bot.telegram.sendMessage(
        match.groupId,
`╭───────────╮
   ⚠️ Hattrick Ball!
╰───────────╯
Cannot play 0 — two wickets in a row!`
      );
      match.batNumber  = null;
      match.awaitingBat  = true;
      match.ballLocked   = false;
      hattrickRetry      = true;
      startTurnTimer(match, "bat");
      return;
    }

    match.bowlerMissCount = 0;
    match.batterMissCount = 0;

    if (!match.batterStats[match.striker])
      match.batterStats[match.striker] = { runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0 };
    match.batterStats[match.striker].balls++;

    if (!match.bowlerStats[match.bowler])
      match.bowlerStats[match.bowler] = { balls: 0, runs: 0, wickets: 0, history: [] };
    match.bowlerStats[match.bowler].balls++;
    match.bowlerStats[match.bowler].history.push(bat);

    /* WICKET */
    if (bat === bowl) {
      match.wickets++;
      match.wicketStreak++;
      match.currentBall++;
      match.currentPartnershipBalls++;
      match.bowlerStats[match.bowler].wickets++;

      if (match.batterStats[match.striker])
        match.batterStats[match.striker].dismissedBy = match.bowler;

      const lastOver = match.overHistory[match.overHistory.length - 1];
      if (lastOver) lastOver.balls.push("W");

      match.currentPartnershipRuns  = 0;
      match.currentPartnershipBalls = 0;

      // ── Duck check ──
      const batterRunsAtDismissal = match.batterStats[match.striker]?.runs ?? 0;
      const isDuck = batterRunsAtDismissal === 0;
      const isHattrick = match.wicketStreak === 3;

      // Only show wicket gif if it's NOT a duck and NOT a hattrick
      if (!isDuck && !isHattrick) {
        await sendWithGif(match.groupId, "wicket", randomLine("wicket"));
      }

      // Duck gif (replaces wicket gif)
      if (isDuck) {
        match.duckStreak = (match.duckStreak || 0) + 1;
        if (match.duckStreak >= 3) {
          await bot.telegram.sendMessage(match.groupId, randomMilestoneLine('duckHattrick'));
          match.duckStreak = 0;
        } else {
          await sendWithGif(match.groupId, 'duck', randomMilestoneLine('duck'));
        }
      } else {
        match.duckStreak = 0;
      }

      // ── Bowling fer milestones ──
      const bowlerWkts = match.bowlerStats[match.bowler]?.wickets ?? 0;
      if      (bowlerWkts === 3) await bot.telegram.sendMessage(match.groupId, randomMilestoneLine('threeFer'));
      else if (bowlerWkts === 4) await bot.telegram.sendMessage(match.groupId, randomMilestoneLine('fourFer'));
      else if (bowlerWkts === 5) await bot.telegram.sendMessage(match.groupId, randomMilestoneLine('fiveFer'));
      else if (bowlerWkts >= 6)  await bot.telegram.sendMessage(match.groupId, randomMilestoneLine('sixFer'));

      // ── Hattrick (replaces wicket gif) ──
      if (isHattrick) {
        const hattrickCall = getHattrickCall();
        if (hattrickCall.gif) {
          try {
            if (hattrickCall.gif.startsWith("BAAC")) {
              await bot.telegram.sendVideo(match.groupId, hattrickCall.gif, { caption: hattrickCall.text });
            } else {
              await bot.telegram.sendAnimation(match.groupId, hattrickCall.gif, { caption: hattrickCall.text });
            }
          } catch (e) {
            console.error("Hattrick gif failed:", e.message);
            await bot.telegram.sendMessage(match.groupId, hattrickCall.text);
          }
        } else {
          await bot.telegram.sendMessage(match.groupId, hattrickCall.text);
        }
        match.wicketStreak = 0;
      }

      if (match.wickets >= match.maxWickets) {
        match.awaitingBowl = false;
        match.awaitingBat  = false;
        await endInnings(match);
        return;
      }

      if (match.currentBall >= 6) {
        const overEnded = await checkOverEnd(match);
        if (overEnded) return;
      }

      match.phase        = "new_batter";
      match.awaitingBowl = false;
      match.awaitingBat  = false;

      await bot.telegram.sendMessage(
        match.groupId,
`╭───────────╮
   💥 Wicket!
╰───────────╯
👉 /batter [number] new batter`
      );
      return;
    }

    /* RUNS */
    match.score                   += bat;
    match.currentOverRuns         += bat;
    match.currentPartnershipRuns  += bat;
    match.currentPartnershipBalls++;
    match.batterStats[match.striker].runs += bat;
    match.bowlerStats[match.bowler].runs  += bat;
    match.currentBall++;

    if (bat === 4) match.batterStats[match.striker].fours++;
    if (bat === 5) match.batterStats[match.striker].fives++;
    if (bat === 6) match.batterStats[match.striker].sixes++;

    const lastOver = match.overHistory[match.overHistory.length - 1];
    if (lastOver) lastOver.balls.push(bat);

    match.wicketStreak = 0;

    // ── Partnership milestones ──
    if (match.currentPartnershipRuns === 50)
      await sendWithGif(match.groupId, 'partnership', randomMilestoneLine('partnership50'));
    else if (match.currentPartnershipRuns === 100)
      await sendWithGif(match.groupId, 'partnership', randomMilestoneLine('partnership100'));

    await sendWithGif(match.groupId, bat, randomLine(bat));

    // ── Batter milestones ──
    const bRuns       = match.batterStats[match.striker]?.runs ?? 0;
    const bRunsBefore = bRuns - bat;
    if (bRunsBefore < 50 && bRuns >= 50 && bRuns < 100)
      await sendWithGif(match.groupId, 'fifty', randomMilestoneLine('fifty'));
    else if (bRunsBefore < 100 && bRuns >= 100)
      await sendWithGif(match.groupId, 'hundred', randomMilestoneLine('hundred'));

    if ([1, 3, 5].includes(bat)) swapStrike(match);

    if (match.innings === 2 && match.score >= match.firstInningsScore + 1) {
      await endInnings(match);
      return;
    }

    const overEnded = await checkOverEnd(match) || false;
    if (!overEnded) await advanceGame(match);

  } catch (err) {
    console.error("processBall error:", err);
  } finally {
    match.batNumber = null;
    if (!hattrickRetry) match.bowlNumber = null;
    match.ballLocked     = false;
    match.processingBall = false;
  }
}


/* ================= EXPORTS ================= */

module.exports = { init, startBall, processBall, startTurnTimer };