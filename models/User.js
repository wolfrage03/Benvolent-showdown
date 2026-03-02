const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true, index: true },
  username: String,
  firstName: String,
  lastName: String,

  matchesPlayed: { type: Number, default: 0 },
  matchesWon: { type: Number, default: 0 },
  timesHost: { type: Number, default: 0 }

}, { timestamps: true });

module.exports =
  mongoose.models.User || mongoose.model("User", userSchema);