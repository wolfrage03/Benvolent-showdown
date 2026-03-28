require("dotenv").config();

const User = require("./User"); 
const { Telegraf, Markup } = require("telegraf");
const initializeApp = require("./config/appInit");
const { bot, initializeBot } = require("./config/bot");

const registerStartHandler = require("./handlers/startHandler");
const registerStatsHandler = require("./handlers/statsHandler");
const updatePlayerStats = require("./utils/updateStats");
const PlayerStats = require("./models/PlayerStats");
const generateScorecard = require("./utils/scorecardGenerator");
const matchResult       = require("./utils/matchResult");
const box               = require("./utils/boxMessage");
const ballHandler       = require("./utils/ballHandler");
const { sendAndPinPlayerList } = require("./commands/captainCommands");

const {
  randomLine,
  randomGif,
  getBowlingCall,
  getCountdownCall,
  getRandomTeams,
  randomMilestoneLine
} = require("./commentary");

const {
  matches,
  playerActiveMatch,
  getMatch,
  resetMatch,
  deleteMatch
} = require("./matchManager");


/* ================= GROUP WHITELIST ================= */

const ALLOWED_GROUPS = new Set([
  "-1003631018582",
  "-1003240391473",
  "-1003047955907"
]);

// When bot is added to any group — leave if not whitelisted
bot.on("my_chat_member", async (ctx) => {
  const update = ctx.myChatMember;
  const chat   = update?.chat;
  const newStatus = update?.new_chat_member?.status;

  if (!chat || chat.type === "private") return;
  if (!["member", "administrator"].includes(newStatus)) return;

  if (!ALLOWED_GROUPS.has(String(chat.id))) {
    try {
      await bot.telegram.sendMessage(
        chat.id,
        "🚫 This bot requires permission from the bot owner to operate in this group.\n\nContact @YourOwnerUsername to request access."
      );
    } catch {}
    try { await bot.telegram.leaveChat(chat.id); } catch {}
  }
});

// Block all group updates from non-whitelisted groups
bot.use(async (ctx, next) => {
  const chatType = ctx.chat?.type;
  if (chatType && chatType !== "private") {
    if (!ALLOWED_GROUPS.has(String(ctx.chat.id))) return;
  }
  return next();
});


/* ================= BAN CHECK ================= */

async function isUserBanned(userId) {
  try {
    const user = await User.collection.findOne({ telegramId: String(userId) });
    return user?.banned === true;
  } catch (e) {
    console.error("[BAN CHECK] error:", e.message);
    return false;
  }
}

// Global middleware — intercepts ALL updates before any handler
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();
  try {
    const user = await User.collection.findOne({ telegramId: String(userId) });
    if (user?.banned === true) {
      console.log(`[BAN BLOCK] userId=${userId}`);
      if (ctx.callbackQuery) {
        try { await ctx.answerCbQuery("🚫 You are banned.", { show_alert: true }); } catch {}
      } else if (ctx.message) {
        try { await ctx.reply("🚫 You are banned from this bot."); } catch {}
      }
      return; // do NOT call next()
    }
  } catch (e) {
    console.error("[BAN MIDDLEWARE] error:", e.message);
  }
  return next();
});


/* ================= HELPERS ================= */

const isHost = (match, id) => match && id === match.host;

const battingPlayers = (match) =>
  match.battingTeam === "A" ? match.teamA : match.teamB;

const bowlingPlayers = (match) =>
  match.bowlingTeam === "A" ? match.teamA : match.teamB;

function orderedBattingPlayers(match) {
  if (!match) return [];
  const players = battingPlayers(match);
  const captainId = match.battingTeam === "A" ? match.captains.A : match.captains.B;
  return [
    ...players.filter(p => p.id === captainId),
    ...players.filter(p => p.id !== captainId)
  ];
}

function clearActiveMatchPlayers(match) {
  if (!match) return;
  const allPlayers = [...(match.teamA || []), ...(match.teamB || [])];
  for (const player of allPlayers) {
    if (player?.id) playerActiveMatch.delete(player.id);
  }
  if (match.host) playerActiveMatch.delete(match.host);
}

