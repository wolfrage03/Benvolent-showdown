// ===============================================================
// SOLO BALL HANDLER
// ===============================================================
// Handles startBall, processBall, turn timers, and ball timeout
// for solo mode. Injected deps via init() — same pattern as the
// existing ballHandler.js so the architecture stays consistent.
// ===============================================================

let bot, getSoloName, clearSoloTimers, advanceSolo, endSoloMatch;

function init(deps) {
  bot             = deps.bot;
  getSoloName     = deps.getSoloName;
  clearSoloTimers = deps.clearSoloTimers;
  advanceSolo     = deps.advanceSolo;
  endSoloMatch    = deps.endSoloMatch;
}


/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */

function ping(id, name) {
  return `<a href="tg://user?id=${id}">${name}</a>`;
}

function bowlDMButton() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎯 Send Ball in DM", url: "https://t.me/Benevolent_Cricket_bot" }]
      ]
    }
  };
}


/* ─────────────────────────────────────────
   TURN TIMER
   Warns at 30 s, 10 s, times out at 60 s.
───────────────────────────────────────── */

function startTurnTimer(match, type) {
  match.warning30 = setTimeout(async () => {
    const id   = type === "bowl" ? match.bowler : match.batter;
    const name = getSoloName(match, id);
    if ((type === "bowl" && match.awaitingBowl) ||
        (type === "bat"  && match.awaitingBat)) {
      await bot.telegram.sendMessage(
        match.groupId,
        `${ping(id, name)} ⏳ 30s left`,
        { parse_mode: "HTML" }
      );
    }
  }, 30000);

  match.warning10 = setTimeout(async () => {
    const id   = type === "bowl" ? match.bowler : match.batter;
    const name = getSoloName(match, id);
    if ((type === "bowl" && match.awaitingBowl) ||
        (type === "bat"  && match.awaitingBat)) {
      await bot.telegram.sendMessage(
        match.groupId,
        `${ping(id, name)} 🚨 10s left`,
        { parse_mode: "HTML" }
      );
    }
  }, 50000);

  match.ballTimer = setTimeout(() => ballTimeout(match), 60000);
}


/* ─────────────────────────────────────────
   BALL TIMEOUT
───────────────────────────────────────── */

async function ballTimeout(match) {
  if (!match || match.matchEnded || match.phase === "idle") return;
  if (match.ballLocked) return;
  match.ballLocked = true;

  try {
    clearSoloTimers(match);

    /* ── Bowler timed out ── */
    if (match.awaitingBowl) {
      match.awaitingBowl = false;

      await bot.telegram.sendMessage(
        match.groupId,
        "⏱ Bowler Timed Out\n\n<blockquote>Ball does not count — re-bowling</blockquote>",
        { parse_mode: "HTML" }
      );

      match.ballLocked = false;
      return startBall(match);
    }

    /* ── Batter timed out ── */
    if (match.awaitingBat) {
      match.awaitingBat = false;

      if (!match.stats[match.batter])
        match.stats[match.batter] = { runs: 0, balls: 0, wickets: 0, out: false, ballsBowled: 0 };

      match.stats[match.batter].balls++;
      // -6 penalty, floor at 0
      match.stats[match.batter].runs = Math.max(0, (match.stats[match.batter].runs || 0) - 6);

      await bot.telegram.sendMessage(
        match.groupId,
        "⏱ Batter Timed Out\n\n<blockquote>-6 run penalty\nBall counted</blockquote>",
        { parse_mode: "HTML" }
      );

      match.ballLocked = false;
      return advanceSolo(match, false);
    }

  } catch (err) {
    console.error("[SOLO ballTimeout]", err.message);
    match.ballLocked = false;
  }
}


/* ─────────────────────────────────────────
   START BALL
   Prompts the bowler to send their number in DM.
───────────────────────────────────────── */

async function startBall(match) {
  if (!match || match.matchEnded || match.phase !== "play") return;

  clearSoloTimers(match);

  match.batNumber       = null;
  match.bowlNumber      = null;
  match.ballLocked      = false;
  match.awaitingBowl    = true;
  match.awaitingBat     = false;
  match.strikerMessageId = null;

  const batterName  = getSoloName(match, match.batter);
  const bowlerName  = getSoloName(match, match.bowler);
  const ballDisplay = `Ball ${match.ballsThisSet + 1}/3`;

  await bot.telegram.sendMessage(
    match.groupId,
`🎯 <b>${ballDisplay}</b>\n\n<blockquote>🏏 ${batterName}  batting\n🎯 ${bowlerName}  bowling</blockquote>\n\n${ping(match.bowler, bowlerName)} — send your number in DM 👇`,
    { parse_mode: "HTML", ...bowlDMButton() }
  );

  startTurnTimer(match, "bowl");
}


/* ─────────────────────────────────────────
   PROCESS BALL
   Called once both bat and bowl numbers are in.
───────────────────────────────────────── */

async function processBall(match) {
  if (!match) return;
  if (match.batNumber === null || match.bowlNumber === null) return;

  clearSoloTimers(match);

  try {
    const bat  = parseInt(match.batNumber);
    const bowl = parseInt(match.bowlNumber);

    // Ensure stat objects exist
    if (!match.stats[match.batter])
      match.stats[match.batter] = { runs: 0, balls: 0, wickets: 0, out: false, ballsBowled: 0 };
    if (!match.stats[match.bowler])
      match.stats[match.bowler] = { runs: 0, balls: 0, wickets: 0, out: false, ballsBowled: 0 };

    match.stats[match.batter].balls++;
    match.stats[match.bowler].ballsBowled++;
    match.ballsThisSet++;

    const batterName = getSoloName(match, match.batter);
    const bowlerName = getSoloName(match, match.bowler);

    /* ══════════ WICKET ══════════ */
    if (bat === bowl) {
      match.stats[match.batter].out = true;
      match.stats[match.bowler].wickets++;

      await bot.telegram.sendMessage(
        match.groupId,
`💀 <b>OUT!</b>\n\n<blockquote>🏏 ${batterName} dismissed!\n🎯 b ${bowlerName}</blockquote>`,
        { parse_mode: "HTML" }
      );

      // Check if all players are out
      const outCount = match.players.filter(p => match.stats[p.id]?.out).length;
      if (outCount >= match.players.length) {
        return endSoloMatch(match);
      }

      return advanceSolo(match, true);
    }

    /* ══════════ RUNS ══════════ */
    match.stats[match.batter].runs += bat;
    // Track runs conceded by bowler
    if (!match.stats[match.bowler].runsConceded)
      match.stats[match.bowler].runsConceded = 0;
    match.stats[match.bowler].runsConceded += bat;

    const runLabel =
      bat === 0 ? "Dot ball 🔵" :
      bat === 6 ? "SIX! 🔥" :
      bat === 4 ? "FOUR! 🚀" :
      bat === 5 ? "FIVE! ⚡" :
      `${bat} run${bat > 1 ? "s" : ""}`;

    await bot.telegram.sendMessage(
      match.groupId,
`⚡ <b>${runLabel}</b>\n\n<blockquote>🏏 ${batterName}: ${match.stats[match.batter].runs} runs (${match.stats[match.batter].balls} balls)</blockquote>`,
      { parse_mode: "HTML" }
    );

    return advanceSolo(match, false);

  } catch (err) {
    console.error("[SOLO processBall]", err.message);
  } finally {
    match.batNumber  = null;
    match.bowlNumber = null;
    match.ballLocked = false;
  }
}


/* ─────────────────────────────────────────
   EXPORTS
───────────────────────────────────────── */

module.exports = { init, startBall, processBall, startTurnTimer };