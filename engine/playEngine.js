// engine/playEngine.js

const bot = require("../bot");
const { getMatch, clearTimers } = require("../utils/match");
const { announceBall, startTurnTimer } = require("./ballController");
const { endInnings, checkChaseEnd } = require("./resultEngine");
const { getName, randomLine, randomBatterPrompt } = require("../utils/helpers");

/* ================= STRIKE SWAP ================= */

function swapStrike(match) {
  [match.striker, match.nonStriker] =
    [match.nonStriker, match.striker];
}

/* ================= START BALL ================= */

async function startBall(match) {

  if (!match || match.resultDeclared) return;
  if (!match.bowler) return;
  if (!match.striker) return;
  if (match.phase === "switch") return;

  if (match.currentOver >= match.totalOvers)
    return await endInnings(match);

  if (match.wickets >= match.maxWickets)
    return await endInnings(match);

  clearTimers(match);

  match.awaitingBowl = true;
  match.awaitingBat = false;
  match.phase = "play";

  match.onBallTimeout = () => ballTimeoutHandler(match);

  await announceBall(match);
  startTurnTimer(match, "bowl");
}

/* ================= REGISTER INPUT ================= */

function registerInputHandler() {

  bot.on("text", async (ctx, next) => {

    if (ctx.message.text.startsWith("/"))
      return next();

    const match = getMatch(ctx);
    if (!match || match.resultDeclared) return;

    /* ===== GROUP BAT INPUT ===== */

    if (ctx.chat.type !== "private") {

      if (match.phase !== "play") return;
      if (!match.awaitingBat) return;

      if (ctx.from.id !== match.striker)
        return ctx.reply("❌ You are not the striker.");

      const text = ctx.message.text.trim();

      if (!/^[0-6]$/.test(text))
        return ctx.reply("❌ Send number between 0-6.");

      match.batNumber = Number(text);
      match.awaitingBat = false;

      clearTimers(match);
      return processBall(match);
    }

    /* ===== PRIVATE BOWLER INPUT ===== */

    if (ctx.chat.type === "private") {

      if (match.phase !== "play")
        return ctx.reply("⚠️ Match is not currently playing.");

      if (!match.awaitingBowl)
        return ctx.reply("⏳ Not accepting bowl right now.");

      if (!match.bowler)
        return ctx.reply("⚠️ No bowler selected.");

      if (ctx.from.id !== match.bowler)
        return ctx.reply("❌ You are not the current bowler.");

      const text = ctx.message.text.trim();

      if (!/^[1-6]$/.test(text))
        return ctx.reply("❌ Send number between 1-6.");

      match.bowlNumber = Number(text);
      match.awaitingBowl = false;
      match.awaitingBat = true;

      clearTimers(match);

      await ctx.reply("✅ Ball submitted!");

      const batterPing =
        `[🏏 ${getName(match.striker)}](tg://user?id=${match.striker})`;

      const ballNumber =
        `${match.currentOver}.${match.currentBall + 1}`;

      await bot.telegram.sendMessage(
        match.groupId,
        `${batterPing}

${randomBatterPrompt()}

🎱 Ball: ${ballNumber}`,
        { parse_mode: "Markdown" }
      );

      startTurnTimer(match, "bat");
      return;
    }
  });
}

/* ================= OVER COMPLETION ================= */

