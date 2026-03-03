const matches = new Map();

const matches = new Map();
const playerActiveMatch = new Map();

function getMatch(groupId) {
  return matches.get(groupId) || null;
}

function setMatch(groupId, match) {
  matches.set(groupId, match);
}

function deleteMatch(groupId) {
  matches.delete(groupId);
}

module.exports = {
  matches,
  playerActiveMatch,
  getMatch,
  setMatch,
  deleteMatch
};

function createMatch(chatId) {
  const match = {
    teamA: [],
    teamB: [],
    captainA: null,
    captainB: null,
    phase: "setup",
    innings: 1,
    scoreA: 0,
    scoreB: 0,
    wicketsA: 0,
    wicketsB: 0
  };

  matches.set(chatId, match);
  return match;
}

function getMatch(chatId) {
  return matches.get(chatId);
}

function deleteMatch(chatId) {
  matches.delete(chatId);
}

module.exports = {
  createMatch,
  getMatch,
  deleteMatch
};