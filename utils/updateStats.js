const PlayerStats = require("../models/PlayerStats");

async function updatePlayerStats(playerId, data) {

  // Separate fields that need $max (best score, best bowling)
  // from fields that need $inc (cumulative counters)
  const incData  = {};
  const maxData  = {};
  const setData  = {};

  for (const [key, val] of Object.entries(data)) {
    if (key === "bestScore") {
      maxData.bestScore = val;
    } else if (key === "bestBowlingWickets") {
      maxData.bestBowlingWickets = val;
    } else if (key === "bestBowlingRuns") {
      // bestBowlingRuns: lower is better — handle separately
      setData._bestBowlingRunsRaw = val;
    } else {
      incData[key] = val;
    }
  }

  const updateOps = {};
  if (Object.keys(incData).length)  updateOps.$inc = incData;
  if (Object.keys(maxData).length)  updateOps.$max = maxData;

  const stats = await PlayerStats.findOneAndUpdate(
    { userId: String(playerId) },
    updateOps,
    { new: true, upsert: true }
  );

  // Handle bestBowlingRuns separately (lower is better, only update if new wickets >= best)
  if (setData._bestBowlingRunsRaw !== undefined && stats) {
    const newRuns    = setData._bestBowlingRunsRaw;
    const newWickets = data.bestBowlingWickets ?? stats.bestBowlingWickets ?? 0;
    const isBetter =
      newWickets > (stats.bestBowlingWickets || 0) ||
      (newWickets === stats.bestBowlingWickets && newRuns < (stats.bestBowlingRuns || 9999));
    if (isBetter) {
      await PlayerStats.updateOne(
        { userId: String(playerId) },
        { $set: { bestBowlingWickets: newWickets, bestBowlingRuns: newRuns } }
      );
    }
  }

  return stats;
}

module.exports = updatePlayerStats;