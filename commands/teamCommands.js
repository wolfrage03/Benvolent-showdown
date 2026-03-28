const { Markup } = require("telegraf");
const { getMatch, matches, playerActiveMatch } = require("../matchManager");
const User = require("../User");
const { sendAndPinPlayerList } = require("./captainCommands");
const box = require("../utils/boxMessage");

module.exports = function (bot, helpers) {

const { isHost, isUserBanned } = helpers;


/* ================= CREATE TEAM ================= */

bot.command("createteam", (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (match.matchEnded || match.phase === "idle")
    return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can create teams.");

  if (!match.teamA) match.teamA = [];
  if (!match.teamB) match.teamB = [];
  if (!match.captains) match.captains = { A: null, B: null };

  match.phase = "join";

  ctx.reply(
`🟢 Lobby Open\n\n<blockquote>🔵 ${match.teamAName} 〔Team A〕\n🔴 ${match.teamBName} 〔Team B〕</blockquote>\n\n/joina  /joinb\n⏱ Closes in 60s   /closejoin`,
    { parse_mode: "HTML" }
  );

  match.joinTimer = setTimeout(async () => {

    if (match.phase !== "join") return;
    match.phase = "teams_set";
    if (match.joinTimer) { clearTimeout(match.joinTimer); match.joinTimer = null; }

    await bot.telegram.sendMessage(
      match.groupId,
`🔒 Joining Closed\n\n<blockquote>🔵 ${match.teamAName} 〔Team A〕  ${match.teamA.length}p\n🔴 ${match.teamBName} 〔Team B〕  ${match.teamB.length}p</blockquote>\n\n👉 /choosecap to continue`,
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
`🔒 Joining Closed\n\n<blockquote>🔵 ${match.teamAName} 〔Team A〕  ${match.teamA.length}p\n🔴 ${match.teamBName} 〔Team B〕  ${match.teamB.length}p</blockquote>\n\n👉 /choosecap to continue`,
      { parse_mode: "HTML" }
  );

});


/* ================= JOIN TEAM A ================= */

bot.command("joina", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining is closed.");

  const dbUser = await User.collection.findOne({ telegramId: String(ctx.from.id) });
  if (dbUser?.banned === true) return ctx.reply("🚫 You are banned from this bot.");

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

  await ctx.reply(`✅ ${name} joined 🔵 〔Team A〕 ${match.teamAName}`);

  await sendAndPinPlayerList(match, ctx.telegram);

});


/* ================= JOIN TEAM B ================= */

bot.command("joinb", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining is closed.");

  const dbUser = await User.collection.findOne({ telegramId: String(ctx.from.id) });
  if (dbUser?.banned === true) return ctx.reply("🚫 You are banned from this bot.");

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

  await ctx.reply(`✅ ${name} joined 🔴 〔Team B〕 ${match.teamBName}`);

  await sendAndPinPlayerList(match, ctx.telegram);

});


/* ================= MANUAL ADD PLAYER ================= */

bot.command("add", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (match.matchEnded || match.phase === "idle")
    return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can add players.");

  const args = ctx.message.text.trim().split(/\s+/);

  if (args.length < 2)
    return ctx.reply(
`ℹ️ Usage
/add A @user1 @user2 @user3
/add B 123456 789012
or reply to a message + /add A`
    );

  const team = args[1].toUpperCase();

  if (!["A", "B"].includes(team))
    return ctx.reply("❌ Team must be A or B.");

  /* ── REPLY METHOD ── */
  if (ctx.message.reply_to_message) {
    const user = ctx.message.reply_to_message.from;
    if (user.is_bot) return ctx.reply("❌ Cannot add a bot.");

    const userId  = user.id;
    const name    = user.first_name || user.username || "Player";
    const mention = `<a href="tg://user?id=${userId}">${name}</a>`;

    if (userId === match.host)
      return ctx.reply("❌ Host cannot be added as a player.");
    if (match.teamA.some(p => p.id === userId) || match.teamB.some(p => p.id === userId))
      return ctx.reply("⚠️ Player already in a team.");

    if (team === "A") match.teamA.push({ id: userId, name, mention });
    else              match.teamB.push({ id: userId, name, mention });
    playerActiveMatch.set(userId, match.groupId);

    const matchInProgress = ["set_striker","set_non_striker","set_bowler","play","new_batter"].includes(match.phase);
    if (matchInProgress) {
      const battingTeamArr = match.battingTeam === "A" ? match.teamA : match.teamB;
      match.maxWickets = battingTeamArr.length - 1;
    }

    await ctx.reply(`✅ ${mention} added to 〔<b>Team ${team}</b>〕`, { parse_mode: "HTML" });
    await sendAndPinPlayerList(match, ctx.telegram);
    return;
  }

  /* ── MULTI-USER METHOD (@username or user ID, multiple allowed) ── */
  const targets = args.slice(2);
  if (!targets.length)
    return ctx.reply(
`ℹ️ Usage
/add A @user1 @user2
/add B 123456 789012`
    );

  const added   = [];
  const skipped = [];

  for (const raw of targets) {
    let userId, name, mention;

    if (raw.startsWith("@")) {
      // @username — look up in DB (user must have /start-ed the bot)
      const username = raw.replace("@", "").toLowerCase().trim();
      const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } });
      if (!user) {
        skipped.push(`@${username} (not found — needs to /start bot in DM)`);
        continue;
      }
      userId  = Number(user.telegramId);
      name    = user.firstName
        ? (user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName)
        : (user.username || username);
      mention = `<a href="tg://user?id=${userId}">${name}</a>`;

    } else if (/^\d+$/.test(raw)) {
      // Numeric user ID — try DB first, then fetch live from Telegram
      userId = Number(raw);
      const dbUser = await User.findOne({ telegramId: String(userId) });
      if (dbUser) {
        // Known user — use stored name
        name = dbUser.firstName
          ? (dbUser.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : dbUser.firstName)
          : (dbUser.username || `User_${userId}`);
      } else {
        // Not in DB — ask Telegram directly for their name
        try {
          const chat = await bot.telegram.getChat(userId);
          name = chat.first_name
            ? (chat.last_name ? `${chat.first_name} ${chat.last_name}` : chat.first_name)
            : (chat.username || `User_${userId}`);
        } catch (e) {
          // Telegram can't resolve — user has never interacted with the bot
          name = `User_${userId}`;
        }
      }
      mention = `<a href="tg://user?id=${userId}">${name}</a>`;

    } else {
      skipped.push(`${raw} (invalid — use @username or numeric user ID)`);
      continue;
    }

    if (userId === match.host) {
      skipped.push(`${name} (host cannot be a player)`);
      continue;
    }
    if (match.teamA.some(p => p.id === userId) || match.teamB.some(p => p.id === userId)) {
      skipped.push(`${name} (already in a team)`);
      continue;
    }

    if (team === "A") match.teamA.push({ id: userId, name, mention });
    else              match.teamB.push({ id: userId, name, mention });
    playerActiveMatch.set(userId, match.groupId);
    added.push(mention);
  }

  // Recalculate maxWickets if match in progress
  const matchInProgress = ["set_striker","set_non_striker","set_bowler","play","new_batter"].includes(match.phase);
  if (matchInProgress && added.length) {
    const battingTeamArr = match.battingTeam === "A" ? match.teamA : match.teamB;
    match.maxWickets = battingTeamArr.length - 1;
  }

  const lines = [];
  if (added.length)
    lines.push(`✅ Added to 〔<b>Team ${team}</b>〕\n${added.join("\n")}`);
  if (skipped.length)
    lines.push(`⚠️ Skipped:\n${skipped.map(s => `• ${s}`).join("\n")}`);

  await ctx.reply(lines.join("\n\n"), { parse_mode: "HTML" });

  if (added.length) await sendAndPinPlayerList(match, ctx.telegram);

});


