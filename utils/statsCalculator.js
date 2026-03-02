// utils/statsCalculator.js

function calculateBattingStats(player) {
  const average =
    player.wicketsLost > 0
      ? (player.runs / player.wicketsLost).toFixed(2)
      : player.runs;

  const strikeRate =
    player.balls > 0
      ? ((player.runs / player.balls) * 100).toFixed(2)
      : 0;

  return { average, strikeRate };
}

function calculateBowlingStats(player) {
  const overs = (player.ballsBowled / 6).toFixed(1);

  const economy =
    player.ballsBowled > 0
      ? ((player.runsConceded / player.ballsBowled) * 6).toFixed(2)
      : 0;

  const bowlingAverage =
    player.wickets > 0
      ? (player.runsConceded / player.wickets).toFixed(2)
      : 0;

  return { overs, economy, bowlingAverage };
}

function updateBestBowling(player, matchWickets, matchRuns) {
  if (
    matchWickets > player.bestBowlingWickets ||
    (matchWickets === player.bestBowlingWickets &&
      matchRuns < player.bestBowlingRuns)
  ) {
    player.bestBowlingWickets = matchWickets;
    player.bestBowlingRuns = matchRuns;
  }
}

module.exports = {
  calculateBattingStats,
  calculateBowlingStats,
  updateBestBowling,
};