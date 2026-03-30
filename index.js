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
  "-1003047955907",
  "-1003774775125"
]);

bot.on("my_chat_member", async (ctx) => {
  const update    = ctx.myChatMember;
  const chat      = update?.chat;
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

/* ================= GROUP FILTER MIDDLEWARE ================= */

bot.use(async (ctx, next) => {
  const chatType = ctx.chat?.type;
  if (chatType && chatType !== "private") {
    if (!ALLOWED_GROUPS.has(String(ctx.chat.id))) return;
  }
  return next();
});


/* ===============================================================
   BAN LIST
   ---------------------------------------------------------------
   Works exactly like ALLOWED_GROUPS — a hardcoded Set of Telegram
   user ID strings. Add/remove IDs here to ban/unban users.
   No database query on every message = zero latency overhead.

   To ban:   add the user's Telegram ID string to BANNED_USERS
   To unban: remove it from BANNED_USERS and restart the bot

   Example:
     const BANNED_USERS = new Set(["123456789", "987654321"]);
   =============================================================== */

const BANNED_USERS = new Set([
  // "123456789",
  // "987654321",
]);

/* ── In-memory cache: avoids a DB query on every single message ── */
/* Cache is populated at startup from MongoDB, and can be updated   */
/* at runtime via the exported banUser / unbanUser helpers below.   */
const bannedCache = new Set(BANNED_USERS); // starts with hardcoded list

/* Load banned users from DB into cache at startup */
async function loadBannedUsersFromDB() {
  try {
    const banned = await User.find({ banned: true }, { telegramId: 1 }).lean();
    for (const u of banned) bannedCache.add(String(u.telegramId));
    console.log(`[BAN] Loaded ${banned.length} banned user(s) from DB into cache`);
  } catch (e) {
    console.error("[BAN] Failed to load banned users:", e.message);
  }
}

/* Runtime helpers — call these from statsHandler instead of DB queries */
function banUser(userId) {
  bannedCache.add(String(userId));
}
function unbanUser(userId) {
  bannedCache.delete(String(userId));
}
function isBannedUser(userId) {
  return bannedCache.has(String(userId));
}

/* ── Export so statsHandler can call banUser/unbanUser ── */
module.exports = { banUser, unbanUser, isBannedUser };


/* ================= BAN CHECK MIDDLEWARE ================= */
/* FIXED: No DB query per message. Uses in-memory bannedCache.  */
/* Cuts ~100-500ms of latency off every single bot interaction.  */

bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  if (bannedCache.has(String(userId))) {
    console.log(`[BAN BLOCK] userId=${userId}`);
    if (ctx.callbackQuery) {
      ctx.answerCbQuery("🚫 You are banned.", { show_alert: true }).catch(() => {});
    } else if (ctx.message) {
      ctx.reply("🚫 You are banned from this bot.").catch(() => {});
    }
    return; // do not call next()
  }

  return next();
});


/* ================= isUserBanned ================= */

async function isUserBanned(userId) {
  return bannedCache.has(String(userId));
}


/* ================= HELPERS ================= */

const isHost = (match, id) => match && id === match.host;

const battingPlayers = (match) =>
  match.battingTeam === "A" ? match.teamA : match.teamB;

const bowlingPlayers = (match) =>
  match.bowlingTeam === "A" ? match.teamA : match.teamB;

function orderedBattingPlayers(match) {
  if (!match) return [];
  const players   = battingPlayers(match);
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
  const temp       = match.striker;
  match.striker    = match.nonStriker;
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
  const p   = all.find(x => x.id === id);
  return p ? p.name : "Player";
}

