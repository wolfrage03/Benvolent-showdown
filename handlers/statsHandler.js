const PlayerStats = require("../models/PlayerStats");
const User = require("../User");
const { calculateBatting, calculateBowling } = require("../utils/statsCalculator");

/* ================= HELPERS ================= */

// Right-align value, left-align label
function row(label, value, labelW = 16, valW = 6) {
  return `  ${label.padEnd(labelW)}  ${String(value ?? 0).padStart(valW)}`;
}

/* ================= CARD BUILDER ================= */

function buildStatsCard(displayName, stats, bat, bowl) {
  const bold = `━━━━━━━━━━━`;   // matches scorecard bold line
  const thin = `─────────────`; // matches scorecard thin line

  return [
    bold,
    `  📊 Career Stats`,
    bold,
    ``,
    `  👤 ${displayName}`,
    `  🏟  Matches played    ${stats.matches ?? 0}`,
    `  🏆  Matches won       ${stats.matchesWon ?? 0}`,
    `  🏅  Man of the Match  ${stats.motm ?? 0}`,
    ``,
    thin,
    `  🏏 BATTING`,
    thin,
    row("Innings",      stats.inningsBatting ?? 0),
    row("Runs",         stats.runs ?? 0),
    row("Balls faced",  stats.balls ?? 0),
    row("Average",      bat.average),
    row("Strike Rate",  bat.strikeRate),
    row("4s",           stats.fours ?? 0),
    row("5s",           stats.fives ?? 0),
    row("6s",           stats.sixes ?? 0),
    row("Best Score",   stats.bestScore ?? 0),
    row("50s",          stats.fifties ?? 0),
    row("100s",         stats.hundreds ?? 0),
    row("Ducks",        stats.ducks ?? 0),
    ``,
    thin,
    `  🎯 BOWLING`,
    thin,
    row("Innings",      stats.inningsBowling ?? 0),
    row("Wickets",      stats.wickets ?? 0),
    row("Balls",        stats.ballsBowled ?? 0),
    row("Runs given",   stats.runsConceded ?? 0),
    row("Economy",      bowl.economy),
    row("Strike Rate",  bowl.strikeRate),
    row("Average",      bowl.average),
    row("Maidens",      stats.maidens ?? 0),
    row("3-wkt hauls",  stats.threeW ?? 0),
    row("5-wkt hauls",  stats.fiveW ?? 0),
    row("Best",         `${stats.bestBowlingWickets ?? 0}w/${stats.bestBowlingRuns ?? 0}r`),
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
      await ctx.reply(````
${buildStatsCard(name, stats, bat, bowl)}
````, { parse_mode: "MarkdownV2" });
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
      await ctx.reply(````
${buildStatsCard(`@${username}`, stats, bat, bowl)}
````, { parse_mode: "MarkdownV2" });
    } catch (err) {
      console.error("stats error:", err);
      ctx.reply("⚠️ Error: " + err.message);
    }
  });

}

module.exports = registerStatsHandler;