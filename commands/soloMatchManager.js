// ===============================================================
// SOLO MATCH STORAGE — soloMatchManager.js
// ===============================================================
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
    ["ballTimer", "warning30", "warning10",
     "joinTimer", "alert60", "alert30"].forEach(k => {
      if (old[k]) { clearTimeout(old[k]); }
    });
    for (const [uid, gid] of soloPlayerActive.entries()) {
      if (gid === groupId) soloPlayerActive.delete(uid);
    }
  }

  const match = {
    type:    "solo",
    phase:   "idle",   // "idle" | "join" | "play"
    groupId,

    // Ordered player list [{ id, name }] — join order preserved forever
    // players is the live list (removed when kicked mid-game)
    players:    [],
    allPlayers: [],   // full roster including removed, for scorecard name lookup

    // Rotation state
    batterIndex:  0,
    bowlerIndex:  1,
    ballsThisSet: 0,   // balls bowled in current 3-ball set
    setCount:     0,   // total sets completed

    // Active role IDs
    batter:  null,
    bowler:  null,

    // Ball state
    batNumber:    null,
    bowlNumber:   null,
    awaitingBat:  false,
    awaitingBowl: false,
    ballLocked:   false,

    // Per-player stats keyed by userId
    // {
    //   runs, balls, fours, fives, sixes,
    //   wickets, out,
    //   ballsBowled, runsConceded,
    //   ballHistory: [],
    //   timedOut: false,
    //   consecutiveTimeouts: 0,
    // }
    stats: {},

    // Pinned player list message
    playerListMessageId: null,

    // Timers
    warning30: null,
    warning10: null,
    ballTimer: null,
    joinTimer: null,
    alert60:   null,
    alert30:   null,

    matchEnded: false,
    motm:       null,
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