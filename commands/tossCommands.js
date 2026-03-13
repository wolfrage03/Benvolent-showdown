const { Markup } = require("telegraf");
const { getMatch } = require("../matchManager");

module.exports = function (bot, helpers) {

const { isHost } = helpers;


/* ================= START TOSS ================= */

async function startToss(match) {

  if (!match) return;

  match.phase = "toss";

  await bot.telegram.sendMessage(
    match.groupId,
`[ TOSS ]

Captains, choose odd or even.`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Odd",  "toss_odd"),
        Markup.button.callback("Even", "toss_even")
      ]
    ])
  );
}


/* ================= TOSS CHOICE ================= */

bot.action(["toss_odd", "toss_even"], async (ctx) => {

  await ctx.answerCbQuery();

  const match = getMatch(ctx);
  if (!match || match.phase !== "toss") return;

  const captainA = match.captains.A;
  const captainB = match.captains.B;

  if (![captainA, captainB].includes(ctx.from.id))
    return ctx.answerCbQuery("Only captains can choose.");

  const choice = ctx.callbackQuery.data === "toss_odd" ? "odd" : "even";

  const tossNumber = Math.floor(Math.random() * 6) + 1;
  const result = tossNumber % 2 === 0 ? "even" : "odd";

  const chooser = ctx.from.id;
  const tossWinner =
    choice === result
      ? chooser
      : chooser === captainA ? captainB : captainA;

  match.tossWinner = tossWinner;
  match.phase = "batbowl";

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  const winnerTeam = tossWinner === captainA ? "A" : "B";
  const winnerName = winnerTeam === "A" ? match.teamAName : match.teamBName;

  await bot.telegram.sendMessage(
    match.groupId,
`[ TOSS RESULT ]

Number rolled: ${tossNumber}  (${result})
━━━━━━━━━━━━━━
🏆 ${winnerName} won the toss

Choose to bat or bowl:`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("🏏  Bat",   "decision_bat"),
        Markup.button.callback("🎯  Bowl",  "decision_bowl")
      ]
    ])
  );
});


/* ================= BAT / BOWL DECISION ================= */

bot.action(["decision_bat", "decision_bowl"], async (ctx) => {

  await ctx.answerCbQuery();

  const match = getMatch(ctx);
  if (!match || match.phase !== "batbowl") return;

  if (ctx.from.id !== match.tossWinner)
    return ctx.answerCbQuery("Only toss winner decides.");

  const winnerTeam  = ctx.from.id === match.captains.A ? "A" : "B";
  const otherTeam   = winnerTeam === "A" ? "B" : "A";
  const decision    = ctx.callbackQuery.data === "decision_bat" ? "bat" : "bowl";

  if (decision === "bat") {
    match.battingTeam  = winnerTeam;
    match.bowlingTeam  = otherTeam;
  } else {
    match.bowlingTeam  = winnerTeam;
    match.battingTeam  = otherTeam;
  }

  match.innings      = 1;
  match.score        = 0;
  match.wickets      = 0;
  match.currentOver  = 0;
  match.currentBall  = 0;
  match.phase        = "setovers";

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  const battingName  = match.battingTeam  === "A" ? match.teamAName : match.teamBName;
  const bowlingName  = match.bowlingTeam  === "A" ? match.teamAName : match.teamBName;

  await bot.telegram.sendMessage(
    match.groupId,
`[ MATCH SETUP ]

🏏  Batting  —  ${battingName}
🎯  Bowling  —  ${bowlingName}
━━━━━━━━━━━━━━
Host: /setovers 1–25`
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
    return ctx.reply("⚠️ Overs must be between 1 and 25.");

  match.totalOvers = overs;
  match.maxWickets =
    (match.battingTeam === "A" ? match.teamA.length : match.teamB.length) - 1;
  match.phase = "set_striker";

  ctx.reply(
`[ OVERS SET ]  ${overs} overs

Set opening batter at striker end:
/batter number`
  );
});


/* EXPORT startToss */
helpers.startToss = startToss;

};