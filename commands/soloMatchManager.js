// ===============================================================
// SOLO MATCH STORAGE — soloMatchManager.js
// ===============================================================
//
// module.exports is assigned FIRST so that any file requiring this
// mid-cycle (circular dependency) gets the same object reference,
// which is fully populated by the time execution finishes.
// ===============================================================

/* ── Pre-assign exports object so circular requirers get a live ref ── */
module.exports = {};

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
    ["ballTimer", "warning30", "warning10", "joinTimer", "alert60", "alert30"].forEach(k => {
      if (old[k]) { clearTimeout(old[k]); }
    });
    for (const [uid, gid] of soloPlayerActive.entries()) {
      if (gid === groupId) soloPlayerActive.delete(uid);
    }
  }

  const match = {
    type:    "solo",
    phase:   "idle",
    groupId,

    players:    [],
    allPlayers: [],

    batterIndex:  0,
    bowlerIndex:  1,
    ballsThisSet: 0,
    setCount:     0,

    batter:  null,
    bowler:  null,

    batNumber:       null,
    bowlNumber:      null,
    awaitingBat:     false,
    awaitingBowl:    false,
    ballLocked:      false,
    batterMessageId: null,

    stats: {},

    playerListMessageId: null,

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

/* ── Populate the pre-assigned exports object ── */
module.exports.soloMatches      = soloMatches;
module.exports.soloPlayerActive = soloPlayerActive;
module.exports.getSoloMatch     = getSoloMatch;
module.exports.resetSoloMatch   = resetSoloMatch;
module.exports.deleteSoloMatch  = deleteSoloMatch;