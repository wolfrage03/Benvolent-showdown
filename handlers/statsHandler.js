// handlers/statsHandler.js

const PlayerStats = require("../models/PlayerStats");
const { calculateBatting, calculateBowling } = require("../utils/statsCalculator");

function formatStats(stats, name) {
  const bat = calculateBatting(stats);
  const bowl = calculateBowling(stats);

  const bestBat =
    stats.bestScore > 0 ? `${stats.bestScore}` : "—";

  const bestBowl =
    stats.bestBowlingWickets > 0
      ? `${stats.bestBowlingWickets}/${stats.bestBowlingRuns}`
      : "—";

  const winPct =
    stats.matches > 0
      ? ((stats.matchesWon / stats.matches) * 100).toFixed(0) + "%"
      : "0%";

  return [
    `📋 Stats — ${name}`,
    ``,
    `─── 🏆 General ───`,
    `Matches: ${stats.matches}   Won: ${stats.matchesWon}   Win%: ${winPct}`,
    `MOTM: ${stats.motm}`,
    ``,
    `─── 🏏 Batting ───`,
    `Innings: ${stats.inningsBatting}   Runs: ${stats.runs}   Balls: ${stats.balls}`,
    `Avg: ${bat.average}   SR: ${bat.strikeRate}`,
    `4s: ${stats.fours}   5s: ${stats.fives}   6s: ${stats.sixes}`,
    `50s: ${stats.fifties}   100s: ${stats.hundreds}   Ducks: ${stats.ducks}`,
    `Not Outs: ${stats.notOuts}   Best: ${bestBat}`,
    ``,
    `─── 🎾 Bowling ───`,
    `Innings: ${stats.inningsBowling}   Wickets: ${stats.wickets}`,
    `Balls: ${stats.ballsBowled}   Runs: ${stats.runsConceded}`,
    `Avg: ${bowl.average}   SR: ${bowl.strikeRate}   Econ: ${bowl.economy}`,
    `Maidens: ${stats.maidens}   3W: ${stats.threeW}   5W: ${stats.fiveW}`,
    `Best: ${bestBowl}`,
  ].join("\n");
}

function registerStatsHandler(bot) {

  /* /stats — group usage: /stats @username or reply */
  bot.command("stats", async (ctx) => {
    try {
      let targetId = null;
      let targetName = null;

      // Reply to a message
      if (ctx.message.reply_to_message) {
        const replyUser = ctx.message.reply_to_message.from;
        targetId   = replyUser.id;
        targetName =
          replyUser.first_name ||
          replyUser.username ||
          "Player";
      }
      // Mention in args
      else {
        const args = ctx.message.text.trim().split(/\s+/);
        if (args[1]) {
          // Try to parse user_id directly if numeric
          const maybeId = parseInt(args[1], 10);
          if (!isNaN(maybeId)) {
            targetId   = maybeId;
            targetName = String(maybeId);
          } else {
            return ctx.reply("⚠️ Reply to a user's message or use /stats [user_id]");
          }
        } else {
          // No arg — show own stats
          targetId   = ctx.from.id;
          targetName =
            ctx.from.first_name ||
            ctx.from.username ||
            "Player";
        }
      }

      const stats = await PlayerStats.findOne({ userId: String(targetId) });

      if (!stats) {
        return ctx.reply(`📋 No stats found for ${targetName}.`);
      }

      await ctx.reply(formatStats(stats, targetName));

    } catch (err) {
      console.error("stats command error:", err);
      await ctx.reply("⚠️ Could not fetch stats. Try again.");
    }
  });


  /* /mystats — always shows the sender's own stats */
  bot.command("mystats", async (ctx) => {
    try {
      const targetId   = ctx.from.id;
      const targetName =
        ctx.from.first_name ||
        ctx.from.username ||
        "Player";

      const stats = await PlayerStats.findOne({ userId: String(targetId) });

      if (!stats) {
        return ctx.reply("📋 You have no recorded stats yet. Play a match first!");
      }

      await ctx.reply(formatStats(stats, targetName));

    } catch (err) {
      console.error("mystats command error:", err);
      await ctx.reply("⚠️ Could not fetch your stats. Try again.");
    }
  });
}

module.exports = registerStatsHandler;