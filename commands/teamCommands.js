const { Markup } = require("telegraf");
const { getMatch, matches, playerActiveMatch } = require("../matchManager");
const User = require("../User");
const { sendAndPinPlayerList } = require("./captainCommands");

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
`🟢 <b>LOBBY OPEN</b>
───────────────────────
🔵 <b>${match.teamAName}</b>  →  /joina
🔴 <b>${match.teamBName}</b>  →  /joinb
───────────────────────
⏱ Open for 60 seconds
/closejoin to close early`,
    { parse_mode: "HTML" }
  );

  match.joinTimer = setTimeout(async () => {

    if (match.phase !== "join") return;
    match.phase = "teams_set";
    if (match.joinTimer) { clearTimeout(match.joinTimer); match.joinTimer = null; }

    await bot.telegram.sendMessage(
      match.groupId,
`🔒 <b>JOINING CLOSED</b>
───────────────────────
🔵 <b>${match.teamAName}</b>  ·  ${match.teamA.length} player${match.teamA.length !== 1 ? "s" : ""}
🔴 <b>${match.teamBName}</b>  ·  ${match.teamB.length} player${match.teamB.length !== 1 ? "s" : ""}
───────────────────────
/choosecap to continue`,
      { parse_mode: "HTML" }
    );

  }, 60000);

});


/* ================= CLOSE JOIN EARLY ================= */

bot.command("closejoin", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can close joining.");

  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining is not open.");

  if (match.joinTimer) { clearTimeout(match.joinTimer); match.joinTimer = null; }

  match.phase = "teams_set";

  await ctx.reply(
`🔒 <b>JOINING CLOSED</b>
───────────────────────
🔵 <b>${match.teamAName}</b>  ·  ${match.teamA.length} player${match.teamA.length !== 1 ? "s" : ""}
🔴 <b>${match.teamBName}</b>  ·  ${match.teamB.length} player${match.teamB.length !== 1 ? "s" : ""}
───────────────────────
/choosecap to continue`,
    { parse_mode: "HTML" }
  );

});


/* ================= JOIN TEAM A ================= */

