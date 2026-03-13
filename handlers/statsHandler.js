const PlayerStats = require("../models/PlayerStats");
const User = require("../User");
const { calculateBatting, calculateBowling } = require("../utils/statsCalculator");

function registerStatsHandler(bot) {

  /* ================= MY STATS ================= */

  bot.command("mystats", async (ctx) => {

    if (ctx.chat.type === "private")
      return ctx.reply("❌ Use this command in the group.");

    const stats = await PlayerStats.findOne({ userId: String(ctx.from.id) });

    if (!stats) return ctx.reply("📊 No stats found yet.");

    const bat  = calculateBatting(stats);
    const bowl = calculateBowling(stats);

    ctx.reply(
`[ CAREER STATS ]  ${ctx.from.first_name}

━━━━━━━━━━━━━━
🏏 BATTING

Matches       ${stats.matches}
Innings       ${stats.inningsBatting}
Runs / Balls  ${stats.runs} / ${stats.balls}
Avg / SR      ${bat.average} / ${bat.strikeRate}
4s / 6s / 5s  ${stats.fours} / ${stats.sixes} / ${stats.fives}
Ducks         ${stats.ducks}
50s / 100s    ${stats.fifties} / ${stats.hundreds}
Best          ${stats.bestScore}

━━━━━━━━━━━━━━
🎯 BOWLING

Innings       ${stats.inningsBowling}
Wickets       ${stats.wickets}
Balls         ${stats.ballsBowled}
Runs          ${stats.runsConceded}
Econ / SR     ${bowl.economy} / ${bowl.strikeRate}
Average       ${bowl.average}
Maidens       ${stats.maidens}
3w / 5w       ${stats.threeW} / ${stats.fiveW}
BBM           ${stats.bestBowlingWickets} / ${stats.bestBowlingRuns}`
    );
  });


  /* ================= OTHER PLAYER STATS ================= */

  bot.command("stats", async (ctx) => {

    if (ctx.chat.type === "private")
      return ctx.reply("❌ Use this command in the group.");

    const parts = ctx.message.text.trim().split(/\s+/);

    if (parts.length < 2 || !parts[1].startsWith("@"))
      return ctx.reply("Usage: /stats @username");

    const username = parts[1].replace("@", "").toLowerCase();
    const user     = await User.findOne({ username });

    if (!user) return ctx.reply("❌ User not found.");

    const stats = await PlayerStats.findOne({ userId: user.telegramId });

    if (!stats) return ctx.reply("📊 No stats found yet.");

    const bat  = calculateBatting(stats);
    const bowl = calculateBowling(stats);

    ctx.reply(
`[ CAREER STATS ]  @${username}

━━━━━━━━━━━━━━
🏏 BATTING

Matches       ${stats.matches}
Innings       ${stats.inningsBatting}
Runs / Balls  ${stats.runs} / ${stats.balls}
Avg / SR      ${bat.average} / ${bat.strikeRate}
4s / 6s / 5s  ${stats.fours} / ${stats.sixes} / ${stats.fives}
Ducks         ${stats.ducks}
50s / 100s    ${stats.fifties} / ${stats.hundreds}
Best          ${stats.bestScore}

━━━━━━━━━━━━━━
🎯 BOWLING

Innings       ${stats.inningsBowling}
Wickets       ${stats.wickets}
Balls         ${stats.ballsBowled}
Runs          ${stats.runsConceded}
Econ / SR     ${bowl.economy} / ${bowl.strikeRate}
Average       ${bowl.average}
Maidens       ${stats.maidens}
3w / 5w       ${stats.threeW} / ${stats.fiveW}
BBM           ${stats.bestBowlingWickets} / ${stats.bestBowlingRuns}`
    );
  });

}

module.exports = registerStatsHandler;