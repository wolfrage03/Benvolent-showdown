
const { Markup } = require("telegraf");
const { getMatch, matches, playerActiveMatch } = require("../matchManager");
const User = require("../User"); // because your User model is in main folder

module.exports = function (bot, helpers) {

const { isHost } = helpers;


/* ================= CREATE TEAM ================= */

bot.command("createteam", (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can create teams.");

  if (match.phase === "join")
    return ctx.reply("⚠️ Joining already in progress.");

  if (!["team_create", "captain", "join"].includes(match.phase))
    return ctx.reply("⚠️ Cannot create teams at this stage.");

  if (!match.teamA) match.teamA = [];
  if (!match.teamB) match.teamB = [];
  if (!match.captains) match.captains = { A: null, B: null };

  match.phase = "join";

  ctx.reply(
`🏏 Teams Selected!

🔵 ${match.teamAName} (A)
🔴 ${match.teamBName} (B)

✅ Joining Open!

Players join using:
👉 /joina
👉 /joinb

⏳ Joining open for 1 minute`
  );

  setTimeout(() => {

    const m = matches.get(match.groupId);
    if (!m || m.phase !== "join") return;

    if (m.teamA.length === 0 || m.teamB.length === 0) {

      m.phase = "idle";

      bot.telegram.sendMessage(
        m.groupId,
        "❌ Match cancelled — not enough players."
      );

      return;
    }

    m.phase = "captain";

    bot.telegram.sendMessage(
      m.groupId,
`🔒 Joining Closed!

Team A: ${m.teamA.length}
Team B: ${m.teamB.length}

Host use /choosecap`
    );

  }, 60000);
});


/* ================= JOIN TEAM A ================= */

bot.command("joina", ctx => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (playerActiveMatch.has(ctx.from.id))
    return ctx.reply("❌ You are already playing another match.");

  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining is not open.");

  if (ctx.from.id === match.host)
    return ctx.reply("❌ Host cannot join any team.");

  if (match.teamA.length >= 11)
    return ctx.reply("⚠️ Team A is full.");

  if (match.teamA.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ You are already in Team A.");

  if (match.teamB.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ You are already in Team B.");

  const player = {
    id: ctx.from.id,
    name: ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "Player"
  };

  match.teamA.push(player);
  playerActiveMatch.set(ctx.from.id, match.groupId);

  ctx.reply(`✅ ${player.name} joined 🔵 ${match.teamAName}`);
});


/* ================= JOIN TEAM B ================= */

bot.command("joinb", ctx => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (playerActiveMatch.has(ctx.from.id))
    return ctx.reply("❌ You are already playing another match.");

  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining is not open.");

  if (ctx.from.id === match.host)
    return ctx.reply("❌ Host cannot join any team.");

  if (match.teamB.length >= 11)
    return ctx.reply("⚠️ Team B is full.");

  if (match.teamB.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ You are already in Team B.");

  if (match.teamA.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ You are already in Team A.");

  const player = {
    id: ctx.from.id,
    name: ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "Player"
  };

  match.teamB.push(player);
  playerActiveMatch.set(ctx.from.id, match.groupId);

  ctx.reply(`✅ ${player.name} joined 🔴 ${match.teamBName}`);
});

/* ================= MANUAL ADD PLAYER ================= */

bot.command("add", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can add players.");

  const args = ctx.message.text.trim().split(/\s+/);

  if (args.length < 2)
    return ctx.reply("Usage:\n/add A @username\n/add B userID\nReply + /add A");

  const team = args[1].toUpperCase();

  if (!["A","B"].includes(team))
    return ctx.reply("❌ Team must be A or B.");

  let userId;
  let name;

  /* ===== REPLY METHOD ===== */

  if (ctx.message.reply_to_message) {

    const repliedUser = ctx.message.reply_to_message.from;

    if (repliedUser.is_bot)
      return ctx.reply("❌ Cannot add bot.");

    userId = repliedUser.id;
    name = repliedUser.username
      ? `@${repliedUser.username}`
      : repliedUser.first_name;

  }

  /* ===== USERNAME / ID METHOD ===== */

  else {

    if (args.length < 3)
      return ctx.reply("Usage:\n/add A @username\n/add B userID");

    const input = args[2];

    if (input.startsWith("@")) {

      const username = input.replace("@","").toLowerCase();

      const user = await User.findOne({ username });

      if (!user)
         return ctx.reply("❌ User not found. Ask them to start bot in DM.");

      userId = Number(user.telegramId);

      name = user.firstName
        ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
        : `@${username}`;

    }
    else if (!isNaN(input)) {

      userId = Number(input);
      name = `User_${input}`;

    }
    else {
      return ctx.reply("❌ Invalid format.");
    }

  }

  if (
    match.teamA.some(p => p.id === userId) ||
    match.teamB.some(p => p.id === userId)
  )
    return ctx.reply("⚠️ Player already added.");

  const player = { id:userId, name };

  if (team === "A") match.teamA.push(player);
  else match.teamB.push(player);

  ctx.reply(`✅ ${name} added to Team ${team}`);

});


/* ================= REMOVE PLAYER ================= */

bot.command("remove", (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can remove players.");

  const args = ctx.message.text.trim().split(/\s+/);

  if (args.length < 2)
    return ctx.reply("Usage: /remove A1 or B2");

  const arg = args[1];

  const team = arg[0]?.toUpperCase();
  const num = parseInt(arg.slice(1));

  if (!["A","B"].includes(team) || isNaN(num))
    return ctx.reply("Invalid format. Use A1 or B2");

  const teamArr = team === "A" ? match.teamA : match.teamB;

  if (num < 1 || num > teamArr.length)
    return ctx.reply("Player slot not found.");

  const removed = teamArr.splice(num - 1, 1)[0];

  if (match.captains?.[team] === removed.id)
    match.captains[team] = null;

  ctx.reply(`🚫 ${removed.name} removed from Team ${team}`);

});

/* ================= CHANGE TEAM ================= */

bot.command("changeteam", (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can change teams.");

  if (match.phase === "play" || match.striker !== null)
    return ctx.reply("❌ Cannot change teams after match started.");

  const args = ctx.message.text.trim().split(/\s+/);

  if (args.length !== 3)
    return ctx.reply("Usage: /changeteam A 1");

  const sourceTeam = args[1].toUpperCase();
  const playerNumber = parseInt(args[2]);

  if (!["A", "B"].includes(sourceTeam))
    return ctx.reply("Team must be A or B.");

  const fromTeam = sourceTeam === "A" ? match.teamA : match.teamB;
  const toTeam   = sourceTeam === "A" ? match.teamB : match.teamA;
  const targetTeam = sourceTeam === "A" ? "B" : "A";

  if (playerNumber < 1 || playerNumber > fromTeam.length)
    return ctx.reply("Invalid player number.");

  const player = fromTeam[playerNumber - 1];

  if (player.id === match.captains?.A || player.id === match.captains?.B)
    return ctx.reply("❌ Captain cannot be moved.");

  match.pendingTeamChange = {
    player,
    fromTeam,
    toTeam,
    targetTeam
  };

  return ctx.reply(
`⚠️ Confirm move ${player.name} from Team ${sourceTeam} → Team ${targetTeam}?`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Confirm", "confirm_team_change"),
        Markup.button.callback("❌ Cancel", "cancel_team_change")
      ]
    ])
  );
});


