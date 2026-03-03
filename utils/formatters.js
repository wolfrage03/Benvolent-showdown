function formatTeam(team, captainId) {
  return team
    .map((p, index) => {
      const capMark = p.id === captainId ? " (C)" : "";
      return `${index + 1}. ${p.name}${capMark}`;
    })
    .join("\n");

    function getDisplayName(user) {
  if (!user) return "Player";

  if (user.username) return `@${user.username}`;
  if (user.first_name && user.last_name)
    return `${user.first_name} ${user.last_name}`;
  if (user.first_name) return user.first_name;

  return "Player";
}

function getName(match, id) {
  if (!match) return "Player";
  const all = [...match.teamA, ...match.teamB];
  const p = all.find(x => x.id === id);
  return p ? p.name : "Player";
}

function getOverHistory(match) {
  if (!match || !match.overHistory.length)
    return "No overs completed yet.";

  return match.overHistory
    .map(o => {
      const balls = o.balls.join(",");
      return `Over ${o.over} - ${getName(match, o.bowler)} = (${balls})`;
    })
    .join("\n");
}
}

module.exports = { formatTeam };