const PlayerStats = require("../models/PlayerStats");
const User = require("../User");
const { calculateBatting, calculateBowling } = require("../utils/statsCalculator");

/* ================= CARD BUILDER ================= */

function buildStatsCard(displayName, stats, bat, bowl) {

  const line = "─────────────────────";

  return (
`╭─────────────────────╮
  📊 Career Stats
╰─────────────────────╯
👤 ${displayName}
${line}
🏏 BATTING
${line}
🏟  Matches        ${stats.matches ?? 0}
📋 Innings         ${stats.inningsBatting ?? 0}
🏃 Runs            ${stats.runs ?? 0}  (${stats.balls ?? 0} balls)
📊 Average         ${bat.average}
⚡ Strike Rate     ${bat.strikeRate}
🔥 4s / 6s / 5s   ${stats.fours ?? 0} / ${stats.sixes ?? 0} / ${stats.fives ?? 0}
🏆 Best Score      ${stats.bestScore ?? 0}
🌟 50s / 100s      ${stats.fifties ?? 0} / ${stats.hundreds ?? 0}
🦆 Ducks           ${stats.ducks ?? 0}
${line}
🎯 BOWLING
${line}
📋 Innings         ${stats.inningsBowling ?? 0}
🎳 Wickets         ${stats.wickets ?? 0}
⚽ Balls           ${stats.ballsBowled ?? 0}
💥 Runs Given      ${stats.runsConceded ?? 0}
📈 Economy         ${bowl.economy}
⚡ Strike Rate     ${bowl.strikeRate}
📊 Average         ${bowl.average}
🧘 Maidens         ${stats.maidens ?? 0}
🎯 3w / 5w         ${stats.threeW ?? 0} / ${stats.fiveW ?? 0}
🏅 Best Bowling    ${stats.bestBowlingWickets ?? 0}w / ${stats.bestBowlingRuns ?? 0}r
${line}`
  );
}

/* ================= HANDLER ================= */

function registerStatsHandler(bot) {

  /* ================= MY STATS ================= */

  bot.command("mystats", async (ctx) => {
    try {
      if (ctx.chat.type === "private")
        return ctx.reply("❌ Use this command in the group.");

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

      await ctx.reply(buildStatsCard(name, stats, bat, bowl));
    } catch (err) {
      console.error("mystats error:", err);
      ctx.reply("⚠️ Error fetching stats.");
    }
  });

  /* ================= OTHER PLAYER STATS ================= */

  bot.command("stats", async (ctx) => {
    try {
      if (ctx.chat.type === "private")
        return ctx.reply("❌ Use this command in the group.");

      const parts = ctx.message.text.trim().split(/\s+/);
      if (parts.length < 2 || !parts[1].startsWith("@"))
        return ctx.reply("ℹ️ Usage: /stats @username");

      const username = parts[1].replace("@", "").toLowerCase();
      const user     = await User.findOne({ username });

      if (!user) return ctx.reply(`❌ User @${username} not found.`);

      const stats = await PlayerStats.findOne({ userId: user.telegramId });
      if (!stats) return ctx.reply(`📊 @${username} has no stats yet.`);

      const bat  = calculateBatting(stats);
      const bowl = calculateBowling(stats);

      await ctx.reply(buildStatsCard(`@${username}`, stats, bat, bowl));
    } catch (err) {
      console.error("stats error:", err);
      ctx.reply("⚠️ Error fetching stats.");
    }
  });

}

module.exports = registerStatsHandler;