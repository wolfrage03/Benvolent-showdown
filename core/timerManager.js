const timers = new Map();

function clearTimers(match) {
  if (!match) return;

  if (match.warning30) {
    clearTimeout(match.warning30);
    match.warning30 = null;
  }

  if (match.warning10) {
    clearTimeout(match.warning10);
    match.warning10 = null;
  }

  if (match.ballTimer) {
    clearTimeout(match.ballTimer);
    match.ballTimer = null;
  }
}

function startBallTimer(match, on30, on10, onTimeout) {
  if (!match) return;

  clearTimers(match);

  match.warning30 = setTimeout(() => {
    if (on30) on30();
  }, 30000);

  match.warning10 = setTimeout(() => {
    if (on10) on10();
  }, 50000);

  match.ballTimer = setTimeout(() => {
    if (onTimeout) onTimeout();
  }, 60000);
}

module.exports = {
  clearTimers,
  startBallTimer

// ================= TIMER CONTROLLER =================

function startTurnTimer(match, type) {

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

  match.ballTimer = setTimeout(() => ballTimeout(match), 60000);
}



};
module.exports = {
  startTimer,
  clearTimer
};