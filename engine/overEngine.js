const { swapStrike, getName } = require("../utils/helpers");
const { randomLine } = require("../utils/commentary");
const { endInnings } = require("./resultEngine");
const { clearTimers } = require("../utils/match");

async function handleOverCompletion(bot, match) {

  if (!match) return false;

  // Must have 6 balls
  if (match.currentBall < 6) return false;

  // Maiden over
  if (match.currentOverRuns === 0) {
    await bot.telegram.sendMessage(
      match.groupId,
      `🎯 ${getName(match, match.bowler)}\n${randomLine("maiden")}`
    );
  }

  // Over increment
  match.currentOver++;
  match.currentBall = 0;
  match.currentOverRuns = 0;
  match.wicketStreak = 0;

  // End match if overs finished
  if (match.currentOver >= match.totalOvers) {
    clearTimers(match);
    await endInnings(match);   // ✅ FIXED
    return true;
  }

  // Prepare next over
  match.lastOverBowler = match.bowler;

  swapStrike(match);

  match.phase = "set_bowler";
  match.awaitingBat = false;
  match.awaitingBowl = false;

  await bot.telegram.sendMessage(
    match.groupId,
`🔄 Over Completed!
Score: ${match.score}/${match.wickets}

🎯 Send new bowler:
/bowler number`
  );

  return true;
}

module.exports = { handleOverCompletion };