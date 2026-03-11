
const { Markup } = require("telegraf");
const { getMatch, matches, playerActiveMatch } = require("../matchManager");

module.exports = function (bot, helpers) {

const { isHost } = helpers;

/* ================= CREATE TEAM ================= */

bot.command("createteam", (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can create teams.");

  match.teamA = [];
  match.teamB = [];
  match.captains = { A: null, B: null };

  match.phase = "join";

  ctx.reply(
    "🏏 Teams Created!\n\n" +
    "🔵 " + match.teamAName + " (A)\n" +
    "🔴 " + match.teamBName + " (B)\n\n" +
    "Players join using:\n" +
    "/joina\n" +
    "/joinb\n\n" +
    "⏳ Joining open for 1 minute"
  );

  setTimeout(() => {

    const m = matches.get(match.groupId);
    if (!m || m.phase !== "join") return;

    if (m.teamA.length < 2 || m.teamB.length < 2) {

      bot.telegram.sendMessage(
        m.groupId,
        "❌ Match cancelled.\n\n" +
        "Minimum players required: 2 per team\n\n" +
        "Team A: " + m.teamA.length + "\n" +
        "Team B: " + m.teamB.length
      );

      m.phase = "idle";
      return;
    }

    m.phase = "captain";

    bot.telegram.sendMessage(
      m.groupId,
      "🔒 Joining Closed!\n\n" +
      "Team A: " + m.teamA.length + "\n" +
      "Team B: " + m.teamB.length + "\n\n" +
      "Host use:\n/choosecap"
    );

  }, 60000);

});


/* ================= JOIN TEAM A ================= */

bot.command("joina", (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining closed.");

  if (playerActiveMatch.has(ctx.from.id))
    return ctx.reply("❌ You already joined another match.");

  if (ctx.from.id === match.host)
    return ctx.reply("❌ Host cannot join.");

  if (match.teamA.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ Already in Team A.");

  const name = ctx.from.first_name || "Player";

  const player = {
    id: ctx.from.id,
    name: name,
    mention: '<a href="tg://user?id=' + ctx.from.id + '">' + name + '</a>'
  };

  match.teamA.push(player);
  playerActiveMatch.set(ctx.from.id, match.groupId);

  ctx.reply(
    "✅ " + player.mention + " joined 🔵 " + match.teamAName + "\n\n" +
    "Team A: " + match.teamA.length + "\n" +
    "Team B: " + match.teamB.length,
    { parse_mode: "HTML" }
  );

});


/* ================= JOIN TEAM B ================= */

bot.command("joinb", (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining closed.");

  if (playerActiveMatch.has(ctx.from.id))
    return ctx.reply("❌ You already joined another match.");

  if (ctx.from.id === match.host)
    return ctx.reply("❌ Host cannot join.");

  if (match.teamB.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ Already in Team B.");

  const name = ctx.from.first_name || "Player";

  const player = {
    id: ctx.from.id,
    name: name,
    mention: '<a href="tg://user?id=' + ctx.from.id + '">' + name + '</a>'
  };

  match.teamB.push(player);
  playerActiveMatch.set(ctx.from.id, match.groupId);

  ctx.reply(
    "✅ " + player.mention + " joined 🔴 " + match.teamBName + "\n\n" +
    "Team A: " + match.teamA.length + "\n" +
    "Team B: " + match.teamB.length,
    { parse_mode: "HTML" }
  );

});


/* ================= CHANGE TEAM ================= */

bot.command("changeteam", (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can change teams.");

  if (match.phase !== "join")
    return ctx.reply("❌ Can only change during joining.");

  const args = ctx.message.text.split(" ");

  if (args.length !== 3)
    return ctx.reply("Usage:\n/changeteam A 1");

  const team = args[1].toUpperCase();
  const number = parseInt(args[2]);

  if (!["A", "B"].includes(team))
    return ctx.reply("Team must be A or B.");

  const fromTeam = team === "A" ? match.teamA : match.teamB;
  const toTeam = team === "A" ? match.teamB : match.teamA;
  const target = team === "A" ? "B" : "A";

  if (number < 1 || number > fromTeam.length)
    return ctx.reply("Invalid player number.");

  const player = fromTeam[number - 1];

  match.pendingTeamChange = {
    player,
    fromTeam,
    toTeam,
    target
  };

  ctx.reply(
    "⚠️ Move " + player.mention + "\n\n" +
    "Team " + team + " → Team " + target + "?",
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Confirm", "confirm_team_change"),
          Markup.button.callback("❌ Cancel", "cancel_team_change")
        ]
      ])
    }
  );

});


/* ================= CONFIRM TEAM CHANGE ================= */

bot.action("confirm_team_change", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (!isHost(match, ctx.from.id))
    return ctx.answerCbQuery("Only host.");

  const change = match.pendingTeamChange;
  if (!change)
    return ctx.answerCbQuery("Expired.");

  const { player, fromTeam, toTeam, target } = change;

  const index = fromTeam.findIndex(p => p.id === player.id);
  if (index !== -1) fromTeam.splice(index, 1);

  toTeam.push(player);

  match.pendingTeamChange = null;

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  await ctx.reply(
    "✅ " + player.mention + " moved to Team " + target,
    { parse_mode: "HTML" }
  );

});


/* ================= CANCEL TEAM CHANGE ================= */

bot.action("cancel_team_change", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (!isHost(match, ctx.from.id))
    return ctx.answerCbQuery("Only host.");

  match.pendingTeamChange = null;

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  ctx.answerCbQuery("Cancelled");

});

};