function getPlayerTeam(match, userId) {
  if (!match) return null;
  if ((match.teamA || []).some(p => p.id === userId)) return "A";
  if ((match.teamB || []).some(p => p.id === userId)) return "B";
  return null;
}

function swapStrike(match) {
  if (!match || !match.striker || !match.nonStriker) return;
  const temp = match.striker;
  match.striker = match.nonStriker;
  match.nonStriker = temp;
}

function getDisplayName(user) {
  if (!user) return "Player";
  if (user.username) return `@${user.username}`;
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
  if (user.first_name) return user.first_name;
  return "Player";
}

function getName(match, id) {
  if (!match) return "Player";
  const all = [...(match.teamA || []), ...(match.teamB || [])];
  const p = all.find(x => x.id === id);
  return p ? p.name : "Player";
}

function clearTimers(match) {
  if (!match) return;
  if (match.warning30) { clearTimeout(match.warning30); match.warning30 = null; }
  if (match.warning10) { clearTimeout(match.warning10); match.warning10 = null; }
  if (match.ballTimer)  { clearTimeout(match.ballTimer);  match.ballTimer  = null; }
}

function clearDelayTimers(match) {
  if (!match) return;
  if (match.joinTimer)           { clearTimeout(match.joinTimer);          match.joinTimer          = null; }
  if (match.hostChange?.timeout) { clearTimeout(match.hostChange.timeout); match.hostChange.timeout = null; }
}


/* ================= GAME FLOW ================= */

async function advanceGame(match) {
  if (!match) return;
  if (match.phase === "switch") return;
  if (match.inningsEnded) return;
  if (match.wickets >= match.maxWickets) { await matchResult.endInnings(match); return; }
  if (match.currentOver >= match.totalOvers) { await matchResult.endInnings(match); return; }
  await ballHandler.startBall(match);
}

async function handleBallCompletion(match) {
  if (match.currentBall >= 6) {
    const overEnded = await checkOverEnd(match);
    return overEnded;
  }
  await advanceGame(match);
  return false;
}

// wasWicket = true when a wicket caused the over to end (ball 6 = W).
// This skips swapStrike (dismissed batter is gone, not rotating ends)
// and sets phase to "new_batter" so host is prompted for a batter before bowler.
async function checkOverEnd(match, wasWicket = false) {
  if (!match) return false;
  if (match.currentBall < 6) return false;
  if (match.inningsEnded) return true;

  match.currentOver++;
  match.currentBall = 0;
  match.currentOverRuns = 0;
  match.wicketStreak = 0;
  match.awaitingBat = false;
  match.awaitingBowl = false;

  if (match.currentOver >= match.totalOvers) {
    clearTimers(match);
    await matchResult.endInnings(match);
    return true;
  }

  // Send over-end scorecard
  try {
    await bot.telegram.sendMessage(match.groupId, generateScorecard(match, getName), { parse_mode: "HTML" });
  } catch (e) { console.error("Scorecard failed:", e.message); }

  match.lastOverBowler = match.bowler;
  match.bowler = null;

  // Only swap strike on a normal over-end (run/dot).
  // When a wicket ends the over the dismissed striker is out —
  // swapping would ghost them as non-striker.
  if (!wasWicket) {
    swapStrike(match);
  }

  const rr = match.currentOver > 0
    ? (match.score / (match.currentOver * 6) * 6).toFixed(2)
    : "0.00";

  if (wasWicket) {
    // Need both a new batter AND a new bowler.
    // Prompt batter first — /batter handler advances to set_bowler after.
    match.phase = "new_batter";
    match.awaitingBowl = false;
    match.awaitingBat  = false;

    try {
      await bot.telegram.sendMessage(
        match.groupId,
`✅ Over ${match.currentOver} Complete\n\n<blockquote>📊 ${match.score}/${match.wickets}   ⚙️ ${match.currentOver}/${match.totalOvers} ov   📈 ${rr}</blockquote>\n\n💥 Wicket on last ball — set new batter first\n👉 /batter [number] new batter`,
        { parse_mode: "HTML" }
      );
    } catch (e) { console.error("Over+wicket message failed:", e.message); }

  } else {
    // Normal over end — just need a bowler.
    match.phase = "set_bowler";

    try {
      await bot.telegram.sendMessage(
        match.groupId,
`✅ Over ${match.currentOver} Complete\n\n<blockquote>📊 ${match.score}/${match.wickets}   ⚙️ ${match.currentOver}/${match.totalOvers} ov   📈 ${rr}</blockquote>\n\n👉 /bowler [number] new bowler`,
        { parse_mode: "HTML" }
      );
    } catch (e) { console.error("Over message failed:", e.message); }
  }

  return true;
}