async function handleOverCompletion(match) {

  if (match.currentBall < 6) return false;

  if (match.currentOverRuns === 0) {
    await bot.telegram.sendMessage(
      match.groupId,
      `🎯 ${getName(match.bowler)}\nMaiden Over!`
    );
  }

  match.currentOver++;
  match.currentBall = 0;
  match.currentOverRuns = 0;
  match.wicketStreak = 0;

  if (match.currentOver >= match.totalOvers)
    return await endInnings(match);

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

/* ================= PROCESS BALL ================= */

async function processBall(match) {

  if (!match || match.ballLocked || match.resultDeclared) return;

  match.ballLocked = true;

  try {

    clearTimers(match);

    if (match.batNumber == null ||
        match.bowlNumber == null)
      return;

    const bat = Number(match.batNumber);
    const bowl = Number(match.bowlNumber);

    if (Number.isNaN(bat) || Number.isNaN(bowl))
      return;

    /* ===== INIT PARTNERSHIP IF MISSING ===== */

    if (!match.currentPartnershipRuns)
      match.currentPartnershipRuns = 0;

    if (!match.currentPartnershipBalls)
      match.currentPartnershipBalls = 0;

    /* ===== WICKET ===== */

    if (bat === bowl) {

      match.wickets++;
      match.wicketStreak++;
      match.currentBall++;

      match.partnershipMilestones = {};
      match.currentPartnershipRuns = 0;
      match.currentPartnershipBalls = 0;

      await bot.telegram.sendMessage(
        match.groupId,
        randomLine("wicket")
      );

      if (match.wickets >= match.maxWickets)
        return await endInnings(match);

      if (await handleOverCompletion(match)) return;

      match.phase = "new_batter";

      await bot.telegram.sendMessage(
        match.groupId,
        "📢 Send new batter:\n/batter number"
      );

      return;
    }

    /* ===== RUNS ===== */

    match.score += bat;
    match.currentOverRuns += bat;
    match.currentBall++;
    match.wicketStreak = 0;

    match.currentPartnershipRuns += bat;
    match.currentPartnershipBalls++;

    await bot.telegram.sendMessage(
      match.groupId,
      randomLine(bat)
    );

    /* ===== PARTNERSHIP MILESTONES ===== */

    if (!match.partnershipMilestones)
      match.partnershipMilestones = {};

    const milestones = [50, 100, 150, 200];

    for (const mark of milestones) {

      if (
        match.currentPartnershipRuns >= mark &&
        !match.partnershipMilestones[mark]
      ) {
        match.partnershipMilestones[mark] = true;

        await bot.telegram.sendMessage(
          match.groupId,
          mark === 100
            ? `💯 ${mark} Run Partnership!`
            : `🔥 ${mark} Run Partnership!`
        );
      }
    }

    /* ===== STRIKE ROTATION ===== */

    if ([1,3,5].includes(bat))
      swapStrike(match);

    /* ===== CHASE CHECK ===== */

    if (await checkChaseEnd(match)) return;

    /* ===== OVER CHECK ===== */

    if (await handleOverCompletion(match)) return;

    /* ===== NEXT BALL ===== */

    startBall(match);

  } catch (err) {
    console.error("processBall error:", err);
  } finally {
    match.ballLocked = false;
    match.batNumber = null;
    match.bowlNumber = null;
  }
}
/* ================= BALL TIMEOUT HANDLER ================= */

async function ballTimeoutHandler(match) {

  if (!match || match.resultDeclared) return;
  if (match.ballLocked) return;

  match.ballLocked = true;

  try {

    clearTimers(match);

    // If bowler didn’t respond
    if (match.awaitingBowl) {

      match.awaitingBowl = false;
      match.score += 6;

      await bot.telegram.sendMessage(
        match.groupId,
        "⚠️ Bowler missed!\n+6 runs awarded (Ball NOT counted)"
      );

      return;
    }

    // If batter didn’t respond
    if (match.awaitingBat) {

      match.awaitingBat = false;
      match.currentBall++;
      match.wickets++;

      await bot.telegram.sendMessage(
        match.groupId,
        "⚠️ Batter missed!\nOUT due to delay."
      );

      if (match.wickets >= match.maxWickets)
        return await endInnings(match);

      match.phase = "new_batter";

      await bot.telegram.sendMessage(
        match.groupId,
        "📢 Send new batter:\n/batter number"
      );
    }

  } catch (err) {
    console.error("ballTimeoutHandler error:", err);
  } finally {
    match.ballLocked = false;
    match.batNumber = null;
    match.bowlNumber = null;
  }
}
module.exports = {
  startBall,
  processBall,
  handleOverCompletion,
  registerInputHandler
};