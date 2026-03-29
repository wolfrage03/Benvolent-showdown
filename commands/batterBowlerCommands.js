const { getMatch, playerActiveMatch } = require("../matchManager");
const { sendAndPinPlayerList } = require("./captainCommands");
const ballHandler = require("../utils/ballHandler");

module.exports = function (bot, helpers) {

  const { isHost, getName } = helpers;

  function orderedBattingPlayers(match) {
    if (!match) return [];
    const players = match.battingTeam === "A" ? match.teamA : match.teamB;
    const captainId = match.battingTeam === "A" ? match.captains.A : match.captains.B;
    return [
      ...players.filter(p => p.id === captainId),
      ...players.filter(p => p.id !== captainId)
    ];
  }

  function bowlingPlayers(match) {
    return match.bowlingTeam === "A" ? match.teamA : match.teamB;
  }


  /* ================= SET BATTER ================= */

  bot.command("batter", async (ctx) => {

    const match = getMatch(ctx);
    if (!match) return;
    if (!isHost(match, ctx.from.id)) return;

    if (ctx.chat.id !== match.groupId)
      return ctx.reply("⚠️ Send batter number in GROUP only.");

    // Delete the command message
    try { await ctx.deleteMessage(); } catch {}

    const args = ctx.message.text.trim().split(/\s+/);
    const num = parseInt(args[1], 10);
    const players = orderedBattingPlayers(match);

    if (isNaN(num)) return ctx.reply("❌ Usage: /batter 2");
    if (num < 1 || num > players.length)
      return ctx.reply(`❌ Choose between 1 and ${players.length}`);

    const selected = players[num - 1];
    if (!selected) return ctx.reply("⚠️ Player not found");

    if (match.usedBatters.includes(selected.id))
      return ctx.reply("⚠️ Player already batted / dismissed");

    const name = selected.name;
    const orderNumber = match.usedBatters.length + 1;

    const ordinal = (n) => {
      const s = ["th","st","nd","rd"];
      const v = n % 100;
      return n + (s[(v-20)%10] || s[v] || s[0]);
    };

    /* STRIKER */
    if (match.phase === "set_striker") {

      if (match.maxWickets == null) {
        match.maxWickets =
          (match.battingTeam === "A" ? match.teamA.length : match.teamB.length) - 1;
      }

      match.striker = selected.id;
      match.batterStats[selected.id] = { runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0 };

      if (!match.battingOrder.includes(selected.id))
        match.battingOrder.push(selected.id);

      match.usedBatters.push(selected.id);
      match.phase = "set_non_striker";

      await sendAndPinPlayerList(match, ctx.telegram);

      return ctx.reply(
`🏏 Striker Set\n\n<blockquote>🏏 ${name}   ${ordinal(orderNumber)} batter</blockquote>\n\n👉 /batter [number] set non-striker`,
        { parse_mode: "HTML" }
      );
    }

    /* NON STRIKER */
    if (match.phase === "set_non_striker") {

      if (selected.id === match.striker)
        return ctx.reply("⚠️ Choose a different player");

      match.nonStriker = selected.id;
      match.usedBatters.push(selected.id);
      match.phase = "set_bowler";
      await sendAndPinPlayerList(match, ctx.telegram);

      return ctx.reply(
`🪄 Non-Striker Set\n\n<blockquote>🪄 ${name}   ${ordinal(orderNumber)} batter</blockquote>\n\n👉 /bowler [number] set bowler`,
        { parse_mode: "HTML" }
      );
    }

    /* NEW BATTER */
    if (match.phase === "new_batter") {

      if (selected.id === match.nonStriker)
        return ctx.reply("⚠️ Choose a different player");

      match.striker = selected.id;
      match.batterStats[selected.id] = { runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0 };
      if (!match.battingOrder.includes(selected.id))
        match.battingOrder.push(selected.id);
      match.usedBatters.push(selected.id);
      await sendAndPinPlayerList(match, ctx.telegram);

      await ctx.reply(
`🏏 New Batter\n\n<blockquote>🏏 ${name}   ${ordinal(orderNumber)} batter</blockquote>`,
        { parse_mode: "HTML" }
      );

      if (match.bowler === null) {
        match.phase = "set_bowler";
        return ctx.reply(
`👉 /bowler [number] set bowler for new over`,
          { parse_mode: "HTML" }
        );
      }

      match.phase = "play";
      return ballHandler.startBall(match);
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

    // Delete the command message
    try { await ctx.deleteMessage(); } catch {}

    const num = parseInt(ctx.message.text.split(" ")[1]);
    if (isNaN(num)) return ctx.reply("❌ Usage: /bowler 2");

    const base = bowlingPlayers(match);
    const captainId = match.bowlingTeam === "A" ? match.captains.A : match.captains.B;
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
    match.phase = "play";
    playerActiveMatch.set(player.id, match.groupId);

    await ctx.reply(
`🏐 Bowler Set\n\n<blockquote>🏐 ${player.name} is bowling</blockquote>`,
      { parse_mode: "HTML" }
    );
    await ballHandler.startBall(match);
  });

};