/* ================= SHOW PLAYERS ================= */

function showPlayersList(match) {

  function formatTeam(teamArray, captainId) {

    if (!teamArray.length) return "No players";

    let list = [];

    if (captainId) {
      const captain = teamArray.find(p => p.id === captainId);
      if (captain) list.push(`1. 👑 ${captain.name} (Captain)`);
    }

    const others = teamArray.filter(p => p.id !== captainId);

    others.forEach(p => {
      list.push(`${list.length + 1}. ${p.name}`);
    });

    return list.join("\n");
  }

  const teamAList = formatTeam(match.teamA, match.captains?.A);
  const teamBList = formatTeam(match.teamB, match.captains?.B);

  bot.telegram.sendMessage(
    match.groupId,
`👥 UPDATED PLAYERS LIST

🔵 ${match.teamAName} (A):
${teamAList}

🔴 ${match.teamBName} (B):
${teamBList}`
  );
}


/* ================= CONFIRM TEAM CHANGE ================= */

bot.action("confirm_team_change", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (!isHost(match, ctx.from.id))
    return ctx.answerCbQuery("Only host can confirm.");

  if (!match.pendingTeamChange)
    return ctx.answerCbQuery("No pending change.");

  const { player, fromTeam, toTeam, targetTeam } = match.pendingTeamChange;

  const index = fromTeam.findIndex(p => p.id === player.id);
  if (index !== -1) fromTeam.splice(index, 1);

  toTeam.push(player);

  match.pendingTeamChange = null;

  try {
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  } catch (e) {}

  await ctx.reply(`✅ ${player.name} moved to Team ${targetTeam}`);

  showPlayersList(match);
});


/* ================= CANCEL TEAM CHANGE ================= */

bot.action("cancel_team_change", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (!isHost(match, ctx.from.id))
    return ctx.answerCbQuery("Only host can cancel.");

  match.pendingTeamChange = null;

  try {
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  } catch (e) {}

  ctx.answerCbQuery("Cancelled.");
});


};
