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
box("🎲 Toss Time", `🔵 〔Team A〕 ${match.teamAName}`, `🔴 〔Team B〕 ${match.teamBName}`, "───────────", "Captains choose odd or even.", "A number will be rolled."),
    {
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

  await ctx.answerCbQuery();

  const match = getMatch(ctx);
  if (!match || match.phase !== "toss") return;

  const captainA = match.captains.A;
  const captainB = match.captains.B;

  if (![captainA, captainB].includes(ctx.from.id))
    return ctx.answerCbQuery("Only captains can choose.");

  const choice     = ctx.callbackQuery.data === "toss_odd" ? "odd" : "even";
  const tossNumber = Math.floor(Math.random() * 6) + 1;
  const result     = tossNumber % 2 === 0 ? "even" : "odd";
  const chooser    = ctx.from.id;

  const tossWinner =
    choice === result
      ? chooser
      : chooser === captainA ? captainB : captainA;

  match.tossWinner = tossWinner;
  match.phase      = "batbowl";

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  const winnerTeam = tossWinner === captainA ? "A" : "B";
  const winnerName = winnerTeam === "A" ? match.teamAName : match.teamBName;

  // ── Telegram native dice animation ──
  // sendDice returns the rolled value (1-6), animation plays automatically
  const diceMsg = await bot.telegram.sendDice(match.groupId, { emoji: "🎲" });
  const rolledValue = diceMsg.dice.value;
  const diceResult  = rolledValue % 2 === 0 ? "even" : "odd";
  const diceWinner  = choice === diceResult
    ? chooser
    : chooser === captainA ? captainB : captainA;
  match.tossWinner = diceWinner;
  const winnerTeamFinal = diceWinner === captainA ? "A" : "B";

  // Wait for the dice animation to finish (~4 seconds)
  await new Promise(res => setTimeout(res, 4000));

  await bot.telegram.sendMessage(
    match.groupId,
box("🎲 Toss Result", `🎯 Rolled ${rolledValue}   ${diceResult}`, `🏆 〔Team ${winnerTeamFinal}〕 ${winnerTeamFinal === "A" ? match.teamAName : match.teamBName} won!`, "───────────", "Choose to bat or bowl:"),
    {
      reply_markup: {
        inline_keyboard: [[
          { text: "🏏 Bat",  callback_data: "decision_bat"  },
          { text: "🎯 Bowl", callback_data: "decision_bowl" }
        ]]
      }
    }
  );
});


/* ================= BAT / BOWL DECISION ================= */

bot.action(["decision_bat", "decision_bowl"], async (ctx) => {

  await ctx.answerCbQuery();

  const match = getMatch(ctx);
  if (!match || match.phase !== "batbowl") return;

  if (ctx.from.id !== match.tossWinner)
    return ctx.answerCbQuery("Only toss winner decides.");

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
box("✅ Match Setup", `🏏 〔Team ${match.battingTeam}〕 ${battingName}  batting`, `🎯 〔Team ${match.bowlingTeam}〕 ${bowlingName}  bowling`, "───────────", "👉 /setovers [1–25] to set overs"),
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
box("⚙️ Overs Set", `Overs: ${overs}`, `🏏 〔Team ${match.battingTeam}〕 ${battingName}  batting`, `🎯 〔Team ${match.bowlingTeam}〕 ${bowlingName}  bowling`, "───────────", "👉 /batter [number] set opener"),
  );
});


/* ================= EXPORT startToss ================= */

helpers.startToss = startToss;

};