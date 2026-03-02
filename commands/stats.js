const PlayerStats = require("../models/PlayerStats");
const User = require("../models/User");
const {
  calculateBatting,
  calculateBowling
} = require("../utils/statsCalculator");

module.exports = (bot) => {

  /* ================= MY STATS ================= */

  bot.command("mystats", async (ctx) => {

    if (ctx.chat.type !== "private")
      return ctx.reply("❌ Use this in private chat.");

    const stats = await PlayerStats.findOne({
      telegramId: String(ctx.from.id)   // ✅ FIXED
    });

    if (!stats)
      return ctx.reply("📊 No stats found yet.");

    const bat = calculateBatting(stats);
    const bowl = calculateBowling(stats);

    return ctx.reply(`
📊 YOUR CAREER STATS

👤 ${ctx.from.first_name}
🆔 ${ctx.from.id}
📅 Joined: ${stats.createdAt ? stats.createdAt.toDateString() : "N/A"}

━━━━━━━━━━━━━━
🏏 BATTING

Matches: ${stats.matches}
Innings: ${stats.inningsBatting}

Runs/Balls: ${stats.runs}/${stats.ballsFaced}
Avg/SR: ${bat.average} / ${bat.strikeRate}

4s/6s/5s: ${stats.fours}/${stats.sixes}/${stats.fives}
Ducks: ${stats.ducks}
50s/100s: ${stats.fifties}/${stats.hundreds}
Best: ${stats.bestScore}

━━━━━━━━━━━━━━
🎯 BOWLING

Innings: ${stats.inningsBowling}
Wickets: ${stats.wickets}

Balls: ${stats.ballsBowled}
Runs: ${stats.runsConceded}

Econ/SR: ${bowl.economy} / ${bowl.strikeRate}
Avg: ${bowl.average}

Maidens: ${stats.maidens}
3w/5w: ${stats.threeW}/${stats.fiveW}
BBM: ${stats.bestBowlingWickets}/${stats.bestBowlingRuns}
`);
  });

  /* ================= PLAYER STATS ================= */

  bot.command("stats", async (ctx) => {

    const args = ctx.message.text.split(" ");

    if (args.length < 2 || !args[1].startsWith("@"))
      return ctx.reply("Usage: /stats @username");

    const username = args[1].replace("@", "").toLowerCase();

    const user = await User.findOne({ username });

    if (!user)
      return ctx.reply("User not found.");

    const stats = await PlayerStats.findOne({
      telegramId: String(user.telegramId)   // ✅ FIXED
    });

    if (!stats)
      return ctx.reply("No stats found.");

    const bat = calculateBatting(stats);
    const bowl = calculateBowling(stats);

    return ctx.reply(`
📊 PLAYER STATS

👤 @${username}

🏏 Runs: ${stats.runs}
🎯 Wickets: ${stats.wickets}

Avg: ${bat.average}
SR: ${bat.strikeRate}
Econ: ${bowl.economy}
`);
  });

};