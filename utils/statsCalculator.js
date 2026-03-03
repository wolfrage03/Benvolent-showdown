function calculateBatting(stats) {
  const average = stats.inningsBatting
    ? (stats.runs / stats.inningsBatting).toFixed(2)
    : 0;

  const strikeRate = stats.balls
    ? ((stats.runs / stats.balls) * 100).toFixed(2)
    : 0;

  return { average, strikeRate };
}

function calculateBowling(stats) {
  const economy = stats.ballsBowled
    ? ((stats.runsConceded / stats.ballsBowled) * 6).toFixed(2)
    : 0;

  const average = stats.wickets
    ? (stats.runsConceded / stats.wickets).toFixed(2)
    : 0;

  const strikeRate = stats.wickets
    ? (stats.ballsBowled / stats.wickets).toFixed(2)
    : 0;

  return { economy, average, strikeRate };
}

module.exports = { calculateBatting, calculateBowling };