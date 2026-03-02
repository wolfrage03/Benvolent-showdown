const { getMatch } = require("../engine/matchEngine");

module.exports = function registerToss(bot) {

  bot.command("toss", async (ctx) => {

    const match = getMatch(ctx.chat.id);
    if (!match) return;

    if (ctx.chat.id !== match.groupId)
      return ctx.reply("⚠️ No active match.");

    if (match.phase !== "toss")
      return ctx.reply("⚠️ Toss not allowed now.");

  /* ================= START TOSS ================= */

  function startToss(match) {

    if (!match) return;

    match.phase = "toss";

    return bot.telegram.sendMessage(
      match.groupId,
      "🎲 Toss Time!\nCaptain choose Odd or Even:",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Odd", "toss_odd"),
          Markup.button.callback("Even", "toss_even")
        ]
      ])
    );
  }

  /* ================= ODD / EVEN ================= */

  bot.action(["toss_odd", "toss_even"], async (ctx) => {

    const match = getMatch(ctx.chat.id);
    if (!match || match.phase !== "toss")
      return ctx.answerCbQuery("Toss not active.");

    const captainA = match.captains.A;
    const captainB = match.captains.B;

    if (![captainA, captainB].includes(ctx.from.id))
      return ctx.answerCbQuery("Only captains can choose.");

    const choice =
      ctx.callbackQuery.data === "toss_odd" ? "odd" : "even";

    const tossNumber = Math.floor(Math.random() * 6) + 1;
    const result =
      tossNumber % 2 === 0 ? "even" : "odd";

    const chooser = ctx.from.id;

    const tossWinner =
      choice === result
        ? chooser
        : chooser === captainA
          ? captainB
          : captainA;

    match.tossWinner = tossWinner;
    match.phase = "batbowl";

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    await ctx.answerCbQuery();

    const winnerTeam =
      tossWinner === captainA ? "A" : "B";

    await bot.telegram.sendMessage(
      match.groupId,
`🎲 Toss Number: ${tossNumber} (${result})

🏆 Toss Winner: ${
  winnerTeam === "A"
    ? `${match.teamAName} (A)`
    : `${match.teamBName} (B)`
}

Choose Bat or Bowl:`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("🏏 Bat", "decision_bat"),
          Markup.button.callback("🎯 Bowl", "decision_bowl")
        ]
      ])
    );
  });

  /* ================= BAT / BOWL DECISION ================= */

  bot.action(["decision_bat", "decision_bowl"], async (ctx) => {

    const match = getMatch(ctx.chat.id);

    if (!match || match.phase !== "batbowl")
      return ctx.answerCbQuery("Not allowed.");

    if (ctx.from.id !== match.tossWinner)
      return ctx.answerCbQuery("Only toss winner decides.");

    const decision =
      ctx.callbackQuery.data === "decision_bat"
        ? "bat"
        : "bowl";

    const tossWinnerTeam =
      ctx.from.id === match.captains.A ? "A" : "B";

    const otherTeam =
      tossWinnerTeam === "A" ? "B" : "A";

    if (decision === "bat") {
      match.battingTeam = tossWinnerTeam;
      match.bowlingTeam = otherTeam;
    } else {
      match.bowlingTeam = tossWinnerTeam;
      match.battingTeam = otherTeam;
    }

    match.innings = 1;
    match.score = 0;
    match.wickets = 0;
    match.currentOver = 0;
    match.currentBall = 0;

    match.phase = "setovers";

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    await ctx.answerCbQuery();

    await bot.telegram.sendMessage(
      match.groupId,
`📢 Toss Decision Confirmed

🏏 ${
  match.battingTeam === "A"
    ? `${match.teamAName} (A)`
    : `${match.teamBName} (B)`
} Batting First

Host set overs:
/setovers 1-25`
    );
  });

  return { startToss };
};