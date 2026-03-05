const PlayerStats = require("../models/PlayerStats");

async function updatePlayerStats(playerId, data) {

  const stats = await PlayerStats.findOneAndUpdate(
    { userId: String(playerId) },
    { $inc: data },
    { new: true, upsert: true }
  );

  return stats;
}

module.exports = updatePlayerStats;