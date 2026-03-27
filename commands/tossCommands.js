const { Markup } = require("telegraf");
const { getMatch } = require("../matchManager");
const { sendAndPinPlayerList } = require("./captainCommands");
const box = require("../utils/boxMessage");

module.exports = function (bot, helpers) {

const { isHost } = helpers;


/* ================= START TOSS ================= */

async function startToss(match) {
  if (!match) return;
  match.phase = "toss";

  await bot.telegram.sendMessage(
    match.groupId,
`🎲 Toss Time\n\n<blockquote>🔵 ${match.teamAName} 〔Team A〕\n🔴 ${match.teamBName} 〔Team B〕</blockquote>\n\n<blockquote>Captains choose odd or even.\nA number will be rolled.</blockquote>`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("⚫ Odd",  "toss_odd"),
          Markup.button.callback("⚪ Even", "toss_even")
        ]
      ])
    }
  );
}


/* ================= TOSS CHOICE ================= */

bot.action(["toss_odd", "toss_even"], async (ctx) => {

  const match = getMatch(ctx);
  if (!match || match.phase !== "toss") return ctx.answerCbQuery();

  const captainA = match.captains.A;
  const captainB = match.captains.B;

  if (![captainA, captainB].includes(ctx.from.id))
    return ctx.answerCbQuery("Only captains can choose.");

  await ctx.answerCbQuery();

  const choice  = ctx.callbackQuery.data === "toss_odd" ? "odd" : "even";
  const chooser = ctx.from.id;

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  // ── Telegram native dice animation ──
  const diceMsg    = await bot.telegram.sendDice(match.groupId, { emoji: "🎲" });
  const rolledValue = diceMsg.dice.value;
  const diceResult  = rolledValue % 2 === 0 ? "even" : "odd";
  const diceWinner  = choice === diceResult
    ? chooser
    : chooser === captainA ? captainB : captainA;

  // Wait for the dice animation to finish (~4 seconds)
  await new Promise(res => setTimeout(res, 4000));

  match.tossWinner = diceWinner;
  const winnerTeamFinal = diceWinner === captainA ? "A" : "B";

  const winnerArr   = winnerTeamFinal === "A" ? match.teamA : match.teamB;
  const chooserArr  = choice === diceResult ? winnerArr : (winnerTeamFinal === "A" ? match.teamB : match.teamA);
  const chooserCapName = chooserArr?.find(p => p.id === chooser)?.name || "Captain";
  const winnerCapName  = winnerArr?.find(p => p.id === diceWinner)?.name || "Captain";
  const winnerTeamName = winnerTeamFinal === "A" ? match.teamAName : match.teamBName;

  await bot.telegram.sendMessage(
    match.groupId,
    [
      `🎲 Toss Result`,
      ``,
      `<blockquote>${chooserCapName} chose ${choice}\nDice rolled ${rolledValue} — ${diceResult}</blockquote>`,
      ``,
      `<blockquote>🏆 ${winnerTeamName} 〔Team ${winnerTeamFinal}〕 won the toss!</blockquote>`,
      ``,
      `👑 ${winnerCapName} choose to bat or bowl:`,
    ].join("\n"),
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "🏏 Bat",  callback_data: "decision_bat"  },
          { text: "🎯 Bowl", callback_data: "decision_bowl" }
        ]]
      }
    }
  );

  // Set phase AFTER sending the bat/bowl message
  match.phase = "batbowl";
});


/* ================= BAT / BOWL DECISION ================= */

bot.action(["decision_bat", "decision_bowl"], async (ctx) => {

  const match = getMatch(ctx);
  if (!match || match.phase !== "batbowl") return ctx.answerCbQuery();

  if (ctx.from.id !== match.tossWinner)
    return ctx.answerCbQuery("Only toss winner decides.");

  await ctx.answerCbQuery();

  const winnerTeam = ctx.from.id === match.captains.A ? "A" : "B";
  const otherTeam  = winnerTeam === "A" ? "B" : "A";
  const decision   = ctx.callbackQuery.data === "decision_bat" ? "bat" : "bowl";

  if (decision === "bat") {
    match.battingTeam = winnerTeam;
    match.bowlingTeam = otherTeam;
  } else {
    match.bowlingTeam = winnerTeam;
    match.battingTeam = otherTeam;
  }

  match.innings     = 1;
  match.score       = 0;
  match.wickets     = 0;
  match.currentOver = 0;
  match.currentBall = 0;
  match.phase       = "setovers";

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  const battingName = match.battingTeam === "A" ? match.teamAName : match.teamBName;
  const bowlingName = match.bowlingTeam === "A" ? match.teamAName : match.teamBName;

  await sendAndPinPlayerList(match, ctx.telegram);

  await bot.telegram.sendMessage(
    match.groupId,
`✅ Match Setup\n\n<blockquote>🏏 ${battingName} 〔Team ${match.battingTeam}〕  batting\n🎯 ${bowlingName} 〔Team ${match.bowlingTeam}〕  bowling</blockquote>\n\n👉 /setovers [1–25] to set overs`,
    { parse_mode: "HTML" },
  );
});


/* ================= SET OVERS ================= */

bot.command("setovers", (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can set overs.");

  const args  = ctx.message.text.split(" ");
  const overs = parseInt(args[1]);

  if (isNaN(overs) || overs < 1 || overs > 25)
    return ctx.reply(
`⚠️ Overs must be between <b>1</b> and <b>25</b>`,
      { parse_mode: "HTML" }
    );

  match.totalOvers = overs;
  match.maxWickets =
    (match.battingTeam === "A" ? match.teamA.length : match.teamB.length) - 1;

  match.phase = "set_striker";

  const battingName = match.battingTeam === "A" ? match.teamAName : match.teamBName;
  const bowlingName = match.bowlingTeam === "A" ? match.teamAName : match.teamBName;

  ctx.reply(
`⚙️ Overs Set\n\n<blockquote>Overs: ${overs}</blockquote>\n\n<blockquote>🏏 ${battingName} 〔Team ${match.battingTeam}〕  batting\n🎯 ${bowlingName} 〔Team ${match.bowlingTeam}〕  bowling</blockquote>\n\n👉 /batter [number] set opener`,
    { parse_mode: "HTML" },
  );
});


/* ================= EXPORT startToss ================= */

helpers.startToss = startToss;

};