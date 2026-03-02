function isHost(match, id) {
  return match && id === match.host;
}

function getDisplayName(user) {
  if (!user) return "Player";

  if (user.username) return `@${user.username}`;
  if (user.first_name && user.last_name)
    return `${user.first_name} ${user.last_name}`;
  if (user.first_name) return user.first_name;

  return "Player";
}

// ✅ Return consistent team keys (A / B)
function getPlayerTeam(match, userId) {
  if (!match) return null;
  if (match.teamA.some(p => p.id === userId)) return "A";
  if (match.teamB.some(p => p.id === userId)) return "B";
  return null;
}

/* ================= HELPERS ================= */

const battingPlayers = (match) =>
  match.battingTeam === "A" ? match.teamA : match.teamB;

const bowlingPlayers = (match) =>
  match.bowlingTeam === "A" ? match.teamA : match.teamB;

/* ================= ORDERED BATTING ================= */

function orderedBattingPlayers(match) {
  if (!match) return [];

  const players = battingPlayers(match);
  const captainId =
    match.battingTeam === "A" ? match.captains.A : match.captains.B;

  return [
    ...players.filter(p => p.id === captainId),
    ...players.filter(p => p.id !== captainId)
  ];
}

/* ================= STRIKE ================= */

function swapStrike(match) {
  if (!match) return;

  const temp = match.striker;
  match.striker = match.nonStriker;
  match.nonStriker = temp;
}

/* ================= NAME ================= */

function getName(match, id) {
  if (!match) return "Player";

  const all = [...match.teamA, ...match.teamB];
  const player = all.find(p => p.id === id);

  return player ? player.name : "Player";
}

/* ================= OVER HISTORY ================= */

function getOverHistory(match) {
  if (!match || !match.overHistory?.length)
    return "No overs completed yet.";

  return match.overHistory
    .map(o => {
      const balls = o.balls.join(",");
      return `Over ${o.over} - ${getName(match, o.bowler)} = (${balls})`;
    })
    .join("\n");
}

module.exports = {
  battingPlayers,
  bowlingPlayers,
  orderedBattingPlayers,
  swapStrike,
  getName,
  getOverHistory,
  isHost,
  getDisplayName,
  getPlayerTeam
};