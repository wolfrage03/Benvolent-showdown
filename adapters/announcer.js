async function announceBall(bot, match, helpers) {
  if (!match || !match.bowler || !match.striker) return;

  match.batNumber = null;
  match.bowlNumber = null;

  const bowlerName = helpers.getName(match, match.bowler);

  const bowlerPing =
    `[🎯 ${bowlerName}](tg://user?id=${match.bowler})`;

  await bot.telegram.sendMessage(
    match.groupId,
    `${bowlerPing}\n\n${helpers.randomBowlingPrompt()}`,
    {
      parse_mode: "Markdown",
      ...helpers.bowlDMButton()
    }
  );

  try {
    await bot.telegram.sendMessage(
      match.bowler,
      "Send number 1-6 in bot DM."
    );
  } catch (e) {}
}

async function announceScore(bot, match, helpers) {
  const text = helpers.buildScoreMessage(match);

  await bot.telegram.sendMessage(
    match.groupId,
    text,
    { parse_mode: "Markdown" }
  );
}

async function announceInningsSwitch(bot, match) {
  await bot.telegram.sendMessage(
    match.groupId,
    "🔁 Innings Over!\n\nSecond innings begins now!"
  );
}

async function announceWinner(bot, match) {
  let message;

  if (match.winner === "A") {
    message = "🏆 Team A Wins!";
  } else if (match.winner === "B") {
    message = "🏆 Team B Wins!";
  } else {
    message = "🤝 It's a Tie!";
  }

  await bot.telegram.sendMessage(match.groupId, message);
}

async function announceWicket(bot, match) {
  await bot.telegram.sendMessage(
    match.groupId,
    "💥 WICKET!"
  );
}

module.exports = {
  announceBall,
  announceScore,
  announceInningsSwitch,
  announceWinner,
  announceWicket
};