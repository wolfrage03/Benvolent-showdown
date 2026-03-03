require("dotenv").config();

/* ================= ENV CHECK ================= */

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN missing in .env");
  process.exit(1);
}

/* ================= DB ================= */

const connectDB = require("./database");

connectDB()
  .then(() => console.log("✅ Database connected"))
  .catch(err => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });

/* ================= BOT INIT ================= */

const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);

/* ================= REGISTER BOT COMMANDS ================= */
/* 🔥 THIS MAKES COMMANDS APPEAR IN "/" MENU */

(async () => {
  try {
    await bot.telegram.setMyCommands([
      { command: "createteam", description: "Create teams (Group only)" },
      { command: "joina", description: "Join Team A" },
      { command: "joinb", description: "Join Team B" },
      { command: "changeteam", description: "Change player team" },
      { command: "choosecap", description: "Choose captain" },
      { command: "players", description: "View players list" }
    ]);

    console.log("✅ Bot commands registered");
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
  }
})();

/* ================= GLOBAL STATE ================= */

const match = require("./state/matchState");

/* ================= MODELS ================= */

const User = require("./models/User");

/* ================= BOT USERNAME ================= */

let BOT_USERNAME = null;

(async () => {
  try {
    const me = await bot.telegram.getMe();
    BOT_USERNAME = me.username;
    console.log("🤖 Bot username:", BOT_USERNAME);
  } catch (err) {
    console.error("❌ Failed to fetch bot username:", err);
  }
})();

/* ================= PRIVATE START ================= */

bot.start(async (ctx, next) => {

  if (ctx.chat.type !== "private") return next();

  try {
    const { id, username, first_name, last_name } = ctx.from;

    await User.updateOne(
      { telegramId: String(id) },
      {
        $set: {
          telegramId: String(id),
          username: username?.toLowerCase(),
          firstName: first_name,
          lastName: last_name
        }
      },
      { upsert: true }
    );

    console.log("✅ DM user saved:", username?.toLowerCase());

  } catch (err) {
    console.error("❌ DM user save error:", err);
  }

  await ctx.reply(
    "✅ Bot connected.\n\nUse match commands inside group.\nWhen selected as bowler, send your number (1-6) here."
  );
});

/* ================= GROUP SAFETY MIDDLEWARE ================= */
/* 🔥 Block match commands in private */

bot.use(async (ctx, next) => {

  const groupOnlyCommands = [
    "createteam",
    "joina",
    "joinb",
    "changeteam",
    "choosecap",
    "players"
  ];

  if (ctx.message?.text?.startsWith("/")) {

    const cmd = ctx.message.text.split(" ")[0].replace("/", "").split("@")[0];

    if (groupOnlyCommands.includes(cmd) && ctx.chat.type === "private") {
      return ctx.reply("❌ Use this command inside the match group.");
    }
  }

  return next();
});

/* ================= REGISTER MODULES ================= */

require("./commands/teamManagement")(bot, match);
require("./commands/stats")(bot, match);
require("./commands/lifecycle")(bot, match);
require("./commands/host")(bot, match);
require("./commands/teamSetup")(bot, match);
require("./commands/toss")(bot, match);
require("./commands/captain")(bot, match);

/* ================= CALLBACK SAFETY ================= */

bot.use(async (ctx, next) => {
  if (ctx.callbackQuery) {
    try { await ctx.answerCbQuery(); } catch {}
  }
  return next();
});

/* ================= ERROR HANDLING ================= */

bot.catch((err, ctx) => {
  console.error("🤖 BOT ERROR:");
  console.error("Update Type:", ctx?.updateType);
  console.error("From:", ctx?.from?.id);
  console.error("Error:", err);
});

/* ================= START BOT ================= */

(async () => {
  try {
    await bot.launch();
    console.log("🚀 Bot started successfully");
  } catch (err) {
    console.error("❌ Bot failed to start:", err);
    process.exit(1);
  }
})();

/* ================= PROCESS HANDLERS ================= */

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

process.on("unhandledRejection", err => {
  console.error("❌ UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", err => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
});