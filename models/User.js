const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, unique: true },
  username: String,
  firstName: String,
  lastName: String,
  matchesPlayed: { type: Number, default: 0 },
  matchesWon: { type: Number, default: 0 }
});

module.exports = mongoose.model("User", userSchema);