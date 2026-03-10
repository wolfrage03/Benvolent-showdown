```javascript
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
