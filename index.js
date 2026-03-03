require("dotenv").config();

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN missing in .env");
  process.exit(1);
}

// ================= DATABASE =================
const connectDB = require("./database");
connectDB().catch(err => {
  console.error("❌ Database connection failed:", err);
  process.exit(1);
});

// ================= BOT INIT =================
const bot = require("./config/bot");

// ================= HELPERS / FEATURES =================
const engine = require("./features/game/engine");
const announcer = require("./features/game/announcer");
const helpers = require("./utils/helpers");

// Active matches store (can be an in-memory object or loaded from DB)
const matches = require("./features/game/matchData"); 

// ================= REGISTER COMMANDS =================
require("./features/team/teamCommands")(bot, matches, announcer, helpers);
require("./features/match/matchCommands")(bot, matches, announcer, helpers, engine);
require("./features/game/gameCommands")(bot, matches, announcer, helpers, engine);

// ================= BALL PROCESSING / ANNOUNCEMENTS =================
// This should run inside game logic, not on global scope.
// Example: when a player submits a ball
async function handleBall(matchId, batNumber, bowlNumber) {
  const match = matches[matchId];
  if (!match) return;

  // Process ball
  const result = engine.processBall(match, batNumber, bowlNumber);

  // Announce result
  await announcer.announceScore(bot, match, helpers);

  // Check for innings switch
  if (match.phase === "switch") {
    await announcer.announceInningsSwitch(bot, match);
  }

  // Check for game end
  if (match.phase === "end") {
    await announcer.announceWinner(bot, match);
  }

  return result;
}

// ================= LAUNCH BOT =================
bot.launch()
  .then(() => console.log("🚀 Bot started"))
  .catch(err => console.error("❌ Bot failed:", err));

// ================= PROCESS HANDLERS =================
process.once("SIGINT", () => {
  console.log("🛑 SIGINT received");
  bot.stop("SIGINT");
});

process.once("SIGTERM", () => {
  console.log("🛑 SIGTERM received");
  bot.stop("SIGTERM");
});

process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
});