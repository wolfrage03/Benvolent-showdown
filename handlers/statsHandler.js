const PlayerStats = require("../models/PlayerStats");
const User = require("../User");
const { calculateBatting, calculateBowling } = require("../utils/statsCalculator");

/* ================= HELPERS ================= */

function pad(str, len) {
  str = String(str ?? "—");
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}

function rpad(str, len) {
  str = String(str ?? "—");
  return str.length >= len ? str.slice(0, len) : " ".repeat(len - str.length) + str;
}

function row(label, value) {
  return `  ${pad(label, 14)}  ${value}`;
}

/* ================= CARD BUILDER ================= */

function buildStatsCard(displayName, stats, bat, bowl) {
  return `\`\`\`
╔═ CAREER STATS ════════════════════╗
  ${displayName}
╠══════════════════════════════════╣
  🏏  BATTING
  ${"─".repeat(32)}
${row("Matches",     stats.matches)}
${row("Innings",     stats.inningsBatting)}
${row("Runs",        `${stats.runs}  (${stats.balls} balls)`)}
${row("Average",     bat.average)}
${row("Strike Rate", bat.strikeRate)}
${row("4s / 6s / 5s", `${stats.fours} / ${stats.sixes} / ${stats.fives}`)}
${row("Ducks",       stats.ducks)}
${row("50s / 100s",  `${stats.fifties} / ${stats.hundreds}`)}
${row("Best Score",  stats.bestScore)}
╠══════════════════════════════════╣
  🎯  BOWLING
  ${"─".repeat(32)}
${row("Innings",     stats.inningsBowling)}
${row("Wickets",     stats.wickets)}
${row("Balls",       stats.ballsBowled)}
${row("Runs",        stats.runsConceded)}
${row("Economy",     bowl.economy)}
${row("Strike Rate", bowl.strikeRate)}
${row("Average",     bowl.average)}
${row("Maidens",     stats.maidens)}
${row("3w / 5w",     `${stats.threeW} / ${stats.fiveW}`)}
${row("Best",        `${stats.bestBowlingWickets} / ${stats.bestBowlingRuns}`)}
╚══════════════════════════════════╝\`\`\``;
}

/* ================= HANDLER ================= */

function registerStatsHandler(bot) {


  /* ================= MY STATS ================= */

  bot.command("mystats", async (ctx) => {

    if (ctx.chat.type === "private")
      return ctx.reply("❌ Use this command in the group.");

    const stats = await PlayerStats.findOne({ userId: String(ctx.from.id) });
    if (!stats) return ctx.reply(
`╔═ NO STATS YET ════════════════════╗

  📊  Play some matches first!

╚═══════════════════════════════════╝`
    );

    const bat  = calculateBatting(stats);
    const bowl = calculateBowling(stats);
    const name = ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name;

    ctx.reply(buildStatsCard(name, stats, bat, bowl));
  });


  /* ================= OTHER PLAYER STATS ================= */

  bot.command("stats", async (ctx) => {

    if (ctx.chat.type === "private")
      return ctx.reply("❌ Use this command in the group.");

    const parts = ctx.message.text.trim().split(/\s+/);
    if (parts.length < 2 || !parts[1].startsWith("@"))
      return ctx.reply(
`╔═ USAGE ═══════════════════════════╗

  /stats @username

╚═══════════════════════════════════╝`
      );

    const username = parts[1].replace("@", "").toLowerCase();
    const user     = await User.findOne({ username });

    if (!user) return ctx.reply(
`╔═ NOT FOUND ═══════════════════════╗

  ❌  User @${username} not found.

╚═══════════════════════════════════╝`
    );

    const stats = await PlayerStats.findOne({ userId: user.telegramId });
    if (!stats) return ctx.reply(
`╔═ NO STATS YET ════════════════════╗

  📊  @${username} has no stats yet.

╚═══════════════════════════════════╝`
    );

    const bat  = calculateBatting(stats);
    const bowl = calculateBowling(stats);

    ctx.reply(buildStatsCard(`@${username}`, stats, bat, bowl));
  });

}

module.exports = registerStatsHandler;