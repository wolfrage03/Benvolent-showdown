```javascript
const { Markup } = require("telegraf");
const { getMatch } = require("../matchManager");

module.exports = function (bot, helpers) {

const { isHost, getDisplayName, getName, startToss } = helpers;


/* ================= CAPTAIN ================= */

bot.command("choosecap", ctx => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!match.captains)
    match.captains = { A: null, B: null };

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


/* ================= CAPTAIN TEAM A ================= */

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


/* ================= CAPTAIN TEAM B ================= */

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


/* ================= UPDATE BUTTONS ================= */

function updateCaptainButtons(match, ctx) {

  const buttons = [];

  if (!match.captains.A)
    buttons.push([Markup.button.callback("👑 Choose Captain - Team A", "cap_A")]);

  if (!match.captains.B)
    buttons.push([Markup.button.callback("👑 Choose Captain - Team B", "cap_B")]);

  if (buttons.length === 0) {

    try {
      ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {}

    match.phase = "toss";

    ctx.reply("🎲 Both Captains Selected!\nStarting Toss...");

    if (startToss) {
      startToss(match);
    }

  } else {

    try {
      ctx.editMessageReplyMarkup({ inline_keyboard: buttons });
    } catch (e) {}
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

    others.forEach(p => {
      list.push(`${list.length + 1}. ${p.name}`);
    });

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
    `👑 Captain Updated Successfully!\n\n${mention} is now the new Captain of Team ${team}!`,
    { parse_mode: "HTML" }
  );
});


/* ================= CANCEL CAPTAIN CHANGE ================= */

bot.action("cancel_cap_change", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (ctx.from.id !== match.host)
    return ctx.answerCbQuery("Only host can cancel.");

  match.pendingCaptainChange = null;

  await ctx.editMessageText("❌ Captain change cancelled.");
});


};
