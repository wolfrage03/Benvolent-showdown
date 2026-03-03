const PlayerStats = require("../models/PlayerStats");
const { calculateBatting, calculateBowling } = require("../utils/statsCalculator");
const User = require("../models/User"); // if you have a User model for usernames

module.exports = (bot) => {

  bot.command("mystats", async (ctx) => {
    if (ctx.chat.type !== "private")
      return ctx.reply("❌ Use this in private chat.");

    try {
      const stats = await PlayerStats.findOne({ userId: String(ctx.from.id) });
      if (!stats) return ctx.reply("📊 No stats found yet.");

      const bat = calculateBatting(stats);
      const bowl = calculateBowling(stats);

      ctx.reply(`
📊 YOUR CAREER STATS

👤 ${ctx.from.first_name}
🆔 ${ctx.from.id}
📅 Joined: ${stats.createdAt.toDateString()}

━━━━━━━━━━━━━━
🏏 BATTING

Matches: ${stats.matches}
Innings: ${stats.inningsBatting}

Runs/Balls: ${stats.runs}/${stats.balls}
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
    } catch (e) {
      console.error(e);
      ctx.reply("❌ Could not fetch stats. Try again later.");
    }
  });

  bot.command("stats", async (ctx) => {
    if (!ctx.message.text.includes("@"))
      return ctx.reply("Usage: /stats @username");

    const username = ctx.message.text.split(" ")[1].replace("@","").toLowerCase();

    try {
      const user = await User.findOne({ username });
      if (!user) return ctx.reply("User not found.");

      const stats = await PlayerStats.findOne({ userId: user.telegramId });
      if (!stats) return ctx.reply("No stats found.");

      const bat = calculateBatting(stats);
      const bowl = calculateBowling(stats);

      ctx.reply(`
📊 PLAYER STATS

👤 @${username}

🏏 ${stats.runs} runs
🎯 ${stats.wickets} wickets

Avg: ${bat.average}
SR: ${bat.strikeRate}
Econ: ${bowl.economy}
`);
    } catch(e) {
      console.error(e);
      ctx.reply("❌ Could not fetch stats. Try again later.");
    }
  });

};