function isGroup(ctx) {
  return ctx.chat.type.includes("group");

 const isHost = (match, id) => match && id === match.host;

function getPlayerTeam(match, userId) {
  if (!match) return null;
  if (match.teamA.some(p => p.id === userId)) return "A";
  if (match.teamB.some(p => p.id === userId)) return "B";
  return null;
}
}

module.exports = { isGroup };