const mongoose = require("mongoose");

const playerStatsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  matches: { type: Number, default: 0 },
  inningsBatting: { type: Number, default: 0 },
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  fives: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  ducks: { type: Number, default: 0 },
  fifties: { type: Number, default: 0 },
  hundreds: { type: Number, default: 0 },
  bestScore: { type: Number, default: 0 },

  inningsBowling: { type: Number, default: 0 },
  ballsBowled: { type: Number, default: 0 },
  runsConceded: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  maidens: { type: Number, default: 0 },
  threeW: { type: Number, default: 0 },
  fiveW: { type: Number, default: 0 },
  bestBowlingWickets: { type: Number, default: 0 },
  bestBowlingRuns: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PlayerStats", playerStatsSchema);