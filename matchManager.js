// ================= MATCH STORAGE =================

const matches          = new Map(); // groupId → match
const playerActiveMatch = new Map(); // userId  → groupId


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

  // Clear all timers from old match before replacing
  if (oldMatch) {
    if (oldMatch.ballTimer)           clearTimeout(oldMatch.ballTimer);
    if (oldMatch.warning30)           clearTimeout(oldMatch.warning30);
    if (oldMatch.warning10)           clearTimeout(oldMatch.warning10);
    if (oldMatch.joinTimer)           clearTimeout(oldMatch.joinTimer);
    if (oldMatch.hostChange?.timeout) clearTimeout(oldMatch.hostChange.timeout);

    for (const [userId, gid] of playerActiveMatch.entries()) {
      if (gid === groupId) playerActiveMatch.delete(userId);
    }
  }

  const match = {

    // ── Core ──
    phase:                  "idle",
    host:                   null,
    groupId:                groupId,

    // ── Teams ──
    teamA:                  [],
    teamB:                  [],
    captains:               { A: null, B: null },
    teamAName:              null,
    teamBName:              null,
    pendingTeamChange:      null,
    pendingCaptainChange:   null,
    hostChange:             null,

    // ── Toss ──
    tossWinner:             null,
    battingTeam:            null,
    bowlingTeam:            null,

    // ── Overs ──
    totalOvers:             0,
    currentOver:            0,
    currentBall:            0,
    currentOverNumber:      0,
    currentOverRuns:        0,
    currentOverBalls:       [],
    overHistory:            [],

    // ── Players ──
    striker:                null,
    nonStriker:             null,
    bowler:                 null,
    lastOverBowler:         null,
    suspendedBowlers:       {},
    bowlerOvers:            {},
    usedBatters:            [],
    battingOrder:           [],
    fallOfWickets:          [],

    // ── Score ──
    score:                  0,
    wickets:                0,
    maxWickets:             0,
    dotBalls:               0,
    wicketStreak:           0,
    target:                 null,

    // ── Innings ──
    innings:                1,
    inningsEnded:           false,
    firstInningsScore:      0,
    firstInningsData:       null,
    firstInningsScorecard:  null,
    secondInningsScorecard: null,

    // ── Partnership ──
    currentPartnershipRuns:  0,
    currentPartnershipBalls: 0,

    // ── Ball state ──
    awaitingBat:            false,
    awaitingBowl:           false,
    batNumber:              null,
    bowlNumber:             null,
    ballLocked:             false,
    bowlerMissCount:        0,
    batterMissCount:        0,

    // ── Stats ──
    batterStats:            {},
    bowlerStats:            {},

    // ── Timers ──
    warning30:              null,
    warning10:              null,
    ballTimer:              null,
    joinTimer:              null,

    // ── UI ──
    playerListMessageId:    null,
    scorecardMessageId:     null,

    // ── Misc ──
    lastCommandTime:        0,
    phaseBeforeSwitch:      null,
    matchEnded:             false,
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