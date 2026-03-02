const { Markup } = require("telegraf");

module.exports = function registerCaptain(bot, deps) {

  const {
    getMatch,
    isHost,
    getDisplayName,
    startToss
  } = deps;

  /* ================= CAPTAIN COMMAND ================= */

  bot.command("choosecap", async (ctx) => {

    const match = getMatch(ctx);
    if (!match) return ctx.reply("⚠️ No active match.");

    if (!isHost(match, ctx.from.id))
      return ctx.reply("❌ Only host can start captain selection.");

    if (!["team_create", "captain"].includes(match.phase))
      return ctx.reply("⚠️ Cannot choose captains now.");

    match.phase = "captain";

    await ctx.reply(
      "🏏 Captain Selection:",
      Markup.inlineKeyboard([
        [Markup.button.callback("👑 Choose Captain - Team A", "cap_A")],
        [Markup.button.callback("👑 Choose Captain - Team B", "cap_B")]
      ])
    );
  });

  /* ================= TEAM A CAPTAIN ================= */

  bot.action("cap_A", async (ctx) => {

    const match = getMatch(ctx);
    if (!match) return;

    if (match.phase !== "captain")
      return ctx.answerCbQuery("Not allowed now.");

    if (match.captains.A)
      return ctx.answerCbQuery("Captain A already selected.");

    if (!match.teamA.some(p => p.id === ctx.from.id))
      return ctx.answerCbQuery("Only Team A players allowed.");

    match.captains.A = ctx.from.id;

    await ctx.answerCbQuery("Captain A Selected");
    await ctx.reply(`👑 ${getDisplayName(ctx.from)} is Captain of Team A`);

    await updateCaptainButtons(ctx, match);
  });

  /* ================= TEAM B CAPTAIN ================= */

  bot.action("cap_B", async (ctx) => {

    const match = getMatch(ctx);
    if (!match) return;

    if (match.phase !== "captain")
      return ctx.answerCbQuery("Not allowed now.");

    if (match.captains.B)
      return ctx.answerCbQuery("Captain B already selected.");

    if (!match.teamB.some(p => p.id === ctx.from.id))
      return ctx.answerCbQuery("Only Team B players allowed.");

    match.captains.B = ctx.from.id;

    await ctx.answerCbQuery("Captain B Selected");
    await ctx.reply(`👑 ${getDisplayName(ctx.from)} is Captain of Team B`);

    await updateCaptainButtons(ctx, match);
  });

  /* ================= UPDATE BUTTONS ================= */

  async function updateCaptainButtons(ctx, match) {

    const buttons = [];

    if (!match.captains.A)
      buttons.push([
        Markup.button.callback("👑 Choose Captain - Team A", "cap_A")
      ]);

    if (!match.captains.B)
      buttons.push([
        Markup.button.callback("👑 Choose Captain - Team B", "cap_B")
      ]);

    // If both selected → move to toss safely
    if (match.captains.A && match.captains.B) {

      match.phase = "toss_locked";

      try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      } catch {}

      await ctx.reply("🎲 Both Captains Selected!\nStarting Toss...");

      startToss(match);
      return;
    }

    // Otherwise update buttons
    try {
      await ctx.editMessageReplyMarkup({
        inline_keyboard: buttons
      });
    } catch {}
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
        if (captain)
          list.push(`1. 👑 ${captain.name} (Captain)`);
      }

      const others = teamArray.filter(p => p.id !== captainId);
      others.forEach((p, i) =>
        list.push(`${i + 1}. ${p.name}`)
      );

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

};