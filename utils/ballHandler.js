const { randomLine, getBowlingCall, getBattingCall, getHattrickCall, randomMilestoneLine, randomGif } = require("../commentary");
const box = require("../utils/boxMessage");

/* ================= DEPS (injected via init) ================= */

let bot, getName, clearTimers, swapStrike, checkOverEnd, advanceGame,
    endInnings, sendWithGif, battingPlayers, bowlDMButton;

function init(deps) {
  bot             = deps.bot;
  getName         = deps.getName;
  clearTimers     = deps.clearTimers;
  swapStrike      = deps.swapStrike;
  checkOverEnd    = deps.checkOverEnd;
  advanceGame     = deps.advanceGame;
  endInnings      = deps.endInnings;
  sendWithGif     = deps.sendWithGif;
  battingPlayers  = deps.battingPlayers;
  bowlDMButton    = deps.bowlDMButton;
}


/* ================= DISAPPEARING EMOJI ================= */

const RESULT_EMOJI = {
  skull: "💀",
  fire:  "🔥",
  fist:  "🤜",
};

function getResultEmoji(bat, isWicket) {
  if (isWicket)                return "skull";
  if ([4, 5, 6].includes(bat)) return "fire";
  return "fist";
}

async function sendDisappearingEmoji(groupId, replyToMsgId, emojiKey) {
  const emoji = RESULT_EMOJI[emojiKey];
  if (!emoji) return null;
  try {
    const sent = await bot.telegram.sendMessage(groupId, emoji, {
      reply_to_message_id:         replyToMsgId,
      allow_sending_without_reply: true,
    });
    // FIX: return the sent message_id so caller can delete batter message AFTER emoji is sent
    return sent.message_id;
  } catch (e) {
    console.error("Disappearing emoji failed:", e.message);
    return null;
  }
}

// Delete the emoji after delay, and also delete the batter's number message
function scheduleCleanup(groupId, emojiMsgId, batterMsgId) {
  setTimeout(() => {
    if (emojiMsgId)  bot.telegram.deleteMessage(groupId, emojiMsgId).catch(() => {});
    // FIX: Batter message deleted AFTER emoji has been sent and is visible
    if (batterMsgId) bot.telegram.deleteMessage(groupId, batterMsgId).catch(() => {});
  }, 1500);
}


/* ================= TURN TIMER ================= */

function startTurnTimer(match, type) {
  match.warning30 = setTimeout(() => {
    if ((type === "bowl" && match.awaitingBowl) ||
        (type === "bat"  && match.awaitingBat)) {
      const playerId   = type === "bowl" ? match.bowler : match.striker;
      const playerName = getName(match, playerId);
      const ping       = playerId ? `<a href="tg://user?id=${playerId}">${playerName}</a>` : "";
      bot.telegram.sendMessage(match.groupId, `${ping} ⏳ 30s left`, { parse_mode: "HTML" });
    }
  }, 30000);

  match.warning10 = setTimeout(() => {
    if ((type === "bowl" && match.awaitingBowl) ||
        (type === "bat"  && match.awaitingBat)) {
      const playerId   = type === "bowl" ? match.bowler : match.striker;
      const playerName = getName(match, playerId);
      const ping       = playerId ? `<a href="tg://user?id=${playerId}">${playerName}</a>` : "";
      bot.telegram.sendMessage(match.groupId, `${ping} 🚨 10s left`, { parse_mode: "HTML" });
    }
  }, 50000);

  match.ballTimer = setTimeout(() => ballTimeout(match), 60000);
}


/* ================= BALL TIMEOUT ================= */

