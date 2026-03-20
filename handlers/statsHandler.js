const PlayerStats = require("../models/PlayerStats");
const User = require("../User");
const { calculateBatting, calculateBowling } = require("../utils/statsCalculator");

/* ================= ADMINS ================= */

const ADMIN_USERNAMES = ["ryomensukuna39", "norai_na_o"];

function isAdmin(ctx) {
  const username = (ctx.from?.username || "").toLowerCase();
  return ADMIN_USERNAMES.includes(username);
}

/* ================= HELPERS ================= */

// Fixed-width columns: label left-padded to 16, value right-padded to 6
function row(label, value, labelW = 14, valW = 5) {
  const lbl = label.padEnd(labelW);
  const val = String(value ?? 0).padStart(valW);
  return `${lbl} : ${val}`;
}


/* ================= CARD BUILDER ================= */

function buildStatsCard(displayName, stats, bat, bowl) {
  const bold = `━━━━━━━━━━━━━━`;
  const thin = `──────────────`;

  return [
    bold,
    `  📊 Career Stats`,
    bold,
    ``,
    `👤 ${displayName}`,
    row("🏟  Matches",      stats.matches ?? 0),
    row("🏆  Won",          stats.matchesWon ?? 0),
    row("🏅  MOM",          stats.motm ?? 0),
    ``,
    thin,
    `  🏏 BATTING`,
    thin,
    row("Innings",          stats.inningsBatting ?? 0),
    row("Runs",             stats.runs ?? 0),
    row("Balls",            stats.balls ?? 0),
    row("Avg",              bat.average),
    row("SR",               bat.strikeRate),
    row("4s",               stats.fours ?? 0),
    row("5s",               stats.fives ?? 0),
    row("6s",               stats.sixes ?? 0),
    row("Best Score",       stats.bestScore ?? 0),
    row("50s",              stats.fifties ?? 0),
    row("100s",             stats.hundreds ?? 0),
    row("Ducks",            stats.ducks ?? 0),
    ``,
    thin,
    `  🎯 BOWLING`,
    thin,
    row("Innings",          stats.inningsBowling ?? 0),
    row("Wickets",          stats.wickets ?? 0),
    row("Balls",            stats.ballsBowled ?? 0),
    row("Runs",             stats.runsConceded ?? 0),
    row("Economy",          bowl.economy),
    row("Strike Rate",      bowl.strikeRate),
    row("Avg",              bowl.average),
    row("Maidens",          stats.maidens ?? 0),
    row("3W",               stats.threeW ?? 0),
    row("5W",               stats.fiveW ?? 0),
    row("Best",             `${stats.bestBowlingWickets ?? 0}w/${stats.bestBowlingRuns ?? 0}r`),
    ``,
    bold,
  ].join("\n");
}

/* ================= HANDLER ================= */

function registerStatsHandler(bot) {

  /* ================= MY STATS ================= */

  bot.command("mystats", async (ctx) => {
    try {
      const stats = await PlayerStats.findOne({ userId: String(ctx.from.id) });
      if (!stats) return ctx.reply(
`📊 No stats yet
──────────────
Play some matches first!`
      );
      const bat  = calculateBatting(stats);
      const bowl = calculateBowling(stats);
      const name = ctx.from.username
        ? `@${ctx.from.username}`
        : ctx.from.first_name;
      await ctx.reply(`\`\`\`\n${buildStatsCard(name, stats, bat, bowl)}\n\`\`\``);
    } catch (err) {
      console.error("mystats error:", err);
      ctx.reply("⚠️ Error: " + err.message);
    }
  });

  /* ================= OTHER PLAYER STATS ================= */

  bot.command("stats", async (ctx) => {
    try {
      const parts = ctx.message.text.trim().split(/\s+/);
      if (parts.length < 2 || !parts[1].startsWith("@"))
        return ctx.reply("ℹ️ Usage: /stats @username");
      const username = parts[1].replace("@", "").toLowerCase();
      const user = await User.findOne({ username });
      if (!user) return ctx.reply(`❌ User @${username} not found.`);
      const stats = await PlayerStats.findOne({ userId: user.telegramId });
      if (!stats) return ctx.reply(`📊 @${username} has no stats yet.`);
      const bat  = calculateBatting(stats);
      const bowl = calculateBowling(stats);
      await ctx.reply(`\`\`\`\n${buildStatsCard(`@${username}`, stats, bat, bowl)}\n\`\`\``);
    } catch (err) {
      console.error("stats error:", err);
      ctx.reply("⚠️ Error: " + err.message);
    }
  });

  /* ================= RESET STATS ================= */

  bot.command("reset", async (ctx) => {
    try {
      // Admin check
      if (!isAdmin(ctx))
        return ctx.reply("❌ You don't have permission to reset stats.");

      let targetUserId  = null;
      let displayHandle = null;

      /* --- Method 1: reply to a message --- */
      if (ctx.message.reply_to_message) {
        const replied = ctx.message.reply_to_message.from;
        targetUserId  = String(replied.id);
        displayHandle = replied.username ? `@${replied.username}` : replied.first_name;

      /* --- Method 2: /reset @username --- */
      } else {
        const parts = ctx.message.text.trim().split(/\s+/);
        if (parts.length < 2 || !parts[1].startsWith("@"))
          return ctx.reply(
`ℹ️ Usage:
  • /reset @username
  • Reply to a player's message with /reset`
          );

        const username = parts[1].replace("@", "").toLowerCase();
        const user = await User.findOne({ username });
        if (!user) return ctx.reply(`❌ User @${username} not found.`);
        targetUserId  = String(user.telegramId);
        displayHandle = `@${username}`;
      }

      // Ask for confirmation before wiping
      await ctx.reply(
`⚠️ Reset Stats
──────────────
👤 ${displayHandle}
Are you sure you want to wipe all career stats?`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Yes, Reset",  callback_data: `reset_confirm:${targetUserId}:${displayHandle}` },
              { text: "❌ Cancel",      callback_data: `reset_cancel` }
            ]]
          }
        }
      );

    } catch (err) {
      console.error("reset error:", err);
      ctx.reply("⚠️ Error: " + err.message);
    }
  });

  /* ================= RESET CONFIRM / CANCEL ================= */

  bot.action(/^reset_confirm:(\d+):(.+)$/, async (ctx) => {
    try {
      if (!isAdmin(ctx))
        return ctx.answerCbQuery("❌ You don't have permission.", { show_alert: true });

      const targetUserId  = ctx.match[1];
      const displayHandle = ctx.match[2];

      const result = await PlayerStats.deleteOne({ userId: targetUserId });

      await ctx.editMessageText(
        result.deletedCount === 0
          ? `⚠️ ${displayHandle} has no stats to reset.`
          :
`✅ Stats Reset
──────────────
👤 ${displayHandle}'s career stats have been wiped.`
      );
      await ctx.answerCbQuery("Done!");

    } catch (err) {
      console.error("reset_confirm error:", err);
      await ctx.answerCbQuery("⚠️ Error: " + err.message, { show_alert: true });
    }
  });

  bot.action("reset_cancel", async (ctx) => {
    try {
      await ctx.editMessageText("❌ Reset cancelled.");
      await ctx.answerCbQuery("Cancelled.");
    } catch (err) {
      console.error("reset_cancel error:", err);
      await ctx.answerCbQuery("⚠️ Error: " + err.message, { show_alert: true });
    }
  });

}

module.exports = registerStatsHandler;