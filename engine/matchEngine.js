// ================= MATCH ENGINE =================

const {
  matches,
  getMatch: getMatchFromStorage,
  resetMatch: resetMatchInStorage,
  clearTimers
} = require("../storage/matchStorage");

/* ================= GET MATCH ================= */

function getMatch(chatOrCtx) {
  return getMatchFromStorage(chatOrCtx);
}

/* ================= RESET MATCH ================= */

function resetMatch(chatId) {
  return resetMatchInStorage(chatId);
}

/* ================= DELETE MATCH ================= */

function deleteMatch(chatId) {
  const match = matches.get(chatId);
  if (match) clearTimers(match);
  matches.delete(chatId);
}

/* ================= HOST CHECK ================= */

function isHost(match, userId) {
  return String(match?.host) === String(userId);
}

module.exports = {
  getMatch,
  resetMatch,
  deleteMatch,
  clearTimers,
  isHost
};