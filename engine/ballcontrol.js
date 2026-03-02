const bot = require("../bot");
const { getName } = require("../utils/helpers");
const { clearTimers } = require("../utils/match");
const { randomBowlingPrompt } = require("../utils/commentary");

/* ================= SAFE PHASE SETTER ================= */

function setPhase(match, newPhase) {
  if (!match) return;
  console.log(`PHASE: ${match.phase} → ${newPhase}`);
  match.phase = newPhase;
}

/* ================= ANNOUNCE BALL ================= */

async function announceBall(match) {

  if (!match || !match.bowler || !match.striker) return;

  match.batNumber = null;
  match.bowlNumber = null;

  const bowlerPing =
    `[🎯 ${getName(match, match.bowler)}](tg://user?id=${match.bowler})`;

  await bot.telegram.sendMessage(
    match.groupId,
    `${bowlerPing}\n\n${randomBowlingPrompt()}`,
    { parse_mode: "Markdown" }
  );

  try {
    await bot.telegram.sendMessage(
      match.bowler,
      "Send number 1-6 in private chat."
    );
  } catch {}
}

/* ================= TIMER ================= */

function startTurnTimer(match, type) {

  if (!match) return;

  match.warning30 = setTimeout(() => {
    if ((type === "bowl" && match.awaitingBowl) ||
        (type === "bat" && match.awaitingBat)) {

      bot.telegram.sendMessage(
        match.groupId,
        `⚠️ ${type === "bowl" ? "Bowler" : "Batter"}: 30 seconds left!`
      );
    }
  }, 30000);

  match.warning10 = setTimeout(() => {
    if ((type === "bowl" && match.awaitingBowl) ||
        (type === "bat" && match.awaitingBat)) {

      bot.telegram.sendMessage(
        match.groupId,
        `⏳ ${type === "bowl" ? "Bowler" : "Batter"}: 10 seconds left!`
      );
    }
  }, 50000);

  // 🔥 Timeout only triggers game engine via event
  match.ballTimer = setTimeout(() => {
    if (match.onBallTimeout) {
      match.onBallTimeout();
    }
  }, 60000);
}

module.exports = {
  announceBall,
  startTurnTimer,
  setPhase
};