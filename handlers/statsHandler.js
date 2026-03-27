const PlayerStats = require("../models/PlayerStats");
const User = require("../User");
const { calculateBatting, calculateBowling } = require("../utils/statsCalculator");

/* ================= ADMINS ================= */

const ADMIN_IDS = ["764519233", "8569821097"];

function isAdmin(ctx) {
  return ADMIN_IDS.includes(String(ctx.from?.id));
}

/* ================= ESCAPE UTILITY ================= */

function esc(v) {
  return String(v ?? "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

/* ================= CARD BUILDER ================= */

function buildStatsCard(displayName, firstName, stats, bat, bowl) {
  const lost = (stats.matches ?? 0) - (stats.matchesWon ?? 0);

  return [
    `*📊 Career Stats*`,
    `*👤* ${firstName ? esc(firstName) + ' ' : ''}*${esc(displayName)}*`,
    ``,
    `*🏟 Matches:* ${esc(stats.matches ?? 0)}`,
    `*✅ Won:* ${esc(stats.matchesWon ?? 0)}  \\|  *❌ Lost:* ${esc(lost)}`,
    `*🏅 MOM:* ${esc(stats.motm ?? 0)}`,
    `*🎙 Hosted:* ${esc(stats.hosted ?? 0)}`,
    ``,
    `*─── 🏏 Batting ───*`,
    `*🔢  Innings:* ${esc(stats.inningsBatting ?? 0)}`,
    `*🏃  Runs:* ${esc(stats.runs ?? 0)}  \\|  *⚾ Balls:* ${esc(stats.balls ?? 0)}`,
    `*📈  Avg:* ${esc(bat.average)}  \\|  *⚡ SR:* ${esc(bat.strikeRate)}`,
    `*🏏  Fours:* ${esc(stats.fours ?? 0)}`,
    `*💫  Fives:* ${esc(stats.fives ?? 0)}`,
    `*🚀  Sixes:* ${esc(stats.sixes ?? 0)}`,
    `*⑤⓪ Half Century:* ${esc(stats.fifties ?? 0)}`,
    `*💯  Century:* ${esc(stats.hundreds ?? 0)}`,
    `*🌟  Best:* ${esc(stats.bestScore ?? 0)}  \\|  *🦆 Ducks:* ${esc(stats.ducks ?? 0)}`,
    ``,
    `*─── 🎯 Bowling ───*`,
    `*🔢 Innings:* ${esc(stats.inningsBowling ?? 0)}`,
    `*🎳 Wickets:* ${esc(stats.wickets ?? 0)}  \\|  *⚾ Balls:* ${esc(stats.ballsBowled ?? 0)}`,
    `*💸 Runs:* ${esc(stats.runsConceded ?? 0)}  \\|  *🔒 Maidens:* ${esc(stats.maidens ?? 0)}`,
    `*📉 Econ:* ${esc(bowl.economy)}  \\|  *⚡ SR:* ${esc(bowl.strikeRate)}`,
    `*📊 Avg:* ${esc(bowl.average)}`,
    `*🎩 3\\-Wicket Haul:* ${esc(stats.threeW ?? 0)}`,
    `*👑 5\\-Wicket Haul:* ${esc(stats.fiveW ?? 0)}`,
    `*🏆 Best:* ${esc(stats.bestBowlingWickets ?? 0)} / ${esc(stats.bestBowlingRuns ?? 0)}`,
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
      if (parts.length < 2)
        return ctx.reply("ℹ️ Usage: /stats @username  or  /stats 123456789");

      const arg = parts[1];

      // Accept numeric user ID
      if (/^\d+$/.test(arg)) {
        const userId = arg;
        const stats = await PlayerStats.findOne({ userId });
        if (!stats) return ctx.reply(`📊 User ID ${userId} has no stats yet.`);
        const bat  = calculateBatting(stats);
        const bowl = calculateBowling(stats);
        const user = await User.findOne({ telegramId: userId });
        const displayName = user
          ? (user.username ? `@${user.username}` : (user.firstName || userId))
          : userId;
        const firstName = user?.firstName || "";
        await ctx.reply(buildStatsCard(displayName, firstName, stats, bat, bowl), { parse_mode: "MarkdownV2" });
        return;
      }

      if (!arg.startsWith("@"))
        return ctx.reply("ℹ️ Usage: /stats @username  or  /stats 123456789");

      const username = arg.replace("@", "").toLowerCase();
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
        if (parts.length < 2)
          return ctx.reply(
`ℹ️ Usage:
  • /reset 123456789
  • Reply to a player's message with /reset`
          );

        const arg = parts[1];

        if (/^\d+$/.test(arg)) {
          // user ID
          targetUserId  = arg;
          const user    = await User.findOne({ telegramId: arg });
          displayHandle = user
            ? (user.firstName || user.username || arg)
            : arg;
        } else if (arg.startsWith("@")) {
          // @username fallback
          const username = arg.replace("@", "").toLowerCase();
          const user = await User.findOne({ username });
          if (!user) return ctx.reply(`❌ User @${username} not found.`);
          targetUserId  = String(user.telegramId);
          displayHandle = user.firstName || `@${username}`;
        } else {
          return ctx.reply("ℹ️ Usage: /reset 123456789  or reply to a message with /reset");
        }
      }

      await ctx.reply(
`⚠️ Reset Stats
──────────────
👤 ${displayHandle} (ID: ${targetUserId})
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

  /* ================= BAN / UNBAN ================= */

  bot.command("ban", async (ctx) => {
    try {
      if (!isAdmin(ctx))
        return ctx.reply("❌ You don't have permission to ban users.");

      let targetUserId  = null;
      let displayHandle = null;

      if (ctx.message.reply_to_message) {
        const replied = ctx.message.reply_to_message.from;
        targetUserId  = String(replied.id);
        displayHandle = replied.username ? `@${replied.username}` : replied.first_name;
      } else {
        const parts = ctx.message.text.trim().split(/\s+/);
        if (parts.length < 2)
          return ctx.reply("ℹ️ Usage: /ban 123456789  or reply to a message with /ban");

        const arg = parts[1];
        if (/^\d+$/.test(arg)) {
          targetUserId  = arg;
          const user    = await User.findOne({ telegramId: arg });
          displayHandle = user ? (user.firstName || user.username || arg) : arg;
        } else if (arg.startsWith("@")) {
          const username = arg.replace("@", "").toLowerCase();
          const user = await User.findOne({ username });
          if (!user) return ctx.reply(`❌ User @${username} not found.`);
          targetUserId  = String(user.telegramId);
          displayHandle = user.firstName || `@${username}`;
        } else {
          return ctx.reply("ℹ️ Usage: /ban 123456789  or reply to a message with /ban");
        }
      }

      if (ADMIN_IDS.includes(targetUserId))
        return ctx.reply("❌ Cannot ban an admin.");

      await User.updateOne(
        { telegramId: targetUserId },
        { $set: { banned: true } },
        { upsert: true }
      );

      await ctx.reply(
`🚫 User Banned
──────────────
👤 ${displayHandle} (ID: ${targetUserId})
They can no longer use the bot.`
      );

    } catch (err) {
      console.error("ban error:", err);
      ctx.reply("⚠️ Error: " + err.message);
    }
  });

  bot.command("unban", async (ctx) => {
    try {
      if (!isAdmin(ctx))
        return ctx.reply("❌ You don't have permission to unban users.");

      const parts = ctx.message.text.trim().split(/\s+/);
      if (parts.length < 2)
        return ctx.reply("ℹ️ Usage: /unban 123456789");

      const arg = parts[1];
      let targetUserId, displayHandle;

      if (/^\d+$/.test(arg)) {
        targetUserId  = arg;
        const user    = await User.findOne({ telegramId: arg });
        displayHandle = user ? (user.firstName || user.username || arg) : arg;
      } else if (arg.startsWith("@")) {
        const username = arg.replace("@", "").toLowerCase();
        const user = await User.findOne({ username });
        if (!user) return ctx.reply(`❌ User @${username} not found.`);
        targetUserId  = String(user.telegramId);
        displayHandle = user.firstName || `@${username}`;
      } else {
        return ctx.reply("ℹ️ Usage: /unban 123456789");
      }

      await User.updateOne(
        { telegramId: targetUserId },
        { $set: { banned: false } }
      );

      await ctx.reply(
`✅ User Unbanned
──────────────
👤 ${displayHandle} (ID: ${targetUserId})
They can use the bot again.`
      );

    } catch (err) {
      console.error("unban error:", err);
      ctx.reply("⚠️ Error: " + err.message);
    }
  });

}

module.exports = registerStatsHandler;