bot.command("joina", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining is closed.");

  if (playerActiveMatch.has(ctx.from.id))
    return ctx.reply("❌ You are already in a match.");

  if (ctx.from.id === match.host)
    return ctx.reply("❌ Host cannot join as player.");

  if (match.teamA.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ You already joined Team A.");

  if (match.teamB.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ You are already in Team B.");

  const name = ctx.from.first_name || "Player";

  match.teamA.push({
    id: ctx.from.id,
    name,
    mention: `<a href="tg://user?id=${ctx.from.id}">${name}</a>`
  });

  playerActiveMatch.set(ctx.from.id, match.groupId);

  await ctx.reply(
`✅ <b>${name}</b> joined 🔵 <b>${match.teamAName}</b>`,
    { parse_mode: "HTML" }
  );

  await sendAndPinPlayerList(match, ctx.telegram);

});


/* ================= JOIN TEAM B ================= */

bot.command("joinb", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining is closed.");

  if (playerActiveMatch.has(ctx.from.id))
    return ctx.reply("❌ You are already in a match.");

  if (ctx.from.id === match.host)
    return ctx.reply("❌ Host cannot join as player.");

  if (match.teamB.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ You already joined Team B.");

  if (match.teamA.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ You are already in Team A.");

  const name = ctx.from.first_name || "Player";

  match.teamB.push({
    id: ctx.from.id,
    name,
    mention: `<a href="tg://user?id=${ctx.from.id}">${name}</a>`
  });

  playerActiveMatch.set(ctx.from.id, match.groupId);

  await ctx.reply(
`✅ <b>${name}</b> joined 🔴 <b>${match.teamBName}</b>`,
    { parse_mode: "HTML" }
  );

  await sendAndPinPlayerList(match, ctx.telegram);

});


/* ================= MANUAL ADD PLAYER ================= */

bot.command("add", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can add players.");

  const args = ctx.message.text.trim().split(/\s+/);

  if (args.length < 2)
    return ctx.reply(
`ℹ️ <b>Usage</b>
/add A @username
/add B 123456789
<i>Or reply to a message + /add A</i>`,
      { parse_mode: "HTML" }
    );

  const team = args[1].toUpperCase();

  if (!["A", "B"].includes(team))
    return ctx.reply("❌ Team must be A or B.");

  let userId, name, mention;

  if (ctx.message.reply_to_message) {
    const user = ctx.message.reply_to_message.from;
    if (user.is_bot) return ctx.reply("❌ Cannot add a bot.");
    userId  = user.id;
    name    = user.first_name || "Player";
    mention = `<a href="tg://user?id=${userId}">${name}</a>`;

  } else if (args[2] && args[2].startsWith("@")) {
    const username = args[2].replace("@", "");
    const user = await User.findOne({ username });
    if (!user) return ctx.reply("❌ User not found in database.");
    userId  = user.telegramId;
    name    = user.name || username;
    mention = `<a href="tg://user?id=${userId}">${name}</a>`;

  } else if (args[2]) {
    if (isNaN(args[2])) return ctx.reply("❌ Must provide a valid Telegram user ID.");
    userId  = Number(args[2]);
    name    = "Player";
    mention = `<a href="tg://user?id=${userId}">${name}</a>`;

  } else {
    return ctx.reply(
`ℹ️ <b>Usage</b>
/add A @username
/add B 123456789`,
      { parse_mode: "HTML" }
    );
  }

  if (userId === match.host)
    return ctx.reply("❌ Host cannot be added as a player.");

  if (match.teamA.some(p => p.id === userId) || match.teamB.some(p => p.id === userId))
    return ctx.reply("⚠️ Player already in a team.");

  if (team === "A") match.teamA.push({ id: userId, name, mention });
  else              match.teamB.push({ id: userId, name, mention });

  playerActiveMatch.set(userId, match.groupId);

  await ctx.reply(
`✅ ${mention} added to 📍 <b>Team ${team}</b>`,
    { parse_mode: "HTML" }
  );

  await sendAndPinPlayerList(match, ctx.telegram);

});


/* ================= REMOVE PLAYER ================= */

bot.command("remove", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can remove players.");

  const args = ctx.message.text.trim().split(/\s+/);

  if (args.length < 2)
    return ctx.reply(
`ℹ️ <b>Usage</b>
/remove A1
/remove B2`,
      { parse_mode: "HTML" }
    );

  const arg  = args[1].toUpperCase();
  const team = arg[0];
  const num  = parseInt(arg.slice(1));

  if (!["A", "B"].includes(team) || isNaN(num))
    return ctx.reply("❌ Invalid format. Use /remove A1 or /remove B2");

  const teamArr = team === "A" ? match.teamA : match.teamB;

  if (!teamArr || num < 1 || num > teamArr.length)
    return ctx.reply("⚠️ Player not found.");

  const removed = teamArr.splice(num - 1, 1)[0];
  playerActiveMatch.delete(removed.id);

  if (match.captains?.[team] === removed.id) match.captains[team] = null;
  if (Array.isArray(match.usedBatters))
    match.usedBatters = match.usedBatters.filter(id => id !== removed.id);

  await ctx.reply(`✖️ <b>${removed.name}</b> removed from Team ${team}`, { parse_mode: "HTML" });

  await sendAndPinPlayerList(match, ctx.telegram);

});


/* ================= CHANGE TEAM ================= */

bot.command("changeteam", (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can move players.");

  if (match.phase !== "join")
    return ctx.reply("❌ Can only move players during joining.");

  const args = ctx.message.text.split(" ");

  if (args.length !== 3)
    return ctx.reply("Usage: /changeteam A 1");

  const team   = args[1].toUpperCase();
  const number = parseInt(args[2]);

  if (!["A", "B"].includes(team))
    return ctx.reply("❌ Team must be A or B.");

  const fromTeam = team === "A" ? match.teamA : match.teamB;
  const toTeam   = team === "A" ? match.teamB : match.teamA;
  const target   = team === "A" ? "B" : "A";

  if (number < 1 || number > fromTeam.length)
    return ctx.reply("⚠️ Invalid player number.");

  const player = fromTeam[number - 1];
  match.pendingTeamChange = { player, fromTeam, toTeam, target };

  ctx.reply(
`🔄 <b>Move Player</b>
───────────────────────
${player.mention}
Team ${team}  →  Team ${target}
───────────────────────`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("✅  Confirm", "confirm_team_change"),
          Markup.button.callback("❌  Cancel",  "cancel_team_change")
        ]
      ])
    }
  );

});


/* ================= CONFIRM TEAM CHANGE ================= */

bot.action("confirm_team_change", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  const change = match.pendingTeamChange;
  if (!change) return;

  const { player, fromTeam, toTeam, target } = change;

  const index = fromTeam.findIndex(p => p.id === player.id);
  if (index !== -1) fromTeam.splice(index, 1);

  toTeam.push(player);
  match.pendingTeamChange = null;

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  await ctx.reply(
`✅ ${player.mention} moved to <b>Team ${target}</b>`,
    { parse_mode: "HTML" }
  );

  await sendAndPinPlayerList(match, ctx.telegram);

});


/* ================= CANCEL TEAM CHANGE ================= */

bot.action("cancel_team_change", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  match.pendingTeamChange = null;
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  ctx.answerCbQuery("Cancelled.");

});

};