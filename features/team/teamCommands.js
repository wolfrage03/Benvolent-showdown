const store = require("../../state/inMemoryStore");
const service = require("./teamService");
const { formatTeam } = require("../../utils/formatters");

module.exports = (bot) => {

  

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

    m.phase = "captain";

    bot.telegram.sendMessage(m.groupId,
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

  ctx.reply(`✅ ${player.name} joined Team A`);
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

  ctx.reply(`✅ ${player.name} joined Team B`);
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

  if (player.id === match.captains.A || player.id === match.captains.B)
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
    others.forEach(p => list.push(`${list.length + 1}. ${p.name}`));

    return list.join("\n");
  }

  const teamAList = formatTeam(match.teamA, match.captains.A);
  const teamBList = formatTeam(match.teamB, match.captains.B);

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

  const { player, fromTeam, toTeam, targetTeam } =
    match.pendingTeamChange;

  const index = fromTeam.findIndex(p => p.id === player.id);
  if (index !== -1) fromTeam.splice(index, 1);

  toTeam.push(player);
  match.pendingTeamChange = null;

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
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

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  ctx.answerCbQuery("Cancelled.");
});


/* ================= CAPTAIN ================= */

bot.command("choosecap", ctx => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can start captain selection.");

  match.phase = "captain";

  ctx.reply(
    "🏏 Captain Selection:",
    Markup.inlineKeyboard([
      [Markup.button.callback("👑 Choose Captain - Team A", "cap_A")],
      [Markup.button.callback("👑 Choose Captain - Team B", "cap_B")]
    ])
  );
});


bot.action("cap_A", async ctx => {

  const match = getMatch(ctx);
  if (!match) return;

  if (match.phase !== "captain")
    return ctx.answerCbQuery("Not allowed now.");

  if (match.captains.A)
    return ctx.answerCbQuery("Captain A already selected");

  if (!match.teamA.some(p => p.id === ctx.from.id))
    return ctx.answerCbQuery("Only Team A players allowed");

  match.captains.A = ctx.from.id;

  await ctx.answerCbQuery("Captain A Selected");
  await ctx.reply(`👑 ${getDisplayName(ctx.from)} is Captain of Team A`);

  updateCaptainButtons(match, ctx);
});


bot.action("cap_B", async ctx => {

  const match = getMatch(ctx);
  if (!match) return;

  if (match.phase !== "captain")
    return ctx.answerCbQuery("Not allowed now.");

  if (match.captains.B)
    return ctx.answerCbQuery("Captain B already selected");

  if (!match.teamB.some(p => p.id === ctx.from.id))
    return ctx.answerCbQuery("Only Team B players allowed");

  match.captains.B = ctx.from.id;

  await ctx.answerCbQuery("Captain B Selected");
  await ctx.reply(`👑 ${getDisplayName(ctx.from)} is Captain of Team B`);

  updateCaptainButtons(match, ctx);
});


function updateCaptainButtons(match, ctx) {

  const buttons = [];

  if (!match.captains.A)
    buttons.push([Markup.button.callback("👑 Choose Captain - Team A", "cap_A")]);

  if (!match.captains.B)
    buttons.push([Markup.button.callback("👑 Choose Captain - Team B", "cap_B")]);

  if (buttons.length === 0) {

    ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    match.phase = "toss";

    ctx.reply("🎲 Both Captains Selected!\nStarting Toss...");
    startToss(match);

  } else {
    ctx.editMessageReplyMarkup({ inline_keyboard: buttons });
  }
}


/* ================= PLAYERS LIST ================= */

bot.command("players", (ctx) => {

  const match = getMatch(ctx);
  if (!match || ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ No active match in this group.");

  function formatTeam(teamArray, captainId) {
    if (!teamArray.length) return "No players";

    let list = [];

    if (captainId) {
      const captain = teamArray.find(p => p.id === captainId);
      if (captain) list.push(`1. 👑 ${captain.name} (Captain)`);
    }

    const others = teamArray.filter(p => p.id !== captainId);
    others.forEach(p => list.push(`${list.length + 1}. ${p.name}`));

    return list.join("\n");
  }

  const teamAList = formatTeam(match.teamA, match.captains.A);
  const teamBList = formatTeam(match.teamB, match.captains.B);

  ctx.reply(
`👥 PLAYERS LIST

🔵 ${match.teamAName} (A):
${teamAList}

🔴 ${match.teamBName} (B):
${teamBList}`
  );
});


/* ================= CAPTAIN CHANGE ================= */

bot.command("capchange", async (ctx) => {

  const match = getMatch(ctx);
  if (!match || match.phase === "idle")
    return ctx.reply("❌ No active match.");

  if (ctx.from.id !== match.host)
    return ctx.reply("❌ Only host can change captain.");

  const args = ctx.message.text.trim().split(/\s+/);
  if (args.length !== 3)
    return ctx.reply("Usage:\n/capchange A 2");

  const teamLetter = args[1].toUpperCase();
  const number = parseInt(args[2]);

  if (!["A", "B"].includes(teamLetter))
    return ctx.reply("❌ Use A or B.");

  const team = teamLetter === "A" ? match.teamA : match.teamB;

  if (!number || number < 1 || number > team.length)
    return ctx.reply("❌ Invalid player number.");

  const newCaptainId = team[number - 1].id;

  if (teamLetter === "A" && match.captains.A === newCaptainId)
    return ctx.reply("⚠️ Already captain.");

  if (teamLetter === "B" && match.captains.B === newCaptainId)
    return ctx.reply("⚠️ Already captain.");

  match.pendingCaptainChange = {
    team: teamLetter,
    playerId: newCaptainId
  };

  const name = getName(match, newCaptainId);

  await ctx.reply(
`⚠️ Confirm Captain Change?

Team ${teamLetter}
New Captain: ${name}`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Confirm", "confirm_cap_change"),
        Markup.button.callback("❌ Cancel", "cancel_cap_change")
      ]
    ])
  );
});


bot.action("confirm_cap_change", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (!match.pendingCaptainChange)
    return ctx.answerCbQuery("Expired.");

  if (ctx.from.id !== match.host)
    return ctx.answerCbQuery("Only host can confirm.");

  const { team, playerId } = match.pendingCaptainChange;

  if (team === "A") match.captains.A = playerId;
  else match.captains.B = playerId;

  match.pendingCaptainChange = null;

  const mention = `<a href="tg://user?id=${playerId}">${getName(match, playerId)}</a>`;

  await ctx.editMessageText(
    `👑 Captain Updated Successfully!\n\n${mention} is now the new Captain of Team ${team}!`,
    { parse_mode: "HTML" }
  );
});


bot.action("cancel_cap_change", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (ctx.from.id !== match.host)
    return ctx.answerCbQuery("Only host can cancel.");

  match.pendingCaptainChange = null;

  await ctx.editMessageText("❌ Captain change cancelled.");
});

