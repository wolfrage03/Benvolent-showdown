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
`🟢 Lobby is open
──────────────
🔵 ${match.teamAName} /joina
🔴 ${match.teamBName} /joinb
──────────────
⏱ Closes in \`60s\` · /closejoin`
  );

  match.joinTimer = setTimeout(async () => {

    if (match.phase !== "join") return;
    match.phase = "teams_set";
    if (match.joinTimer) { clearTimeout(match.joinTimer); match.joinTimer = null; }

    await bot.telegram.sendMessage(
      match.groupId,
`🔒 Joining closed
──────────────
🔵 ${match.teamAName} · \`${match.teamA.length}p\`
🔴 ${match.teamBName} · \`${match.teamB.length}p\`
──────────────
👉 /choosecap to continue`
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
`🔒 Joining closed
──────────────
🔵 ${match.teamAName} · \`${match.teamA.length}p\`
🔴 ${match.teamBName} · \`${match.teamB.length}p\`
──────────────
👉 /choosecap to continue`
  );

});


/* ================= JOIN TEAM A ================= */

bot.command("joina", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining is closed.");

  if (playerActiveMatch.has(ctx.from.id))
    return ctx.reply("❌ You're already in a match.");

  if (ctx.from.id === match.host)
    return ctx.reply("❌ Host cannot join as player.");

  if (match.teamA.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ Already in Team A.");

  if (match.teamB.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ Already in Team B.");

  const name = ctx.from.first_name || "Player";

  match.teamA.push({
    id: ctx.from.id,
    name,
    mention: `<a href="tg://user?id=${ctx.from.id}">${name}</a>`
  });

  playerActiveMatch.set(ctx.from.id, match.groupId);

  await ctx.reply(`✅ ${name} joined 🔵 ${match.teamAName}`);

  await sendAndPinPlayerList(match, ctx.telegram);

});


/* ================= JOIN TEAM B ================= */

bot.command("joinb", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining is closed.");

  if (playerActiveMatch.has(ctx.from.id))
    return ctx.reply("❌ You're already in a match.");

  if (ctx.from.id === match.host)
    return ctx.reply("❌ Host cannot join as player.");

  if (match.teamB.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ Already in Team B.");

  if (match.teamA.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ Already in Team A.");

  const name = ctx.from.first_name || "Player";

  match.teamB.push({
    id: ctx.from.id,
    name,
    mention: `<a href="tg://user?id=${ctx.from.id}">${name}</a>`
  });

  playerActiveMatch.set(ctx.from.id, match.groupId);

  await ctx.reply(`✅ ${name} joined 🔴 ${match.teamBName}`);

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
`ℹ️ Usage
/add A @username
/add B 123456789
or reply to a message + /add A`
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
    if (isNaN(args[2])) return ctx.reply("❌ Invalid Telegram user ID.");
    userId  = Number(args[2]);
    name    = "Player";
    mention = `<a href="tg://user?id=${userId}">${name}</a>`;

  } else {
    return ctx.reply(
`ℹ️ Usage
/add A @username
/add B 123456789`
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
`✅ ${mention} added to Team \`${team}\``,
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
`ℹ️ Usage
/remove A1  or  /remove B2`
    );

  const arg  = args[1].toUpperCase();
  const team = arg[0];
  const num  = parseInt(arg.slice(1));

  if (!["A", "B"].includes(team) || isNaN(num))
    return ctx.reply("❌ Format: /remove A1 or /remove B2");

  const teamArr = team === "A" ? match.teamA : match.teamB;

  if (!teamArr || num < 1 || num > teamArr.length)
    return ctx.reply("⚠️ Player not found.");

  const removed = teamArr.splice(num - 1, 1)[0];
  playerActiveMatch.delete(removed.id);

  if (match.captains?.[team] === removed.id) match.captains[team] = null;
  if (Array.isArray(match.usedBatters))
    match.usedBatters = match.usedBatters.filter(id => id !== removed.id);

  await ctx.reply(`✖️ ${removed.name} removed from Team \`${team}\``);

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
    return ctx.reply("ℹ️ Usage: /changeteam A 1");

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
`🔄 Move ${player.mention}
Team \`${team}\` → Team \`${target}\``,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Confirm", "confirm_team_change"),
          Markup.button.callback("✖️ Cancel",  "cancel_team_change")
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
`✅ ${player.mention} moved to Team \`${target}\``,
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