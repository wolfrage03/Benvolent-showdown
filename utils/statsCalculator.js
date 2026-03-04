// utils/statsCalculator.js

function safeDivide(a, b) {
  if (!b || b === 0) return 0;
  return a / b;
}

function calculateBatting(stats) {

  const dismissals =
    stats.inningsBatting - (stats.notOuts || 0);

  const average = dismissals > 0
    ? (stats.runs / dismissals).toFixed(2)
    : stats.runs > 0
      ? stats.runs.toFixed(2)
      : "0.00";

  const strikeRate = stats.balls > 0
    ? ((stats.runs / stats.balls) * 100).toFixed(2)
    : "0.00";

  return {
    average,
    strikeRate
  };
}

function calculateBowling(stats) {

  const average = stats.wickets > 0
    ? (stats.runsConceded / stats.wickets).toFixed(2)
    : "0.00";

  const strikeRate = stats.wickets > 0
    ? (stats.ballsBowled / stats.wickets).toFixed(2)
    : "0.00";

  const economy = stats.ballsBowled > 0
    ? ((stats.runsConceded / stats.ballsBowled) * 6).toFixed(2)
    : "0.00";

  return {
    average,
    strikeRate,
    economy
  };
}

module.exports = {
  calculateBatting,
  calculateBowling
};