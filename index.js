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

// ================= CORE =================
const engine = require("./core/engine");                     // core game logic
const matchManager = require("./core/matchManager");         // optional
const timerManager = require("./core/timerManager");         // optional

// ================= FEATURES =================
// Game
const announcer = require("./features/game/announcer");     // announcer functions
const gameService = require("./features/game/gameService"); // game services / logic

// Team & Match
const teamCommands = require("./features/team/teamCommands");
const matchCommands = require("./features/match/matchCommands");
const gameCommands = require("./features/game/gameCommands");

// Stats
const statsCommands = require("./features/stats/stats");    // stats commands if any

// ================= MODELS =================
const PlayerStats = require("./models/PlayerStats");
const User = require("./models/User");

// ================= UTILS =================
const helpers = require("./utils/formatters");               // formatters / helper functions
const validators = require("./utils/validators");           // validators if needed
const commentary = require("./utils/commentary");           // commentary lines
const statsCalculator = require("./utils/statsCalculator"); // batting/bowling calculations

// ================= STATE =================
const matches = require("./state/inMemoryStore");           // in-memory matches store

// ================= REGISTER COMMANDS =================
teamCommands(bot, matches, announcer, helpers);
matchCommands(bot, matches, announcer, helpers, engine);
gameCommands(bot, matches, announcer, helpers, engine);

// ================= BALL PROCESSING / ANNOUNCEMENTS =================
async function handleBall(matchId, batNumber, bowlNumber) {
  const match = matches[matchId];
  if (!match) return;

  // Process the ball
  const result = engine.processBall(match, batNumber, bowlNumber);

  // Announce current score
  await announcer.announceScore(bot, match, helpers);

  // Announce innings switch
  if (match.phase === "switch") {
    await announcer.announceInningsSwitch(bot, match);
  }

  // Announce winner
  if (match.phase === "end") {
    await announcer.announceWinner(bot, match);
  }

  return result;
}

// Expose handleBall for commands
module.exports.handleBall = handleBall;

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