function bowlDMButton() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎯 Send Ball in DM", url: "https://t.me/Benevolent_Cricket_bot" }]
      ]
    }
  };
}


// ── Send a GIF/video + text message together ──
async function sendWithGif(groupId, gifType, text) {
  const fileId = randomGif(gifType);
  if (!fileId) {
    return bot.telegram.sendMessage(groupId, text, { parse_mode: "Markdown" });
  }
  try {
    await bot.telegram.sendVideo(groupId, fileId, {
      caption: text,
      parse_mode: "Markdown",
      supports_streaming: true
    });
  } catch (e) {
    console.error("sendWithGif failed:", e.message);
    await bot.telegram.sendMessage(groupId, text);
  }
}

const helpers = {
  isHost,
  getDisplayName,
  getName,
  getPlayerTeam,
  clearTimers,
  clearDelayTimers,
  clearActiveMatchPlayers,
  isUserBanned,
  startToss: null
};

matchResult.init({ bot, getName, clearTimers, clearActiveMatchPlayers, getCountdownCall });
ballHandler.init({
  bot, getName, clearTimers, swapStrike, sendWithGif,
  battingPlayers, checkOverEnd, advanceGame,
  endInnings: (m) => matchResult.endInnings(m),
  bowlDMButton
});

require("./commands/matchCommands")(bot, helpers);
require("./commands/hostControls")(bot, helpers);
require("./commands/teamCommands")(bot, helpers);
require("./commands/captainCommands")(bot, helpers);
require("./commands/tossCommands")(bot, helpers);

module.exports = { getName };


require("./commands/batterBowlerCommands")(bot, helpers);
require("./commands/scoreCommand")(bot, helpers);
require("./commands/handleInput")(bot, helpers);






// TEMP: file ID logger — remove after collecting IDs
bot.on(["animation", "video", "document", "sticker"], async (ctx) => {
  if (ctx.chat.type !== "private") return;
  const msg = ctx.message;
  const fileId =
    msg.animation?.file_id ||
    msg.video?.file_id     ||
    msg.sticker?.file_id   ||
    msg.document?.file_id;
  const type =
    msg.animation ? "animation" :
    msg.video     ? "video"     :
    msg.sticker   ? "sticker"   : "document";
  const extra = msg.sticker
    ? ` emoji=${msg.sticker.emoji} animated=${msg.sticker.is_animated} video=${msg.sticker.is_video}`
    : "";
  console.log(`[GIF LOG] type=${type}${extra} file_id=${fileId}`);
  await ctx.reply(`\`${type}${extra}\n${fileId}\``, { parse_mode: "Markdown" });
});




/* ================= BOT SAFETY ================= */

bot.catch((err, ctx) => {
  console.error("🤖 BOT ERROR:");
  console.error("Update Type:", ctx?.updateType);
  console.error("From:", ctx?.from?.id);
  console.error("Error:", err);
});

bot.use(async (ctx, next) => {
  if (ctx.callbackQuery) {
    try { await ctx.answerCbQuery(); } catch {}
  }
  return next();
});


registerStartHandler(bot);
registerStatsHandler(bot);

(async () => {
  await initializeApp();
  await initializeBot();
  await bot.launch();
  console.log("🚀 Bot started successfully");
})();

process.once("SIGINT",  () => { console.log("🛑 SIGINT received");  bot.stop("SIGINT");  });
process.once("SIGTERM", () => { console.log("🛑 SIGTERM received"); bot.stop("SIGTERM"); });
process.on("unhandledRejection", (err) => { console.error("❌ UNHANDLED REJECTION:", err); });
process.on("uncaughtException",  (err) => { console.error("❌ UNCAUGHT EXCEPTION:",  err); });