/* ================= REMOVE PLAYER ================= */

bot.command("remove", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (match.matchEnded || match.phase === "idle")
    return ctx.reply("⚠️ No active match.");

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

  const teamArr   = team === "A" ? match.teamA : match.teamB;
  const captainId = match.captains?.[team];

  const orderedArr = [
    ...teamArr.filter(p => p.id === captainId),
    ...teamArr.filter(p => p.id !== captainId)
  ];

  if (!orderedArr || num < 1 || num > orderedArr.length)
    return ctx.reply("⚠️ Player not found.");

  const removed = orderedArr[num - 1];

  const realIndex = teamArr.findIndex(p => p.id === removed.id);
  if (realIndex !== -1) teamArr.splice(realIndex, 1);

  playerActiveMatch.delete(removed.id);

  if (match.captains?.[team] === removed.id) match.captains[team] = null;
  if (Array.isArray(match.usedBatters))
    match.usedBatters = match.usedBatters.filter(id => id !== removed.id);

  const matchInProgress = [
    "set_striker", "set_non_striker", "set_bowler",
    "play", "new_batter"
  ].includes(match.phase);

  if (matchInProgress) {
    const battingTeamArr = match.battingTeam === "A" ? match.teamA : match.teamB;
    match.maxWickets = battingTeamArr.length - 1;
  }

  match.playerListMessageId = null;

  await ctx.reply(`✖️ ${removed.name} removed from 〔Team ${team}〕`);

  await sendAndPinPlayerList(match, ctx.telegram);

});


/* ================= CHANGE TEAM ================= */

bot.command("changeteam", (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (match.matchEnded || match.phase === "idle")
    return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can move players.");

  const allowedPhases = [
    "join", "teams_set", "captain", "toss",
    "batbowl", "setovers", "set_striker", "set_non_striker"
  ];

  if (!allowedPhases.includes(match.phase))
    return ctx.reply("❌ Cannot move players after batting has started.");

  const args = ctx.message.text.split(" ");

  if (args.length !== 3)
    return ctx.reply("ℹ️ Usage: /changeteam A 1");

  const team   = args[1].toUpperCase();
  const number = parseInt(args[2]);

  if (!["A", "B"].includes(team))
    return ctx.reply("❌ Team must be A or B.");

  const teamArr   = team === "A" ? match.teamA : match.teamB;
  const toTeam    = team === "A" ? match.teamB : match.teamA;
  const target    = team === "A" ? "B" : "A";
  const captainId = match.captains?.[team];

  const orderedArr = [
    ...teamArr.filter(p => p.id === captainId),
    ...teamArr.filter(p => p.id !== captainId)
  ];

  if (number < 1 || number > orderedArr.length)
    return ctx.reply("⚠️ Invalid player number.");

  const player = orderedArr[number - 1];

  match.pendingTeamChange = { player, fromTeam: teamArr, toTeam, target };

  ctx.reply(
box("🔄 Move Player?", `${player.mention}`, `〔Team ${team}〕 → 〔Team ${target}〕`),
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
`✅ ${player.mention} moved to 〔<b>Team ${target}</b>〕`,
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