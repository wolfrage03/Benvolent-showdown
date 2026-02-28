const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  username: String,
  firstName: String,
  lastName: String,
  matchesPlayed: { type: Number, default: 0 },
  matchesWon: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// ✅ Prevent OverwriteModelError
module.exports =
  mongoose.models.User || mongoose.model("User", userSchema);