// ================= MATCH STORAGE =================

const matches = new Map();              // groupId → match
const playerActiveMatch = new Map();    // userId → groupId

function getMatch(ctx) {
  if (!ctx.chat || !ctx.chat.id) return null;
  return matches.get(ctx.chat.id) || null;
}

function clearTimers(match) {
  if (!match) return;

  if (match.warning30) {
    clearTimeout(match.warning30);
    match.warning30 = null;
  }

  if (match.warning10) {
    clearTimeout(match.warning10);
    match.warning10 = null;
  }

  if (match.ballTimer) {
    clearTimeout(match.ballTimer);
    match.ballTimer = null;
  }
}

function resetMatch(groupId) {

  const oldMatch = matches.get(groupId);

  // 🔥 Clear old timers + active players
  if (oldMatch) {
    clearTimers(oldMatch);

    for (const [userId, gid] of playerActiveMatch.entries()) {
      if (gid === groupId) {
        playerActiveMatch.delete(userId);
      }
    }
  }

  const match = {

    /* ================= BASIC ================= */
    groupId,
    phase: "idle",
    host: null,

    /* ================= TEAMS ================= */
    teamA: [],
    teamB: [],
    teamAName: null,
    teamBName: null,
    captains: { A: null, B: null },

    /* ================= TOSS ================= */
    tossWinner: null,
    battingTeam: null,
    bowlingTeam: null,

    /* ================= INNINGS ================= */
    innings: 1,
    firstInningsScore: 0,
    target: null,
    resultDeclared: false,

    /* ================= SCORE ================= */
    score: 0,
    wickets: 0,
    maxWickets: 0,

    /* ================= OVERS ================= */
    totalOvers: 0,
    currentOver: 0,
    currentBall: 0,
    currentOverRuns: 0,
    lastOverBowler: null,
    overHistory: [],

    /* ================= PLAYERS ================= */
    striker: null,
    nonStriker: null,
    bowler: null,
    usedBatters: [],
    suspendedBowlers: {},

    /* ================= FLOW CONTROL ================= */
    awaitingBat: false,
    awaitingBowl: false,
    ballLocked: false,
    lastCommandTime: 0,
    phaseBeforeSwitch: null,

    /* ================= TIMERS ================= */
    warning30: null,
    warning10: null,
    ballTimer: null,

    /* ================= STATS ================= */
    batterStats: {},
    bowlerStats: {},

    /* ================= EXTRA TRACKING ================= */
    wicketStreak: 0,
    currentPartnershipRuns: 0,
    currentPartnershipBalls: 0,
    currentOverBalls: []
  };

  matches.set(groupId, match);
  return match;
}

module.exports = {
  matches,
  playerActiveMatch,
  getMatch,
  resetMatch,
  clearTimers
};