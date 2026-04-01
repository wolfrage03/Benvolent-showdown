const mongoose = require("mongoose");

const soloStatsSchema = new mongoose.Schema({
  userId:            { type: String, required: true, unique: true, index: true },
  soloMatchesPlayed: { type: Number, default: 0 },
  soloTotalRuns:     { type: Number, default: 0 },
  soloTotalBalls:    { type: Number, default: 0 },
  soloFours:         { type: Number, default: 0 },
  soloFives:         { type: Number, default: 0 },
  soloSixes:         { type: Number, default: 0 },
  soloDucks:         { type: Number, default: 0 },
  soloFifties:       { type: Number, default: 0 },
  soloHundreds:      { type: Number, default: 0 },
  soloBestScore:     { type: Number, default: 0 },
  soloTotalWickets:  { type: Number, default: 0 },
  soloBallsBowled:   { type: Number, default: 0 },
  soloRunsConceded:  { type: Number, default: 0 },
  soloMOTM:          { type: Number, default: 0 },
}, { timestamps: true });

// Check mongoose.modelNames() — works before and after connection
const SoloStats = mongoose.modelNames().includes("SoloStats")
  ? mongoose.model("SoloStats")
  : mongoose.model("SoloStats", soloStatsSchema);

module.exports = SoloStats;