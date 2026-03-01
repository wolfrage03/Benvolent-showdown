const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  username: String,
  firstName: String,
  lastName: String,
  matchesPlayed: { type: Number, default: 0 },
  matchesWon: { type: Number, default: 0 },
  timesHost: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports =
  mongoose.models.User || mongoose.model("User", userSchema);