async function ballTimeout(match) {
  if (!match) return;
  // FIX: Removed `match.phase !== "play"` check — phase can shift to "new_batter"
  // or "set_bowler" during processing, causing timeout to silently do nothing.
  // Instead only bail if match is truly idle or innings ended.
  if (match.phase === "idle") return;
  if (match.inningsEnded) return;
  if (match.ballLocked) return;
  match.ballLocked = true;

  try {
    clearTimers(match);

    /* ── BOWLER MISSED ── */
    if (match.awaitingBowl) {
      match.awaitingBowl    = false;
      match.bowlerMissCount = (match.bowlerMissCount || 0) + 1;
      match.score          += 6;

      await bot.telegram.sendMessage(
        match.groupId,
        "⏱ Bowler Timed Out\n\n<blockquote>+6 runs to batting team\nBall does not count</blockquote>",
        { parse_mode: "HTML" }
      );

      if (match.bowlerMissCount >= 2) {
        match.bowlerMissCount = 0;
        if (!match.suspendedBowlers) match.suspendedBowlers = {};
        match.suspendedBowlers[match.bowler] = match.currentOver + 1;
        match.phase = "set_bowler";
        await bot.telegram.sendMessage(
          match.groupId,
          "🚫 Bowler Suspended\n\n<blockquote>Consecutive delays\nCannot bowl this over or next</blockquote>\n\n👉 /bowler [number] new bowler",
          { parse_mode: "HTML" }
        );
        return;
      }

      if (await checkOverEnd(match)) return;
      await advanceGame(match);
      return;
    }

    /* ── BATTER MISSED ── */
    if (match.awaitingBat) {
      match.awaitingBat = false;

      // FIX: batterMissCount is now per-batter (keyed by striker id)
      // Previously it was a single match-level counter, so it carried over
      // to the next batter after a wicket or over change — unfairly penalising them.
      if (!match.batterMissCounts) match.batterMissCounts = {};
      match.batterMissCounts[match.striker] =
        (match.batterMissCounts[match.striker] || 0) + 1;
      const thisBatterMissCount = match.batterMissCounts[match.striker];

      match.currentBall++;
      match.score -= 6;

      if (!match.batterStats[match.striker])
        match.batterStats[match.striker] = { runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0 };

      match.batterStats[match.striker].runs  -= 6;
      match.batterStats[match.striker].balls++;
      match.currentPartnershipRuns  -= 6;
      match.currentPartnershipBalls++;

      await bot.telegram.sendMessage(
        match.groupId,
        "⏱ Batter Timed Out\n\n<blockquote>-6 run penalty\nBall counted</blockquote>",
        { parse_mode: "HTML" }
      );

      if (thisBatterMissCount >= 2) {
        // Reset this batter's count on dismissal
        match.batterMissCounts[match.striker] = 0;
        match.wickets++;

        if (!match.timedOutBatters) match.timedOutBatters = [];
        match.timedOutBatters.push(match.striker);

        await bot.telegram.sendMessage(
          match.groupId,
          "💥 Batter Dismissed\n\n<blockquote>Consecutive delays</blockquote>\n\n👉 /batter [number] new batter",
          { parse_mode: "HTML" }
        );

        if (match.wickets >= match.maxWickets) {
          match.awaitingBowl = false;
          match.awaitingBat  = false;
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

  const bowlingCall = getBowlingCall();
  const bowlingGif  = bowlingCall.gif;
  const bowlingOpts = bowlDMButton();
  const bowlerName  = getName(match, match.bowler);
  const bowlerPing  = `<a href="tg://user?id=${match.bowler}">${bowlerName}</a>`;
  const bowlCaption = `${bowlerPing} 🏐\n${bowlingCall.text}`;

  if (bowlingGif) {
    try {
      await bot.telegram.sendVideo(match.groupId, bowlingGif, {
        caption: bowlCaption, parse_mode: "HTML", supports_streaming: true, ...bowlingOpts
      });
    } catch (e) {
      console.error("Bowling gif failed:", e.message);
      await bot.telegram.sendMessage(match.groupId, bowlCaption, { parse_mode: "HTML", ...bowlingOpts });
    }
  } else {
    await bot.telegram.sendMessage(match.groupId, bowlCaption, { parse_mode: "HTML", ...bowlingOpts });
  }

  try {
    const strikerName = getName(match, match.striker);
    const ballNumber  = `${match.currentOver}.${match.currentBall + 1}`;
    const dmGif       = "BAACAgUAAyEFAATBJHMxAAJUqGnHyeiWWHjTCJfClpJ5zl9DmUdXAAJxHAACcyxAVtgKSBJYA3gqOgQ";
    const dmCaption   = `🎯 Ball: ${ballNumber}\n🏏 Facing: ${strikerName}\nSend your number 1 – 6`;
    try {
      await bot.telegram.sendVideo(match.bowler, dmGif, { caption: dmCaption, supports_streaming: true });
    } catch (e) {
      await bot.telegram.sendMessage(
        match.bowler,
        `🎯 Your Turn — Bowl\n\n<blockquote>🏏 Facing: ${strikerName}\n🎱 Ball: ${ballNumber}\nSend your number 1 – 6</blockquote>`,
        { parse_mode: "HTML" }
      );
    }
  } catch (e) {
    console.log("Bowler DM failed:", e.message);
  }
}


/* ================= START BALL ================= */

async function startBall(match) {
  if (!match) return;
  if (match.phase === "switch")     return;
  if (match.phase === "set_bowler") return;
  if (match.phase === "new_batter") return;
  if (match.currentOver >= match.totalOvers) return;
  if (match.wickets >= match.maxWickets) {
    match.awaitingBowl = false;
    match.awaitingBat  = false;
    await endInnings(match);
    return;
  }

  if (!match.overHistory) match.overHistory = [];
  if (match.bowler) {
    const lastEntry = match.overHistory[match.overHistory.length - 1];
    if (!lastEntry || lastEntry.over !== match.currentOver + 1) {
      match.overHistory.push({ over: match.currentOver + 1, bowler: match.bowler, balls: [] });
    }
  }

  clearTimers(match);
  match.phase        = "play";
  match.awaitingBowl = true;
  match.awaitingBat  = false;

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
        "⚠️ Hattrick Ball!\n\n<blockquote>Cannot play 0 — two wickets in a row!</blockquote>",
        { parse_mode: "HTML" }
      );
      match.batNumber   = null;
      match.awaitingBat = true;
      match.ballLocked  = false;
      hattrickRetry     = true;
      startTurnTimer(match, "bat");
      return;
    }

    match.bowlerMissCount = 0;
    // FIX: Reset only this batter's miss count on a valid ball, not a shared counter
    if (match.batterMissCounts) match.batterMissCounts[match.striker] = 0;

    if (!match.batterStats[match.striker])
      match.batterStats[match.striker] = { runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0 };
    match.batterStats[match.striker].balls++;

    if (!match.bowlerStats[match.bowler])
      match.bowlerStats[match.bowler] = { balls: 0, runs: 0, wickets: 0, history: [] };
    match.bowlerStats[match.bowler].balls++;
    match.bowlerStats[match.bowler].history.push(bat);

    /* ══════════════ WICKET ══════════════ */
    if (bat === bowl) {
      match.wickets++;
      match.currentBall++;
      match.currentPartnershipBalls++;
      match.bowlerStats[match.bowler].wickets++;

      // FIX: wicketStreak is now per-bowler, not per-team.
      // Each bowler has their own streak counter. When bowler changes the new
      // bowler starts from 0, so hattricks and streaks are correctly bowler-specific.
      if (!match.bowlerWicketStreak) match.bowlerWicketStreak = {};
      match.bowlerWicketStreak[match.bowler] =
        (match.bowlerWicketStreak[match.bowler] || 0) + 1;
      const bowlerStreak = match.bowlerWicketStreak[match.bowler];

      // Also keep match.wicketStreak for the hattrick-block (bat===0 guard)
      // but only for the CURRENT bowler's streak, not global
      match.wicketStreak = bowlerStreak;

      if (match.batterStats[match.striker])
        match.batterStats[match.striker].dismissedBy = match.bowler;

      const lastOver = match.overHistory[match.overHistory.length - 1];
      if (lastOver) lastOver.balls.push("W");

      match.currentPartnershipRuns  = 0;
      match.currentPartnershipBalls = 0;

      const batterRunsAtDismissal = match.batterStats[match.striker]?.runs ?? 0;
      const isDuck     = batterRunsAtDismissal === 0;
      const isHattrick = bowlerStreak === 3;
      const isLastBall = match.currentBall >= 6;

      // Send emoji, then delete batter message AFTER emoji is confirmed sent
      const emojiMsgId = await sendDisappearingEmoji(match.groupId, match.strikerMessageId, "skull");
      scheduleCleanup(match.groupId, emojiMsgId, match.strikerMessageId);

      if (!isDuck && !isHattrick) {
        await sendWithGif(match.groupId, "wicket", randomLine("wicket"));
      }

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

      // Bowling fer milestones
      const bowlerWkts = match.bowlerStats[match.bowler]?.wickets ?? 0;
      if      (bowlerWkts === 3) await bot.telegram.sendMessage(match.groupId, randomMilestoneLine('threeFer'));
      else if (bowlerWkts === 4) await bot.telegram.sendMessage(match.groupId, randomMilestoneLine('fourFer'));
      else if (bowlerWkts === 5) await bot.telegram.sendMessage(match.groupId, randomMilestoneLine('fiveFer'));
      else if (bowlerWkts >= 6)  await bot.telegram.sendMessage(match.groupId, randomMilestoneLine('sixFer'));

      // Hattrick
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
        // FIX: Reset only THIS bowler's streak after hattrick, not global wicketStreak
        match.bowlerWicketStreak[match.bowler] = 0;
        match.wicketStreak = 0;
      }

      if (match.wickets >= match.maxWickets) {
        match.awaitingBowl = false;
        match.awaitingBat  = false;
        await endInnings(match);
        return;
      }

      if (isLastBall) {
        const overEnded = await checkOverEnd(match, true);
        if (overEnded) return;
      }

      match.phase        = "new_batter";
      match.awaitingBowl = false;
      match.awaitingBat  = false;

      await bot.telegram.sendMessage(
        match.groupId,
        "💥 Wicket!\n\n👉 /batter [number] new batter",
        { parse_mode: "HTML" }
      );
      return;
    }

    /* ══════════════ RUNS ══════════════ */
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

    // FIX: Reset only THIS bowler's wicket streak on a run (not scored off them)
    if (!match.bowlerWicketStreak) match.bowlerWicketStreak = {};
    match.bowlerWicketStreak[match.bowler] = 0;
    match.wicketStreak = 0;

    // FIX: Send emoji first, THEN schedule cleanup of both emoji + batter message
    const emojiMsgId = await sendDisappearingEmoji(
      match.groupId, match.strikerMessageId, getResultEmoji(bat, false)
    );
    scheduleCleanup(match.groupId, emojiMsgId, match.strikerMessageId);

    // Partnership milestones
    if (match.currentPartnershipRuns === 50)
      await sendWithGif(match.groupId, 'partnership', randomMilestoneLine('partnership50'));
    else if (match.currentPartnershipRuns === 100)
      await sendWithGif(match.groupId, 'partnership', randomMilestoneLine('partnership100'));

    await sendWithGif(match.groupId, bat, randomLine(bat));

    // Batter milestones
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


/* ================= BOWLER CHANGE — RESET STREAK ================= */
// Call this from batterBowlerCommands when a new bowler is set,
// so the new bowler starts with a fresh streak.
function resetBowlerStreak(match, bowlerId) {
  if (!match.bowlerWicketStreak) match.bowlerWicketStreak = {};
  // Do NOT reset previous bowler's streak (history is preserved)
  // Just ensure new bowler starts at 0 if they haven't bowled yet
  if (match.bowlerWicketStreak[bowlerId] === undefined) {
    match.bowlerWicketStreak[bowlerId] = 0;
  }
  // Reset the global wicketStreak to the new bowler's current streak
  match.wicketStreak = match.bowlerWicketStreak[bowlerId];
}


/* ================= EXPORTS ================= */

module.exports = { init, startBall, processBall, startTurnTimer, resetBowlerStreak };