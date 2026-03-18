const PlayerStats = require("../models/PlayerStats");
const User = require("../User");
const { calculateBatting, calculateBowling } = require("../utils/statsCalculator");

/* ================= HELPERS ================= */

function pad(str, len) {
  str = String(str ?? "—");
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}

function textLen(str) {
  return [...String(str ?? "")].length;
}

function row(label, value) {
  return `  ${pad(label, 14)}  ${value}`;
}

/* ================= CARD BUILDER ================= */

function buildStatsCard(displayName, stats, bat, bowl) {

  const battingRows = [
    row("Matches",      stats.matches      ?? 0),
    row("Innings",      stats.inningsBatting ?? 0),
    row("Runs",         `${stats.runs ?? 0}  (${stats.balls ?? 0} balls)`),
    row("Average",      bat.average),
    row("Strike Rate",  bat.strikeRate),
    row("4s / 6s / 5s", `${stats.fours ?? 0} / ${stats.sixes ?? 0} / ${stats.fives ?? 0}`),
    row("Ducks",        stats.ducks    ?? 0),
    row("50s / 100s",   `${stats.fifties ?? 0} / ${stats.hundreds ?? 0}`),
    row("Best Score",   stats.bestScore ?? 0),
  ];

  const bowlingRows = [
    row("Innings",      stats.inningsBowling ?? 0),
    row("Wickets",      stats.wickets        ?? 0),
    row("Balls",        stats.ballsBowled    ?? 0),
    row("Runs",         stats.runsConceded   ?? 0),
    row("Economy",      bowl.economy),
    row("Strike Rate",  bowl.strikeRate),
    row("Average",      bowl.average),
    row("Maidens",      stats.maidens        ?? 0),
    row("3w / 5w",      `${stats.threeW ?? 0} / ${stats.fiveW ?? 0}`),
    row("Best",         `${stats.bestBowlingWickets ?? 0} / ${stats.bestBowlingRuns ?? 0}`),
  ];

  const allLines = [
    `  ${displayName}`,
    "  🏏  BATTING",
    "  🎯  BOWLING",
    ...battingRows,
    ...bowlingRows,
  ];

  const maxLen = Math.max(...allLines.map(l => textLen(l)));
  const inner   = maxLen + 2;
  const sep     = "═".repeat(inner);
  const dash    = "─".repeat(inner - 2);
  const topFill = "═".repeat(Math.max(1, inner - 15));
  const top = `╔═ CAREER STATS ${topFill}╗`;
  const div = `╠${sep}╣`;
  const bot = `╚${sep}╝`;

  return `\`\`\`
${top}
  ${displayName}
${div}
  🏏  BATTING
  ${dash}
${battingRows.join("\n")}
${div}
  🎯  BOWLING
  ${dash}
${bowlingRows.join("\n")}
${bot}\`\`\``;
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

      await ctx.reply(buildStatsCard(name, stats, bat, bowl), { parse_mode: "Markdown" });
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

      await ctx.reply(buildStatsCard(`@${username}`, stats, bat, bowl), { parse_mode: "Markdown" });
    } catch (err) {
      console.error("stats error:", err);
      ctx.reply("⚠️ Error fetching stats.");
    }
  });

}

module.exports = registerStatsHandler;