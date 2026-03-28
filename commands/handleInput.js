const { getMatch } = require("../matchManager");
const { getBattingCall } = require("../commentary");
const ballHandler = require("../utils/ballHandler");

module.exports = function (bot, helpers) {

  const { getName, clearTimers } = helpers;


  /* ================= HANDLE TEXT INPUT ================= */

  bot.on("text", async (ctx, next) => {

    if (ctx.message.text.startsWith("/")) return next();

    const match = getMatch(ctx);
    if (!match) return next();

    const text = ctx.message.text.trim();

    /* GROUP BATTER INPUT */
    if (ctx.chat.type !== "private") {

      const ballInProgress = match.awaitingBowl || match.awaitingBat;
      if (!ballInProgress) return;

      if (ctx.from.id !== match.striker) return;

      if (!/^[0-6]$/.test(text))
        return ctx.reply("❌ Send a number between 0–6.");

      if (!match.awaitingBat)
        return ctx.reply("⏳ Wait for bowler to send the ball first.");

      if (match.ballLocked)
        return ctx.reply("⏳ Processing previous ball — please wait");

      match.batNumber = Number(text);
      match.awaitingBat = false;

      if (match.bowlNumber === null) return;

      match.ballLocked = true;
      clearTimers(match);
      return ballHandler.processBall(match);
    }

    /* PRIVATE BOWLER INPUT */
    if (match.phase !== "play")
      return ctx.reply("⚠️ No active ball.");

    if (!match.awaitingBowl)
      return ctx.reply("⏳ Not accepting bowl now.");

    if (ctx.from.id !== match.bowler)
      return ctx.reply("❌ You are not the current bowler.");

    if (!/^[1-6]$/.test(text))
      return ctx.reply("❌ Send a number between 1–6.");

    clearTimers(match);

    match.bowlNumber = Number(text);
    match.awaitingBowl = false;

    if (match.batNumber !== null) {
      match.awaitingBat = false;
      match.ballLocked = true;
      clearTimers(match);
      await ctx.reply(`✅ Submitted`);
      return ballHandler.processBall(match);
    }

    match.awaitingBat = true;
    match.ballLocked = false;

    await ctx.reply(`✅ Submitted — waiting for batter`);

    const ballNumber = `${match.currentOver}.${match.currentBall + 1}`;

    const battingCall = getBattingCall();
    const strikerName = getName(match, match.striker);
    const strikerPing = `<a href="tg://user?id=${match.striker}">${strikerName}</a>`;
    const batCaption  = `${strikerPing} 🏏 Ball: ${ballNumber}\n${battingCall.text}`;

    if (battingCall.gif) {
      try {
        await bot.telegram.sendVideo(match.groupId, battingCall.gif, { caption: batCaption, parse_mode: "HTML", supports_streaming: true });
      } catch (e) {
        console.error("Batting gif failed:", e.message);
        await bot.telegram.sendMessage(match.groupId, batCaption, { parse_mode: "HTML" });
      }
    } else {
      await bot.telegram.sendMessage(match.groupId, batCaption, { parse_mode: "HTML" });
    }

    ballHandler.startTurnTimer(match, "bat");
  });

};