function clearTimers(match) {
  if (!match) return;
  if (match.warning30) { clearTimeout(match.warning30); match.warning30 = null; }
  if (match.warning10) { clearTimeout(match.warning10); match.warning10 = null; }
  if (match.ballTimer) { clearTimeout(match.ballTimer); match.ballTimer  = null; }
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

async function checkOverEnd(match, wasWicket = false) {
  if (!match) return false;
  if (match.currentBall < 6) return false;
  if (match.inningsEnded) return true;

  match.currentOver++;
  match.currentBall     = 0;
  match.currentOverRuns = 0;
  match.wicketStreak    = 0;
  match.awaitingBat     = false;
  match.awaitingBowl    = false;

  if (match.currentOver >= match.totalOvers) {
    clearTimers(match);
    await matchResult.endInnings(match);
    return true;
  }

  match.lastOverBowler = match.bowler;
  match.bowler         = null;

  const rr = match.currentOver > 0
    ? (match.score / (match.currentOver * 6) * 6).toFixed(2)
    : "0.00";

  if (wasWicket) {
    match.pendingOverEnd   = true;
    match.phase            = "new_batter";
    match.awaitingBowl     = false;
    match.awaitingBat      = false;

    try {
      await bot.telegram.sendMessage(
        match.groupId,
`✅ Over ${match.currentOver} Complete\n\n<blockquote>📊 ${match.score}/${match.wickets}   ⚙️ ${match.currentOver}/${match.totalOvers} ov   📈 ${rr}</blockquote>\n\n💥 Wicket on last ball — set new batter first\n👉 /batter [number] new batter`,
        { parse_mode: "HTML" }
      );
    } catch (e) { console.error("Over+wicket message failed:", e.message); }

  } else {
    swapStrike(match);

    try {
      await bot.telegram.sendMessage(
        match.groupId,
        generateScorecard(match, getName),
        { parse_mode: "HTML" }
      );
    } catch (e) { console.error("Scorecard failed:", e.message); }

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


/* ================= BOWL DM BUTTON ================= */

function bowlDMButton() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎯 Send Ball in DM", url: "https://t.me/Benevolent_Cricket_bot" }]
      ]
    }
  };
}


/* ================= SEND WITH GIF ================= */

async function sendWithGif(groupId, gifType, text) {
  const fileId = randomGif(gifType);
  if (!fileId) {
    return bot.telegram.sendMessage(groupId, text, { parse_mode: "Markdown" });
  }
  try {
    await bot.telegram.sendVideo(groupId, fileId, {
      caption:            text,
      parse_mode:         "Markdown",
      supports_streaming: true
    });
  } catch (e) {
    console.error("sendWithGif failed:", e.message);
    await bot.telegram.sendMessage(groupId, text);
  }
}


/* ================= HELPERS OBJECT ================= */

const helpers = {
  isHost,
  getDisplayName,
  getName,
  getPlayerTeam,
  swapStrike,
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

require("./commands/batterBowlerCommands")(bot, helpers);
require("./commands/scoreCommand")(bot, helpers);
require("./commands/handleInput")(bot, helpers);


/* ================= REGISTER COMMAND HANDLERS ================= */

registerStartHandler(bot);
registerStatsHandler(bot);


/* ================= FILE ID LOGGER ================= */

bot.on(["animation", "video", "document", "sticker"], async (ctx) => {
  if (ctx.chat.type !== "private") return;
  const msg    = ctx.message;
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

bot.on("message", async (ctx) => {
  if (ctx.chat.type !== "private") return;
  const entities =
    ctx.message?.entities ||
    ctx.message?.caption_entities ||
    [];
  const customEmojis = entities.filter(e => e.type === "custom_emoji");
  if (!customEmojis.length) return;
  const ids = customEmojis.map(e => e.custom_emoji_id);
  try {
    const stickers = await ctx.telegram.callApi("getCustomEmojiStickers", { custom_emoji_ids: ids });
    for (const s of stickers) {
      const line = `custom_emoji  emoji=${s.emoji}  animated=${s.is_animated}  video=${s.is_video}\n${s.file_id}`;
      console.log(`[GIF LOG] ${line}`);
      await ctx.reply(`\`${line}\``, { parse_mode: "Markdown" });
    }
  } catch (e) {
    console.error("[CUSTOM EMOJI LOG] failed:", e.message);
    await ctx.reply(`⚠️ getCustomEmojiStickers failed: ${e.message}`);
  }
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


/* ================= LAUNCH ================= */

(async () => {
  await initializeApp();
  await initializeBot();
  // Load banned users from DB into memory cache before bot starts polling
  await loadBannedUsersFromDB();
  await bot.launch();
  console.log("🚀 Bot started successfully");
})();

process.once("SIGINT",  () => { console.log("🛑 SIGINT received");  bot.stop("SIGINT");  });
process.once("SIGTERM", () => { console.log("🛑 SIGTERM received"); bot.stop("SIGTERM"); });
process.on("unhandledRejection", (err) => { console.error("❌ UNHANDLED REJECTION:", err); });
process.on("uncaughtException",  (err) => { console.error("❌ UNCAUGHT EXCEPTION:",  err); });