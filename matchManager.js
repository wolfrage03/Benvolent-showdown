// ================= MATCH STORAGE =================

const matches = new Map();           // groupId → match
const playerActiveMatch = new Map(); // userId → groupId


function getMatch(ctx) {

  // Private chat (DM)
  if (ctx.chat.type === "private") {

    const groupId = playerActiveMatch.get(ctx.from.id);
    if (!groupId) return null;

    return matches.get(groupId) || null;
  }

  // Group chat
  return matches.get(ctx.chat.id) || null;
}



function deleteMatch(groupId) {
  matches.delete(groupId);
}

function resetMatch(groupId) {

  const oldMatch = matches.get(groupId);

  // 🔥 Clear timers if exist
  if (oldMatch) {
    if (oldMatch.ballTimer)           clearTimeout(oldMatch.ballTimer);
    if (oldMatch.warning30)           clearTimeout(oldMatch.warning30);
    if (oldMatch.warning10)           clearTimeout(oldMatch.warning10);
    if (oldMatch.eventTimer)          clearTimeout(oldMatch.eventTimer);
    if (oldMatch.poolTimer)           clearTimeout(oldMatch.poolTimer);
    if (oldMatch.extraTimer)          clearTimeout(oldMatch.extraTimer);

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
    dotBalls: 0,

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

    // ── Delay timer system ──
    eventTimer:       null,          // per-event 5 min setTimeout ref
    poolTimer:        null,          // pool countdown setTimeout ref
    extraTimer:       null,          // extra 5 min setTimeout ref
    poolRemaining:    5 * 60 * 1000, // ms left in innings pool (5 min)
    poolTimerStart:   null,          // timestamp when pool last resumed
    poolTimerActive:  false,
    extraUsed:        { A: false, B: false }, // per team, per match

    batterStats: {},
    bowlerStats: {},
    target: null,
    bowlerOvers: {},

    lastCommandTime: 0,
    phaseBeforeSwitch: null,
    lastOverBowler: null,

    suspendedBowlers: {},
    currentOverNumber: 0,

    wicketStreak: 0,
    currentOverRuns: 0,

    firstInningsScorecard: null,
    secondInningsScorecard: null,
   
    currentPartnershipRuns: 0,
    currentPartnershipBalls: 0,
    scorecardMessageId: null,
    overHistory: [],
    currentOverBalls: [],
    battingOrder: [],
    fallOfWickets: [],
    matchEnded: false

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