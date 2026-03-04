// ================= MATCH STORAGE =================

const matches = new Map();           // groupId → match
const playerActiveMatch = new Map(); // userId → groupId

function getMatch(ctx) {
  if (!ctx || !ctx.chat) return null;
  return matches.get(ctx.chat.id) || null;

}

function deleteMatch(groupId) {
  matches.delete(groupId);
}

function resetMatch(groupId) {

  const oldMatch = matches.get(groupId);

  // 🔥 Clear timers if exist
  if (oldMatch) {
    if (oldMatch.ballTimer) clearTimeout(oldMatch.ballTimer);
    if (oldMatch.warning30) clearTimeout(oldMatch.warning30);
    if (oldMatch.warning10) clearTimeout(oldMatch.warning10);

    for (const [userId, gid] of playerActiveMatch.entries()) {
      if (gid === groupId) {
        playerActiveMatch.delete(userId);
      }
    }
  }

  const match = {

   phase: "idle",
    host: null,
    groupId: groupId,

    teamA: [],
    teamB: [],
    captains: { A: null, B: null },
    teamAName: null,
    teamBName: null,
    tossWinner: null,
    battingTeam: null,
    bowlingTeam: null,

    hostChange: null,
    pendingTeamChange: null,
    pendingCaptainChange: null,

    totalOvers: 0,
    currentOver: 0,
    currentBall: 0,

    striker: null,
    nonStriker: null,
    bowler: null,
    lastBowler: null,

    usedBatters: [],

    score: 0,
    wickets: 0,
    maxWickets: 0,

    innings: 1,
    firstInningsScore: 0,

    awaitingBat: false,
    awaitingBowl: false,
    batNumber: null,
    bowlNumber: null,

    bowlerMissCount: 0,
    batterMissCount: 0,

    warning30: null,
    warning10: null,
    ballTimer: null,
    ballLocked: false,

    batterStats: {},
    bowlerStats: {},

    lastCommandTime: 0,
    phaseBeforeSwitch: null,
    lastOverBowler: null,

    suspendedBowlers: {},
    currentOverNumber: 0,

    wicketStreak: 0,
    currentOverRuns: 0,

    currentPartnershipRuns: 0,
    currentPartnershipBalls: 0,

    overHistory: [],
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
  deleteMatch
};