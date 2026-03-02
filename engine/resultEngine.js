// engine/resultEngine.js

const bot = require("../bot");
const { resetMatch, clearTimers } = require("../utils/match");

/* ================= END INNINGS ================= */

async function endInnings(match) {

  if (!match || match.resultDeclared) return;

  clearTimers(match);

  match.awaitingBat = false;
  match.awaitingBowl = false;
  match.ballLocked = false;

  /* ===== FIRST INNINGS ===== */

  if (match.innings === 1) {

    match.firstInningsScore = match.score;
    match.target = match.firstInningsScore + 1;
    match.phase = "switch";

    return bot.telegram.sendMessage(
      match.groupId,
`🏁 First Innings Completed

Score: ${match.score}/${match.wickets}

🎯 Target: ${match.target}

Host type:
/inningsswitch`
    );
  }

  /* ===== SECOND INNINGS ===== */

  return decideMatchResult(match);
}


/* ================= DECIDE RESULT ================= */

async function decideMatchResult(match) {

  if (!match || match.resultDeclared) return;

  match.resultDeclared = true;

  /* ===== CHASING TEAM WON ===== */

  if (match.score >= match.target) {

    const wicketsLeft =
      match.maxWickets - match.wickets;

    return endMatchWithWinner(
      match,
      match.battingTeam,
      `won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? "s" : ""}`
    );
  }

  /* ===== DEFENDING TEAM WON ===== */

  const runsShort =
    match.target - match.score - 1;

  return endMatchWithWinner(
    match,
    match.bowlingTeam,
    `won by ${runsShort} run${runsShort !== 1 ? "s" : ""}`
  );
}


/* ================= CHECK CHASE MID OVER ================= */

async function checkChaseEnd(match) {

  if (!match ||
      match.resultDeclared ||
      match.innings !== 2)
    return false;

  if (match.score >= match.target) {
    await decideMatchResult(match);
    return true;
  }

  return false;
}


/* ================= INNINGS SWITCH ================= */

async function switchInnings(match) {

  if (!match) return;

  if (match.phase !== "switch") {
    return {
      error: `⚠️ Cannot switch innings now.\nCurrent phase: ${match.phase}`
    };
  }

  match.resultDeclared = false;

  /* 🔄 MOVE TO 2ND INNINGS */
  match.innings = 2;

  /* 🔁 SWAP TEAMS */
  [match.battingTeam, match.bowlingTeam] =
    [match.bowlingTeam, match.battingTeam];

  /* 🔁 RESET MATCH STATS */
  match.score = 0;
  match.wickets = 0;
  match.currentOver = 0;
  match.currentBall = 0;
  match.currentOverRuns = 0;
  match.currentPartnershipRuns = 0;
  match.currentPartnershipBalls = 0;
  match.wicketStreak = 0;

  match.usedBatters = [];
  match.striker = null;
  match.nonStriker = null;
  match.bowler = null;
  match.lastOverBowler = null;
  match.suspendedBowlers = {};
  match.overHistory = [];

  match.awaitingBat = false;
  match.awaitingBowl = false;
  match.ballLocked = false;

  match.phase = "set_striker";

  return {
    success: true,
    message:
`🔁 Innings Switched Successfully!

🏏 Now Batting: ${match.battingTeam}
🎯 Target: ${match.target}

Set STRIKER:
/batter number`
  };
}


/* ================= DECLARE WINNER ================= */

async function endMatchWithWinner(match, winningTeam, resultText) {

  if (!match || match.finalMessageSent) return;

  match.finalMessageSent = true;

  const winnerName =
    winningTeam === "A"
      ? match.teamAName
      : match.teamBName;

  await bot.telegram.sendMessage(
    match.groupId,
`🏆 ${winnerName} ${resultText}!

📊 Final Score:
Innings 1: ${match.firstInningsScore}
Innings 2: ${match.score}`
  );

  return resetMatch(match.groupId);
}


module.exports = {
  endInnings,
  switchInnings,
  endMatchWithWinner,
  checkChaseEnd
};