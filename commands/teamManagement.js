const { Markup } = require("telegraf");

module.exports = (bot, match) => {

  /* ================= HELPERS ================= */

  function getMatch(ctx) {
    return match.matches.get(ctx.chat.id.toString());
  }

  function isHost(matchData, userId) {
    return matchData.host === userId;
  }

  const playerActiveMatch = match.playerActiveMatch;

  /* ================= CREATE TEAM ================= */

  bot.command("createteam", (ctx) => {

    if (ctx.chat.type === "private")
      return ctx.reply("❌ Use this command in group.");

    const m = getMatch(ctx);
    if (!m) return ctx.reply("⚠️ No active match.");

    if (!isHost(m, ctx.from.id))
      return ctx.reply("❌ Only host can create teams.");

    if (!["team_create", "captain", "join"].includes(m.phase))
      return ctx.reply("⚠️ Cannot create teams at this stage.");

    m.teamA ??= [];
    m.teamB ??= [];
    m.captains ??= { A: null, B: null };

    m.phase = "join";

    ctx.reply(
`🏏 Teams Selected!

🔵 ${m.teamAName || "Team A"} (A)
🔴 ${m.teamBName || "Team B"} (B)

Players join using:
👉 /joina
👉 /joinb

⏳ Joining open for 1 minute`
    );

    setTimeout(() => {

      const currentMatch = match.matches.get(m.groupId);
      if (!currentMatch || currentMatch.phase !== "join") return;

      currentMatch.phase = "captain";

      bot.telegram.sendMessage(currentMatch.groupId,
`🔒 Joining Closed!

Team A: ${currentMatch.teamA.length}
Team B: ${currentMatch.teamB.length}

Host use /choosecap`
      );

    }, 60000);
  });

  /* ================= JOIN TEAM A ================= */

  bot.command("joina", ctx => {

    const m = getMatch(ctx);
    if (!m) return ctx.reply("⚠️ No active match.");

    if (playerActiveMatch.has(ctx.from.id))
      return ctx.reply("❌ You are already playing another match.");

    if (m.phase !== "join")
      return ctx.reply("⚠️ Joining is not open.");

    if (ctx.from.id === m.host)
      return ctx.reply("❌ Host cannot join.");

    if (m.teamA.some(p => p.id === ctx.from.id))
      return ctx.reply("⚠️ Already in Team A.");

    if (m.teamB.some(p => p.id === ctx.from.id))
      return ctx.reply("⚠️ Already in Team B.");

    const player = {
      id: ctx.from.id,
      name: ctx.from.username
        ? `@${ctx.from.username}`
        : ctx.from.first_name || "Player"
    };

    m.teamA.push(player);
    playerActiveMatch.set(ctx.from.id, m.groupId);

    ctx.reply(`✅ ${player.name} joined Team A`);
  });

  /* ================= JOIN TEAM B ================= */

  bot.command("joinb", ctx => {

    const m = getMatch(ctx);
    if (!m) return ctx.reply("⚠️ No active match.");

    if (playerActiveMatch.has(ctx.from.id))
      return ctx.reply("❌ You are already playing another match.");

    if (m.phase !== "join")
      return ctx.reply("⚠️ Joining is not open.");

    if (ctx.from.id === m.host)
      return ctx.reply("❌ Host cannot join.");

    if (m.teamB.some(p => p.id === ctx.from.id))
      return ctx.reply("⚠️ Already in Team B.");

    if (m.teamA.some(p => p.id === ctx.from.id))
      return ctx.reply("⚠️ Already in Team A.");

    const player = {
      id: ctx.from.id,
      name: ctx.from.username
        ? `@${ctx.from.username}`
        : ctx.from.first_name || "Player"
    };

    m.teamB.push(player);
    playerActiveMatch.set(ctx.from.id, m.groupId);

    ctx.reply(`✅ ${player.name} joined Team B`);
  });

  /* ================= CHANGE TEAM ================= */

  bot.command("changeteam", (ctx) => {

    const m = getMatch(ctx);
    if (!m) return ctx.reply("⚠️ No active match.");

    if (!isHost(m, ctx.from.id))
      return ctx.reply("❌ Only host can change teams.");

    if (m.phase === "play")
      return ctx.reply("❌ Cannot change teams after match started.");

    const args = ctx.message.text.trim().split(/\s+/);
    if (args.length !== 3)
      return ctx.reply("Usage: /changeteam A 1");

    const sourceTeam = args[1].toUpperCase();
    const playerNumber = parseInt(args[2]);

    if (!["A", "B"].includes(sourceTeam))
      return ctx.reply("Team must be A or B.");

    const fromTeam = sourceTeam === "A" ? m.teamA : m.teamB;
    const toTeam   = sourceTeam === "A" ? m.teamB : m.teamA;
    const targetTeam = sourceTeam === "A" ? "B" : "A";

    if (playerNumber < 1 || playerNumber > fromTeam.length)
      return ctx.reply("Invalid player number.");

    const player = fromTeam[playerNumber - 1];

    if (player.id === m.captains.A || player.id === m.captains.B)
      return ctx.reply("❌ Captain cannot be moved.");

    m.pendingTeamChange = { player, fromTeam, toTeam, targetTeam };

    return ctx.reply(
      `⚠️ Confirm move ${player.name} to Team ${targetTeam}?`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Confirm", "confirm_team_change"),
          Markup.button.callback("❌ Cancel", "cancel_team_change")
        ]
      ])
    );
  });

  /* ================= CONFIRM TEAM CHANGE ================= */

  bot.action("confirm_team_change", async (ctx) => {

    const m = getMatch(ctx);
    if (!m || !m.pendingTeamChange) return;

    if (!isHost(m, ctx.from.id))
      return ctx.answerCbQuery("Only host can confirm.");

    const { player, fromTeam, toTeam, targetTeam } = m.pendingTeamChange;

    const index = fromTeam.findIndex(p => p.id === player.id);
    if (index !== -1) fromTeam.splice(index, 1);

    toTeam.push(player);
    m.pendingTeamChange = null;

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.reply(`✅ ${player.name} moved to Team ${targetTeam}`);
  });

  /* ================= CANCEL TEAM CHANGE ================= */

  bot.action("cancel_team_change", async (ctx) => {

    const m = getMatch(ctx);
    if (!m) return;

    if (!isHost(m, ctx.from.id))
      return ctx.answerCbQuery("Only host can cancel.");

    m.pendingTeamChange = null;

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    ctx.answerCbQuery("Cancelled.");
  });

};