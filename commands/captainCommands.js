const { Markup } = require("telegraf");
const { getMatch } = require("../matchManager");
const box = require("../utils/boxMessage");


// ═══════════════════════════════════════════════
// PLAYER LIST UTILITIES
// ═══════════════════════════════════════════════

function buildPlayerListText(match) {

  function formatTeam(teamArray, captainId) {
    if (!teamArray || !teamArray.length) return "  —";

    const ordered = [
      ...teamArray.filter(p => p.id === captainId),
      ...teamArray.filter(p => p.id !== captainId)
    ];

    return ordered.map((p, index) => {
      const isStriker    = match.striker    === p.id;
      const isNonStriker = match.nonStriker === p.id;
      const dismissed    =
        match.usedBatters?.includes(p.id) &&
        !isStriker && !isNonStriker;
      const cap = p.id === captainId ? " 👑" : "";
      const tag = isStriker ? " 🏏" : isNonStriker ? " 🪄" : dismissed ? " ✗" : "";
      return `  ${index + 1}.${cap} ${p.name}${tag}`;
    }).join("\n");
  }

  const lines = [
    `╭───────────╮`,
    `  👥 Players`,
    `╰───────────╯`,
    `🔵 〔Team A〕 ${match.teamAName}`,
    `───────────`,
    formatTeam(match.teamA, match.captains?.A),
    ``,
    `🔴 〔Team B〕 ${match.teamBName}`,
    `───────────`,
    formatTeam(match.teamB, match.captains?.B),
    `───────────`,
  ];

  return lines.join("\n");
}

async function sendAndPinPlayerList(match, telegram) {
  const text = buildPlayerListText(match);
  try {
    if (match.playerListMessageId) {
      try {
        await telegram.editMessageText(
          match.groupId,
          match.playerListMessageId,
          null,
          text
        );
      } catch (e) {
        if (!e.message?.includes("message is not modified")) {
          console.error("EditMessage error:", e.message);
        }
      }
    } else {
      const msg = await telegram.sendMessage(match.groupId, text);
      match.playerListMessageId = msg.message_id;
      try {
        await telegram.pinChatMessage(match.groupId, msg.message_id, {
          disable_notification: true
        });
      } catch (e) {
        console.error("Pin failed:", e.message);
      }
    }
  } catch (e) {
    console.error("PlayerList update error:", e.message);
  }
}


// ═══════════════════════════════════════════════
// BOT COMMANDS
// ═══════════════════════════════════════════════

module.exports = function (bot, helpers) {

  const { isHost, getDisplayName, getName } = helpers;


  /* ================= CHOOSE CAPTAIN ================= */

  bot.command("choosecap", ctx => {

    const match = getMatch(ctx);
    if (!match) return ctx.reply("⚠️ No active match.");

    if (!match.captains) match.captains = { A: null, B: null };

    if (!isHost(match, ctx.from.id))
      return ctx.reply("❌ Only host can start captain selection.");

    match.phase = "captain";

    ctx.reply(
box("👑 Captain Selection", "Each team picks their own captain.", "Tap the button below."),
      Markup.inlineKeyboard([
        [Markup.button.callback("👑 Captain — Team A", "cap_A")],
        [Markup.button.callback("👑 Captain — Team B", "cap_B")]
      ])
    );
  });


  /* ================= CAPTAIN TEAM A ================= */

  bot.action("cap_A", async ctx => {

    const match = getMatch(ctx);
    if (!match) return;

    if (match.phase !== "captain")
      return ctx.answerCbQuery("Not allowed now.");

    if (match.captains.A)
      return ctx.answerCbQuery("Captain A already selected.");

    if (!match.teamA.some(p => p.id === ctx.from.id))
      return ctx.answerCbQuery("Only Team A players can select.");

    match.captains.A = ctx.from.id;

    await ctx.answerCbQuery("You are Captain of Team A 👑");
    await ctx.reply(
box("👑 Captain Set", `${getDisplayName(ctx.from)}`, "🔵 〔Team A〕 Captain")
    );

    updateCaptainButtons(match, ctx);
  });


  /* ================= CAPTAIN TEAM B ================= */

  bot.action("cap_B", async ctx => {

    const match = getMatch(ctx);
    if (!match) return;

    if (match.phase !== "captain")
      return ctx.answerCbQuery("Not allowed now.");

    if (match.captains.B)
      return ctx.answerCbQuery("Captain B already selected.");

    if (!match.teamB.some(p => p.id === ctx.from.id))
      return ctx.answerCbQuery("Only Team B players can select.");

    match.captains.B = ctx.from.id;

    await ctx.answerCbQuery("You are Captain of Team B 👑");
    await ctx.reply(
box("👑 Captain Set", `${getDisplayName(ctx.from)}`, "🔴 〔Team B〕 Captain")
    );

    updateCaptainButtons(match, ctx);
  });


  /* ================= UPDATE CAPTAIN BUTTONS ================= */

  function updateCaptainButtons(match, ctx) {

    const buttons = [];

    if (!match.captains.A)
      buttons.push([Markup.button.callback("👑 Captain — Team A", "cap_A")]);

    if (!match.captains.B)
      buttons.push([Markup.button.callback("👑 Captain — Team B", "cap_B")]);

    if (buttons.length === 0) {

      try { ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch (e) {}

      match.phase = "toss";

      ctx.reply(
box("✅ Both Captains Set", "Starting toss...")
      );

      if (helpers.startToss) helpers.startToss(match);

    } else {
      try { ctx.editMessageReplyMarkup({ inline_keyboard: buttons }); } catch (e) {}
    }
  }


  /* ================= PLAYERS LIST ================= */

  bot.command("players", async (ctx) => {

    const match = getMatch(ctx);
    if (!match || ctx.chat.id !== match.groupId)
      return ctx.reply("⚠️ No active match in this group.");

    if (!match.playerListMessageId) {
      await sendAndPinPlayerList(match, ctx.telegram);
      return;
    }

    await ctx.telegram.sendMessage(
      match.groupId,
      "📋 Player list ↑",
      { reply_to_message_id: match.playerListMessageId }
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
      return ctx.reply("ℹ️ Usage: /capchange A 2");

    const teamLetter = args[1].toUpperCase();
    const number     = parseInt(args[2]);

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

    match.pendingCaptainChange = { team: teamLetter, playerId: newCaptainId };

    const name = getName(match, newCaptainId);

    await ctx.reply(
box("🔄 Change Captain?", `〔Team ${teamLetter}〕 → ${name}`),
      Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Confirm", "confirm_cap_change"),
          Markup.button.callback("❌ Cancel",  "cancel_cap_change")
        ]
      ])
    );
  });


  /* ================= CONFIRM CAPTAIN CHANGE ================= */

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
box("👑 Captain Updated", `${mention} → 〔Team ${team}〕`),
      { parse_mode: "HTML" }
    );

    await sendAndPinPlayerList(match, ctx.telegram);
  });


  /* ================= CANCEL CAPTAIN CHANGE ================= */

  bot.action("cancel_cap_change", async (ctx) => {

    const match = getMatch(ctx);
    if (!match) return;

    if (ctx.from.id !== match.host)
      return ctx.answerCbQuery("Only host can cancel.");

    match.pendingCaptainChange = null;
    await ctx.editMessageText(
box("✖️ Captain Change Cancelled")
    );
  });

};


// ═══════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════

module.exports.sendAndPinPlayerList = sendAndPinPlayerList;
module.exports.buildPlayerListText  = buildPlayerListText;