// commands/match.js

const PlayerStats = require("../models/PlayerStats");
const {
  calculateBattingStats,
  calculateBowlingStats,
  updateBestBowling,
} = require("../utils/statsCalculator");

/**
 * Handles match end and updates player stats
 * @param {String} playerId
 * @param {Object} matchData
 */
async function handleMatchEnd(playerId, matchData) {
  try {
    let player = await PlayerStats.findOne({ telegramId: playerId });

    if (!player) {
      player = new PlayerStats({
        telegramId: playerId,
        name: matchData.name || "Unknown"
      });
    }

    player.matches += 1;

    /* ---------------- BATTING ---------------- */

    if (matchData.balls > 0) {
      player.inningsBatting += 1;
    }

    player.runs += matchData.runs || 0;
    player.ballsFaced += matchData.balls || 0;

    if (matchData.wicketsLost) {
      player.wicketsLost += 1;
    } else {
      player.notOuts += 1;
    }

    if (matchData.runs === 0 && matchData.wicketsLost) {
      player.ducks += 1;
    }

    if (matchData.runs >= 50) player.fifties += 1;
    if (matchData.runs >= 100) player.hundreds += 1;

    if (matchData.runs > player.bestScore) {
      player.bestScore = matchData.runs;
    }

    /* ---------------- BOWLING ---------------- */

    if (matchData.ballsBowled > 0) {
      player.inningsBowling += 1;
    }

    player.wickets += matchData.wickets || 0;
    player.runsConceded += matchData.runsConceded || 0;
    player.ballsBowled += matchData.ballsBowled || 0;

    if (matchData.wickets >= 3) player.threeW += 1;
    if (matchData.wickets >= 5) player.fiveW += 1;

    updateBestBowling(
      player,
      matchData.wickets || 0,
      matchData.runsConceded || 0
    );

    await player.save();

    return {
      batting: calculateBattingStats(player),
      bowling: calculateBowlingStats(player),
      player,
    };

  } catch (error) {
    console.error("Match End Error:", error);
  }
}
module.exports = { handleMatchEnd };

const { 
  orderedBattingPlayers, 
  bowlingPlayers 
} = require("../utils/helpers");

const { getMatch, isHost } = require("../engine/matchManager");
const { startBall } = require("../engine/playEngine");

module.exports = (bot) => {

  /* ================= SET OVERS ================= */

  bot.command("setovers", (ctx) => {

    const match = getMatch(ctx);
    if (!match) return;

    if (!isHost(match, ctx.from.id))
      return ctx.reply("❌ Only host can set overs.");

    const overs = parseInt(ctx.message.text.split(" ")[1]);

    if (isNaN(overs) || overs < 1 || overs > 25)
      return ctx.reply("⚠️ Overs must be between 1 and 25.");

    match.totalOvers = overs;
    match.maxWickets =
      (match.battingTeam === "A" ? match.teamA.length : match.teamB.length) - 1;

    match.phase = "set_striker";

    return ctx.reply(
`✅ Overs set to ${overs}

Set STRIKER:
/batter number`
    );
  });

  /* ================= SET BATTER ================= */

  bot.command("batter", (ctx) => {

    const match = getMatch(ctx);
    if (!match) return;

    if (!isHost(match, ctx.from.id)) return;
    if (ctx.chat.id !== match.groupId)
      return ctx.reply("⚠️ Send batter number in GROUP only.");

    const num = parseInt(ctx.message.text.split(" ")[1]);
    if (!num) return ctx.reply("❌ Provide batter number");

    const players = orderedBattingPlayers(match);

    if (num < 1 || num > players.length)
      return ctx.reply("❌ Invalid number");

    const selected = players[num - 1];

    if (match.usedBatters.includes(selected.id))
      return ctx.reply("⚠️ Player already batted / dismissed");

    const orderNumber = match.usedBatters.length + 1;

    const ordinal = (n) => {
      const s = ["th","st","nd","rd"];
      const v = n % 100;
      return n + (s[(v-20)%10] || s[v] || s[0]);
    };

    /* STRIKER */
    if (match.phase === "set_striker") {

      match.striker = selected.id;
      match.batterStats[selected.id] = { runs: 0, balls: 0 };

      match.usedBatters.push(selected.id);
      match.phase = "set_non_striker";

      return ctx.reply(
`🏏 ${selected.name} is ${ordinal(orderNumber)} batter at STRIKER end

Now send NON-STRIKER:
/batter number`);
    }

    /* NON STRIKER */
    if (match.phase === "set_non_striker") {

      if (selected.id === match.striker)
        return ctx.reply("⚠️ Choose different player");

      match.nonStriker = selected.id;
      match.usedBatters.push(selected.id);
      match.maxWickets = players.length - 1;

      match.phase = "set_bowler";

      return ctx.reply(
`🏏 ${selected.name} is ${ordinal(orderNumber)} batter at NON-STRIKER end

🎯 Send bowler:
/bowler number`);
    }

    /* NEW BATTER */
    if (match.phase === "new_batter") {

      if (selected.id === match.nonStriker)
        return ctx.reply("⚠️ Choose different player");

      match.striker = selected.id;
      match.batterStats[selected.id] = { runs: 0, balls: 0 };

      match.usedBatters.push(selected.id);
      match.phase = "play";

      ctx.reply(`🏏 ${selected.name} is ${ordinal(orderNumber)} batter`);

      return startBall(match);
    }
  });

  /* ================= SET BOWLER ================= */

  bot.command("bowler", async (ctx) => {

    const match = getMatch(ctx);
    if (!match) return;

    if (match.phase !== "set_bowler")
      return ctx.reply("⚠️ You can set bowler only when bot asks.");

    if (ctx.chat.id !== match.groupId)
      return ctx.reply("⚠️ This match is not running here.");

    if (!isHost(match, ctx.from.id))
      return ctx.reply("❌ Only host can set bowler.");

    const num = parseInt(ctx.message.text.split(" ")[1]);
    if (!num) return ctx.reply("Invalid number");

    const base = bowlingPlayers(match);
    const captainId =
      match.bowlingTeam === "A"
        ? match.captains.A
        : match.captains.B;

    const players = [
      ...base.filter(p => p.id === captainId),
      ...base.filter(p => p.id !== captainId)
    ];

    if (num < 1 || num > players.length)
      return ctx.reply("⚠️ Invalid player number.");

    const player = players[num - 1];

    if (match.lastOverBowler === player.id)
      return ctx.reply("⚠️ Same bowler cannot bowl consecutive overs.");

    if (match.suspendedBowlers?.[player.id] >= match.currentOver)
      return ctx.reply("⚠️ This bowler is suspended for this over.");

    match.bowler = player.id;
    match.lastOverBowler = player.id;

    match.overHistory.push({
      over: match.currentOver + 1,
      bowler: match.bowler,
      balls: []
    });

    match.phase = "play";
    match.awaitingBat = false;
    match.awaitingBowl = true;

    await ctx.reply(
`🎯 Bowler Selected: ${player.name}

Ball starting...`
    );

    startBall(match);
  });

};