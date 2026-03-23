const PlayerStats = require("../models/PlayerStats");
const User = require("../User");
const { calculateBatting, calculateBowling } = require("../utils/statsCalculator");

/* ================= ADMINS ================= */

const ADMIN_USERNAMES = ["ryomensukuna39", "norai_na_o"];

function isAdmin(ctx) {
  const username = (ctx.from?.username || "").toLowerCase();
  return ADMIN_USERNAMES.includes(username);
}

/* ================= CARD BUILDER ================= */

function buildStatsCard(displayName, firstName, stats, bat, bowl) {
  const lost = (stats.matches ?? 0) - (stats.matchesWon ?? 0);

  return [
    `*📊 Career Stats*`,
    `*👤* ${firstName ? firstName + ' ' : ''}*${displayName}*`,
    ``,
    `*🏟 Matches:* ${stats.matches ?? 0}`,
    `*✅ Won:* ${stats.matchesWon ?? 0}  |  *❌ Lost:* ${lost}`,
    `*🏅 MOM:* ${stats.motm ?? 0}`,
    `*🎙 Hosted:* ${stats.hosted ?? 0}`,
    ``,
    `*─── 🏏 Batting ───*`,
    `*🔢  Innings:* ${stats.inningsBatting ?? 0}`,
    `*🏃  Runs:* ${stats.runs ?? 0}  |  *⚾ Balls:* ${stats.balls ?? 0}`,
    `*📈  Avg:* ${bat.average}  |  *⚡ SR:* ${bat.strikeRate}`,
    `*🏏  Fours:* ${stats.fours ?? 0}`,
    `*💫  Fives:* ${stats.fives ?? 0}`,
    `*🚀  Sixes:* ${stats.sixes ?? 0}`,
    `*⑤⓪ Half Century:* ${stats.fifties ?? 0}`,
    `*💯  Century:* ${stats.hundreds ?? 0}`,
    `*🌟  Best:* ${stats.bestScore ?? 0}  |  *🦆 Ducks:* ${stats.ducks ?? 0}`,
    ``,
    `*─── 🎯 Bowling ───*`,
    `*🔢 Innings:* ${stats.inningsBowling ?? 0}`,
    `*🎳 Wickets:* ${stats.wickets ?? 0}  |  *⚾ Balls:* ${stats.ballsBowled ?? 0}`,
    `*💸 Runs:* ${stats.runsConceded ?? 0}  |  *🔒 Maidens:* ${stats.maidens ?? 0}`,
    `*📉 Econ:* ${bowl.economy}  |  *⚡ SR:* ${bowl.strikeRate}`,
    `*📊 Avg:* ${bowl.average}`,
    `*🎩 3\\-Wicket Haul:* ${stats.threeW ?? 0}`,
    `*👑 5\\-Wicket Haul:* ${stats.fiveW ?? 0}`,
    `*🏆 Best:* ${stats.bestBowlingWickets ?? 0} / ${stats.bestBowlingRuns ?? 0}`,
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
      const bat       = calculateBatting(stats);
      const bowl      = calculateBowling(stats);
      const username  = ctx.from.username ? `@${ctx.from.username}` : null;
      const firstName = ctx.from.first_name || "";
      const display   = username || firstName;
      await ctx.reply(buildStatsCard(display, username ? firstName : "", stats, bat, bowl), { parse_mode: "MarkdownV2" });
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
      const firstName = user.firstName || user.first_name || "";
      await ctx.reply(buildStatsCard(`@${username}`, firstName, stats, bat, bowl), { parse_mode: "MarkdownV2" });
    } catch (err) {
      console.error("stats error:", err);
      ctx.reply("⚠️ Error: " + err.message);
    }
  });

  /* ================= RESET STATS ================= */

  bot.command("reset", async (ctx) => {
    try {
      if (!isAdmin(ctx))
        return ctx.reply("❌ You don't have permission to reset stats.");

      let targetUserId  = null;
      let displayHandle = null;

      if (ctx.message.reply_to_message) {
        const replied = ctx.message.reply_to_message.from;
        targetUserId  = String(replied.id);
        displayHandle = replied.username ? `@${replied.username}` : replied.first_name;
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