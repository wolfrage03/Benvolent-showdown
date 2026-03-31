// ===============================================================
// SOLO BALL HANDLER
// ===============================================================

let bot, getSoloName, clearSoloTimers, advanceSolo, endSoloMatch;

function init(deps) {
  bot             = deps.bot;
  getSoloName     = deps.getSoloName;
  clearSoloTimers = deps.clearSoloTimers;
  advanceSolo     = deps.advanceSolo;
  endSoloMatch    = deps.endSoloMatch;
}

/* ── helpers ── */

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

function ensureStats(match, id) {
  if (!match.stats[id]) {
    match.stats[id] = {
      runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0,
      wickets: 0, out: false,
      ballsBowled: 0, runsConceded: 0,
      ballHistory: [],
      timedOut: false,
    };
  }
  return match.stats[id];
}


/* ─────────────────────────────────────────
   TURN TIMER
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
      ).catch(() => {});
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
      ).catch(() => {});
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
      const s = ensureStats(match, match.bowler);
      s.timedOut = true;

      await bot.telegram.sendMessage(
        match.groupId,
        `⏱ <b>Bowler Timed Out</b>\n\n<blockquote>${getSoloName(match, match.bowler)} is removed from the game.\nBall does not count — rotating bowler.</blockquote>`,
        { parse_mode: "HTML" }
      ).catch(() => {});

      // Remove bowler from active players
      match.players = match.players.filter(p => p.id !== match.bowler);

      if (match.players.length < 2) {
        match.ballLocked = false;
        return endSoloMatch(match);
      }

      match.ballLocked = false;
      return advanceSolo(match, false, true); // forceRotate = true
    }

    /* ── Batter timed out ── */
    if (match.awaitingBat) {
      match.awaitingBat = false;
      const s = ensureStats(match, match.batter);
      s.timedOut = true;
      s.out = true;

      await bot.telegram.sendMessage(
        match.groupId,
        `⏱ <b>Batter Timed Out</b>\n\n<blockquote>${getSoloName(match, match.batter)} is out due to timeout.</blockquote>`,
        { parse_mode: "HTML" }
      ).catch(() => {});

      // Also record W in bowler history for the timeout ball
      const bs = ensureStats(match, match.bowler);
      bs.ballHistory.push("W");
      bs.ballsBowled++;
      match.ballsThisSet++;

      const outCount = match.players.filter(p => match.stats[p.id]?.out).length;
      if (outCount >= match.players.length) {
        match.ballLocked = false;
        return endSoloMatch(match);
      }

      match.ballLocked = false;
      return advanceSolo(match, true);
    }

  } catch (err) {
    console.error("[SOLO ballTimeout]", err.message);
    match.ballLocked = false;
  }
}


/* ─────────────────────────────────────────
   START BALL
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
  ).catch(e => console.error("[SOLO startBall]", e.message));

  startTurnTimer(match, "bowl");
}


/* ─────────────────────────────────────────
   PROCESS BALL
───────────────────────────────────────── */

async function processBall(match) {
  if (!match) return;
  if (match.batNumber === null || match.bowlNumber === null) return;

  clearSoloTimers(match);

  try {
    const bat  = parseInt(match.batNumber);
    const bowl = parseInt(match.bowlNumber);

    const bs = ensureStats(match, match.batter);
    const ws = ensureStats(match, match.bowler);

    bs.balls++;
    ws.ballsBowled++;
    ws.ballHistory.push(bat === bowl ? "W" : bat);
    match.ballsThisSet++;

    const batterName = getSoloName(match, match.batter);
    const bowlerName = getSoloName(match, match.bowler);

    /* ══ WICKET ══ */
    if (bat === bowl) {
      bs.out = true;
      ws.wickets++;

      await bot.telegram.sendMessage(
        match.groupId,
`💀 <b>OUT!</b>\n\n<blockquote>🏏 ${batterName} dismissed!\n🎯 b ${bowlerName}</blockquote>`,
        { parse_mode: "HTML" }
      ).catch(() => {});

      const outCount = match.players.filter(p => match.stats[p.id]?.out).length;
      if (outCount >= match.players.length) return endSoloMatch(match);

      return advanceSolo(match, true);
    }

    /* ══ RUNS ══ */
    bs.runs += bat;
    ws.runsConceded += bat;
    if (bat === 4) bs.fours++;
    if (bat === 5) bs.fives++;
    if (bat === 6) bs.sixes++;

    const runLabel =
      bat === 0 ? "Dot 🔵" :
      bat === 6 ? "SIX! 🔥" :
      bat === 4 ? "FOUR! 🚀" :
      bat === 5 ? "FIVE! ⚡" :
      `${bat} run${bat > 1 ? "s" : ""}`;

    await bot.telegram.sendMessage(
      match.groupId,
`⚡ <b>${runLabel}</b>\n\n<blockquote>🏏 ${batterName}: ${bs.runs} runs (${bs.balls} balls)</blockquote>`,
      { parse_mode: "HTML" }
    ).catch(() => {});

    return advanceSolo(match, false);

  } catch (err) {
    console.error("[SOLO processBall]", err.message);
  } finally {
    match.batNumber  = null;
    match.bowlNumber = null;
    match.ballLocked = false;
  }
}


module.exports = { init, startBall, processBall, startTurnTimer };