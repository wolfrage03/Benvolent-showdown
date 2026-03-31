// ================= SOLO MATCH STORAGE =================
// Completely isolated from team match storage.
// soloMatches:      groupId → soloMatch
// soloPlayerActive: userId  → groupId

const soloMatches      = new Map();
const soloPlayerActive = new Map();


function getSoloMatch(ctx) {
  if (ctx.chat?.type === "private") {
    const groupId = soloPlayerActive.get(ctx.from.id);
    if (!groupId) return null;
    return soloMatches.get(groupId) || null;
  }
  return soloMatches.get(ctx.chat.id) || null;
}


function deleteSoloMatch(groupId) {
  soloMatches.delete(groupId);
}


function resetSoloMatch(groupId) {
  const old = soloMatches.get(groupId);

  // Clear any lingering timers from previous match
  if (old) {
    if (old.ballTimer) clearTimeout(old.ballTimer);
    if (old.warning30) clearTimeout(old.warning30);
    if (old.warning10) clearTimeout(old.warning10);
    if (old.joinTimer) clearTimeout(old.joinTimer);

    for (const [uid, gid] of soloPlayerActive.entries()) {
      if (gid === groupId) soloPlayerActive.delete(uid);
    }
  }

  const match = {
    type:    "solo",   // safety marker — never confused with team match
    phase:   "idle",
    groupId,

    // Players in join order: [{ id, name }]
    players: [],

    // Rotation indices (into players[])
    batterIndex:  0,
    bowlerIndex:  1,
    ballsThisSet: 0,   // balls bowled in the current 3-ball set (resets per bowler)
    setCount:     0,   // total sets bowled so far

    // Active participants
    batter:  null,     // userId currently batting
    bowler:  null,     // userId currently bowling
    striker: null,     // alias kept so DM handler can look up match via soloPlayerActive

    // Ball state
    batNumber:    null,
    bowlNumber:   null,
    awaitingBat:  false,
    awaitingBowl: false,
    ballLocked:   false,

    // Per-player stats keyed by userId string
    // { runs, balls, wickets, out, ballsBowled }
    stats: {},

    // Timers
    warning30: null,
    warning10: null,
    ballTimer: null,
    joinTimer: null,

    // Misc
    matchEnded:       false,
    strikerMessageId: null,
  };

  soloMatches.set(groupId, match);
  return match;
}


module.exports = {
  soloMatches,
  soloPlayerActive,
  getSoloMatch,
  resetSoloMatch,
  deleteSoloMatch,
};