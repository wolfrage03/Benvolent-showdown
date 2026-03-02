const { Markup } = require("telegraf");

module.exports = (bot, match) => {

  /* ================= HELPERS ================= */

  function getMatch(ctx) {
    return match.matches.get(ctx.chat.id);
  }

  function isHost(m, userId) {
    return m.host === userId;
  }

  function getDisplayName(user) {
    return user.username
      ? `@${user.username}`
      : user.first_name || "Player";
  }

  function getName(m, id) {
    const all = [...m.teamA, ...m.teamB];
    const player = all.find(p => p.id === id);
    return player ? player.name : "Player";
  }

  // 🔥 Always make captain position 1 (index 0 internally)
  function makeCaptainFirst(teamArray, playerId) {
    const index = teamArray.findIndex(p => p.id === playerId);
    if (index === -1) return;

    const selected = teamArray.splice(index, 1)[0];
    teamArray.unshift(selected);
  }

  /* ================= CHOOSE CAPTAIN ================= */

  bot.command("choosecap", async (ctx) => {

    const m = getMatch(ctx);
    if (!m) return ctx.reply("⚠️ No active match.");

    if (!isHost(m, ctx.from.id))
      return ctx.reply("❌ Only host can start captain selection.");

    if (m.phase !== "captain")
      return ctx.reply("⚠️ Captain selection not allowed now.");

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

    const m = getMatch(ctx);
    if (!m) return;

    if (m.phase !== "captain")
      return ctx.answerCbQuery("Not allowed now.");

    if (m.captains.A)
      return ctx.answerCbQuery("Captain A already selected.");

    if (!m.teamA.some(p => p.id === ctx.from.id))
      return ctx.answerCbQuery("Only Team A players allowed.");

    m.captains.A = ctx.from.id;

    // 🔥 Move captain to position 1
    makeCaptainFirst(m.teamA, ctx.from.id);

    await ctx.answerCbQuery("Captain A Selected");
    await ctx.reply(`👑 ${getDisplayName(ctx.from)} is Captain of Team A`);

    await updateButtons(ctx, m);
  });

  /* ================= TEAM B CAPTAIN ================= */

  bot.action("cap_B", async (ctx) => {

    const m = getMatch(ctx);
    if (!m) return;

    if (m.phase !== "captain")
      return ctx.answerCbQuery("Not allowed now.");

    if (m.captains.B)
      return ctx.answerCbQuery("Captain B already selected.");

    if (!m.teamB.some(p => p.id === ctx.from.id))
      return ctx.answerCbQuery("Only Team B players allowed.");

    m.captains.B = ctx.from.id;

    // 🔥 Move captain to position 1
    makeCaptainFirst(m.teamB, ctx.from.id);

    await ctx.answerCbQuery("Captain B Selected");
    await ctx.reply(`👑 ${getDisplayName(ctx.from)} is Captain of Team B`);

    await updateButtons(ctx, m);
  });

  /* ================= UPDATE BUTTONS ================= */

  async function updateButtons(ctx, m) {

    const buttons = [];

    if (!m.captains.A)
      buttons.push([Markup.button.callback("👑 Choose Captain - Team A", "cap_A")]);

    if (!m.captains.B)
      buttons.push([Markup.button.callback("👑 Choose Captain - Team B", "cap_B")]);

    if (m.captains.A && m.captains.B) {

      m.phase = "toss_locked";

      try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      } catch {}

      await ctx.reply("🎲 Both Captains Selected!\nStarting Toss...");

      // Call toss function if defined
      if (typeof match.startToss === "function") {
        match.startToss(m, bot);
      }

      return;
    }

    try {
      await ctx.editMessageReplyMarkup({ inline_keyboard: buttons });
    } catch {}
  }

  /* ================= PLAYERS LIST ================= */

  bot.command("players", (ctx) => {

    const m = getMatch(ctx);
    if (!m || ctx.chat.id !== m.groupId)
      return ctx.reply("⚠️ No active match in this group.");

    function formatTeam(teamArray, captainId) {

      if (!teamArray.length) return "No players";

      return teamArray.map((p, i) => {
        if (p.id === captainId)
          return `${i + 1}. 👑 ${p.name} (Captain)`;
        return `${i + 1}. ${p.name}`;
      }).join("\n");
    }

    const teamAList = formatTeam(m.teamA, m.captains.A);
    const teamBList = formatTeam(m.teamB, m.captains.B);

    ctx.reply(
`👥 PLAYERS LIST

🔵 ${m.teamAName} (A):
${teamAList}

🔴 ${m.teamBName} (B):
${teamBList}`
    );
  });

  /* ================= CAPTAIN CHANGE ================= */

  bot.command("capchange", async (ctx) => {

    const m = getMatch(ctx);
    if (!m)
      return ctx.reply("❌ No active match.");

    if (!isHost(m, ctx.from.id))
      return ctx.reply("❌ Only host can change captain.");

    const args = ctx.message.text.trim().split(/\s+/);
    if (args.length !== 3)
      return ctx.reply("Usage:\n/capchange A 2");

    const teamLetter = args[1].toUpperCase();
    const number = parseInt(args[2]);

    if (!["A", "B"].includes(teamLetter))
      return ctx.reply("❌ Use A or B.");

    const teamArray = teamLetter === "A" ? m.teamA : m.teamB;

    if (!number || number < 1 || number > teamArray.length)
      return ctx.reply("❌ Invalid player number.");

    const newCaptain = teamArray[number - 1];

    m.pendingCaptainChange = {
      team: teamLetter,
      playerId: newCaptain.id
    };

    await ctx.reply(
`⚠️ Confirm Captain Change?

Team ${teamLetter}
New Captain: ${newCaptain.name}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Confirm", "confirm_cap_change"),
          Markup.button.callback("❌ Cancel", "cancel_cap_change")
        ]
      ])
    );
  });

  /* ================= CONFIRM CAPTAIN CHANGE ================= */

  bot.action("confirm_cap_change", async (ctx) => {

    const m = getMatch(ctx);
    if (!m || !m.pendingCaptainChange)
      return ctx.answerCbQuery("Expired.");

    if (!isHost(m, ctx.from.id))
      return ctx.answerCbQuery("Only host can confirm.");

    const { team, playerId } = m.pendingCaptainChange;
    const teamArray = team === "A" ? m.teamA : m.teamB;

    // 🔥 Move new captain to position 1
    makeCaptainFirst(teamArray, playerId);

    if (team === "A") m.captains.A = playerId;
    else m.captains.B = playerId;

    m.pendingCaptainChange = null;

    await ctx.editMessageText(
      `👑 Captain Updated Successfully!\n\n${getName(m, playerId)} is now Captain of Team ${team}!`
    );
  });

  /* ================= CANCEL CAPTAIN CHANGE ================= */

  bot.action("cancel_cap_change", async (ctx) => {

    const m = getMatch(ctx);
    if (!m) return;

    if (!isHost(m, ctx.from.id))
      return ctx.answerCbQuery("Only host can cancel.");

    m.pendingCaptainChange = null;

    await ctx.editMessageText("❌ Captain change cancelled.");
  });

};