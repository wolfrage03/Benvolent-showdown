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

  if (old) {
    if (old.ballTimer) clearTimeout(old.ballTimer);
    if (old.warning30) clearTimeout(old.warning30);
    if (old.warning10) clearTimeout(old.warning10);
    if (old.joinTimer) clearTimeout(old.joinTimer);
    if (old.alert60)   clearTimeout(old.alert60);
    if (old.alert30)   clearTimeout(old.alert30);

    for (const [uid, gid] of soloPlayerActive.entries()) {
      if (gid === groupId) soloPlayerActive.delete(uid);
    }
  }

  const match = {
    type:    "solo",
    phase:   "idle",
    groupId,

    // Players in join order: [{ id, name }]
    players: [],

    // Rotation indices into players[]
    batterIndex:  0,
    bowlerIndex:  1,
    ballsThisSet: 0,   // balls in current 3-ball set
    setCount:     0,   // total sets completed

    // Active participants (userIds)
    batter:  null,
    bowler:  null,
    striker: null,     // alias for DM lookup

    // Ball state
    batNumber:    null,
    bowlNumber:   null,
    awaitingBat:  false,
    awaitingBowl: false,
    ballLocked:   false,

    // Per-player stats keyed by userId (number)
    // {
    //   runs, balls, fours, fives, sixes,
    //   wickets, out, ballsBowled, runsConceded,
    //   ballHistory: [],   ← bowling history: each entry is run value or "W"
    //   timedOut: false
    // }
    stats: {},

    // Lobby join timers
    warning30: null,
    warning10: null,
    ballTimer: null,
    joinTimer: null,
    alert60:   null,   // 60s lobby alert
    alert30:   null,   // 30s lobby alert

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