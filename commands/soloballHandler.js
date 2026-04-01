// ===============================================================
// SOLO BALL HANDLER — soloballHandler.js
// ===============================================================

const {
  randomLine,
  randomGif,
  getBowlingCall,
  getBattingCall,
  randomMilestoneLine,
} = require("../commentary");

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
      consecutiveTimeouts: 0,
    };
  }
  return match.stats[id];
}

/* ── Send animation/video with optional reply ── */
async function sendGif(groupId, gifId, text, replyToMsgId) {
  const extra = {
    caption:    text,
    parse_mode: "HTML",
    ...(replyToMsgId ? { reply_parameters: { message_id: replyToMsgId } } : {}),
  };
  try {
    await bot.telegram.sendAnimation(groupId, gifId, extra);
  } catch {
    try {
      await bot.telegram.sendVideo(groupId, gifId, extra);
    } catch {
      await bot.telegram.sendMessage(groupId, text, {
        parse_mode: "HTML",
        ...(replyToMsgId ? { reply_parameters: { message_id: replyToMsgId } } : {}),
      }).catch(() => {});
    }
  }
}

/* ── Send a disappearing emoji/text message ── */
async function sendDisappearingText(chatId, text, replyToMsgId, delayMs = 5000) {
  try {
    const msg = await bot.telegram.sendMessage(chatId, text, {
      parse_mode: "HTML",
      ...(replyToMsgId ? { reply_parameters: { message_id: replyToMsgId } } : {}),
    });
    if (msg) {
      setTimeout(() => bot.telegram.deleteMessage(chatId, msg.message_id).catch(() => {}), delayMs);
    }
  } catch { /* ignore */ }
}

/* ── Milestone check (50, 100) for a batter ── */
async function checkMilestone(match, prevRuns, newRuns) {
  if (prevRuns < 100 && newRuns >= 100) {
    const text = randomMilestoneLine("hundred") || "🥇 CENTURY!";
    const gif  = randomGif("hundred");
    if (gif) await sendGif(match.groupId, gif, text, null).catch(() => {});
    else await bot.telegram.sendMessage(match.groupId, text, { parse_mode: "HTML" }).catch(() => {});
  } else if (prevRuns < 50 && newRuns >= 50) {
    const text = randomMilestoneLine("fifty") || "🥈 FIFTY!";
    const gif  = randomGif("fifty");
    if (gif) await sendGif(match.groupId, gif, text, null).catch(() => {});
    else await bot.telegram.sendMessage(match.groupId, text, { parse_mode: "HTML" }).catch(() => {});
  }
}


/* ─────────────────────────────────────────
   TURN TIMER  (60s — same as team mode)
   30s warning at 30s elapsed
   10s warning at 50s elapsed
   Timeout  at 60s elapsed
───────────────────────────────────────── */

function startTurnTimer(match, type) {
  match.warning30 = setTimeout(async () => {
    const id   = type === "bowl" ? match.bowler : match.batter;
    const name = getSoloName(match, id);
    const still = type === "bowl" ? match.awaitingBowl : match.awaitingBat;
    if (still) {
      await bot.telegram.sendMessage(
        match.groupId,
        `${ping(id, name)} ⏳ 30s left`,
        { parse_mode: "HTML" }
      ).catch(() => {});
    }
  }, 30_000);

  match.warning10 = setTimeout(async () => {
    const id   = type === "bowl" ? match.bowler : match.batter;
    const name = getSoloName(match, id);
    const still = type === "bowl" ? match.awaitingBowl : match.awaitingBat;
    if (still) {
      await bot.telegram.sendMessage(
        match.groupId,
        `${ping(id, name)} 🚨 10s left`,
        { parse_mode: "HTML" }
      ).catch(() => {});
    }
  }, 50_000);

  match.ballTimer = setTimeout(() => ballTimeout(match, type), 60_000);
}


/* ─────────────────────────────────────────
   BALL TIMEOUT
───────────────────────────────────────── */

async function ballTimeout(match, type) {
  if (!match || match.matchEnded || match.phase !== "play") return;
  if (match.ballLocked) return;
  match.ballLocked = true;

  try {
    clearSoloTimers(match);

    /* ── Bowler timed out ── */
    if (match.awaitingBowl) {
      match.awaitingBowl = false;
      const s = ensureStats(match, match.bowler);
      s.consecutiveTimeouts = (s.consecutiveTimeouts || 0) + 1;

      if (s.consecutiveTimeouts >= 2) {
        s.timedOut = true;
        await bot.telegram.sendMessage(
          match.groupId,
          `⏱ <b>Bowler Removed</b>\n\n<blockquote>${getSoloName(match, match.bowler)} timed out twice and is removed.\nBall does not count.</blockquote>`,
          { parse_mode: "HTML" }
        ).catch(() => {});

        match.players = match.players.filter(p => p.id !== match.bowler);
        if (match.players.length < 2) { match.ballLocked = false; return endSoloMatch(match); }
        match.ballLocked = false;
        return advanceSolo(match, false, true);
      } else {
        await bot.telegram.sendMessage(
          match.groupId,
          `⏱ <b>Bowler Timed Out</b>\n\n<blockquote>${getSoloName(match, match.bowler)} did not bowl in time.\n⚠️ Warning ${s.consecutiveTimeouts}/2 — ball skipped, next bowler.</blockquote>`,
          { parse_mode: "HTML" }
        ).catch(() => {});
        match.ballLocked = false;
        return advanceSolo(match, false, true);
      }
    }

    /* ── Batter timed out ── */
    if (match.awaitingBat) {
      match.awaitingBat = false;
      const bs = ensureStats(match, match.batter);
      bs.consecutiveTimeouts = (bs.consecutiveTimeouts || 0) + 1;

      if (bs.consecutiveTimeouts >= 2) {
        // 2nd consecutive timeout → dismissed & removed from game
        const ws = ensureStats(match, match.bowler);
        ws.ballHistory.push("W");
        ws.ballsBowled++;
        ws.wickets++;
        match.ballsThisSet++;

        bs.timedOut = true;
        bs.out      = true;
        await bot.telegram.sendMessage(
          match.groupId,
          `⏱ <b>Batter Removed</b>\n\n<blockquote>${getSoloName(match, match.batter)} timed out twice and is permanently removed. OUT!</blockquote>`,
          { parse_mode: "HTML" }
        ).catch(() => {});
        match.players = match.players.filter(p => p.id !== match.batter);
        const alive = match.players.filter(p => !match.stats[p.id]?.out && !match.stats[p.id]?.timedOut);
        if (alive.length < 1 || match.players.length < 2) { match.ballLocked = false; return endSoloMatch(match); }
        match.ballLocked = false;
        return advanceSolo(match, true);
      } else {
        // 1st timeout → warning only, ball skipped (NOT out, NOT a wicket)
        await bot.telegram.sendMessage(
          match.groupId,
          `⏱ <b>Batter Timed Out</b>\n\n<blockquote>${getSoloName(match, match.batter)} did not bat in time.\n⚠️ Warning 1/2 — ball skipped. Next timeout = OUT!</blockquote>`,
          { parse_mode: "HTML" }
        ).catch(() => {});
        // Ball is skipped — advance without wicket, bowler set continues
        match.ballLocked = false;
        return advanceSolo(match, false);
      }
    }
  } catch (err) {
    console.error("[SOLO ballTimeout]", err.message);
    match.ballLocked = false;
  }
}


/* ─────────────────────────────────────────
   START BALL
   • Bowling call gif → DM to bowler
   • Ball announcement → Group (with DM button)
───────────────────────────────────────── */

async function startBall(match) {
  if (!match || match.matchEnded || match.phase !== "play") return;

  clearSoloTimers(match);

  match.batNumber       = null;
  match.bowlNumber      = null;
  match.ballLocked      = false;
  match.awaitingBowl    = true;
  match.awaitingBat     = false;
  match.batterMessageId = null;

  const bowlerName  = getSoloName(match, match.bowler);
  const ballDisplay = `Ball ${match.ballsThisSet + 1}/3`;

  /* ONE message: bowling call gif + ball number caption + DM button (exactly like team mode) */
  const call    = getBowlingCall();
  const caption = `🎯 <b>${ballDisplay}</b>\n\n${ping(match.bowler, bowlerName)} — ${call.text}`;
  const opts    = { caption, parse_mode: "HTML", ...bowlDMButton() };

  try {
    await bot.telegram.sendAnimation(match.groupId, call.gif, opts);
  } catch {
    try {
      await bot.telegram.sendVideo(match.groupId, call.gif, opts);
    } catch {
      await bot.telegram.sendMessage(match.groupId, caption, { parse_mode: "HTML", ...bowlDMButton() }).catch(() => {});
    }
  }

  startTurnTimer(match, "bowl");
}


/* ─────────────────────────────────────────
   PROCESS BALL
   • Result gif sent as REPLY to batter's group message
   • Batting call gif sent to group after bowler confirms
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

    // Successful play resets consecutive timeout counter for both
    bs.consecutiveTimeouts = 0;
    ws.consecutiveTimeouts = 0;

    const batterName = getSoloName(match, match.batter);
    const bowlerName = getSoloName(match, match.bowler);
    const replyTo    = match.batterMessageId || null;

    /* ══ WICKET ══ */
    if (bat === bowl) {
      bs.out = true;
      ws.wickets++;

      const commentLine = randomLine("wicket") || "";
      const isDuck      = bs.runs === 0;
      const gif         = randomGif(isDuck ? "duck" : "wicket");

      const text = isDuck
        ? `💀 <b>OUT!</b>  🦆 <b>DUCK!</b>\n\n<blockquote>🏏 ${batterName} dismissed for 0!\n🎯 b ${bowlerName}\n\n${commentLine}</blockquote>`
        : `💀 <b>OUT!</b>\n\n<blockquote>🏏 ${batterName} dismissed for ${bs.runs}!\n🎯 b ${bowlerName}\n\n${commentLine}</blockquote>`;

      const wicketEmoji = isDuck ? "💀" : "💀";
      if (gif) await sendGif(match.groupId, gif, text, replyTo);
      else await bot.telegram.sendMessage(match.groupId, text, {
        parse_mode: "HTML",
        ...(replyTo ? { reply_parameters: { message_id: replyTo } } : {}),
      }).catch(() => {});
      // Separate disappearing emoji reply to batter's number message
      await sendDisappearingText(match.groupId, wicketEmoji, replyTo, 6000).catch(() => {});

      // Bowling milestones
      await checkBowlerMilestone(match, ws).catch(() => {});

      const alive = match.players.filter(
        p => !match.stats[p.id]?.out && !match.stats[p.id]?.timedOut
      );
      if (alive.length < 1) return endSoloMatch(match);
      return advanceSolo(match, true);
    }

    /* ══ RUNS ══ */
    const prevRuns = bs.runs;
    bs.runs        += bat;
    ws.runsConceded += bat;
    if (bat === 4) bs.fours++;
    if (bat === 5) bs.fives++;
    if (bat === 6) bs.sixes++;

    const commentLine = randomLine(bat) || "";
    const gif         = randomGif(bat);

    const runLabel =
      bat === 6 ? "SIX! 🔥" :
      bat === 4 ? "FOUR! 🚀" :
      bat === 5 ? "FIVE! ⚡" :
      `${bat} run${bat > 1 ? "s" : ""}`;

    // Emoji shown as separate disappearing reply to batter's number
    const runEmoji =
      bat === 6 ? "🔥" :
      bat === 4 ? "💥"   :
      bat === 5 ? "⚡"   :
      bat === 3 ? "✅"  :
      bat === 2 ? "✅"    :
               "✅";

    const text = `⚡ <b>${runLabel}</b>\n\n<blockquote>🏏 ${batterName}: ${bs.runs} runs (${bs.balls} balls)\n${commentLine}</blockquote>`;

    if (gif) await sendGif(match.groupId, gif, text, replyTo);
    else await bot.telegram.sendMessage(match.groupId, text, {
      parse_mode: "HTML",
      ...(replyTo ? { reply_parameters: { message_id: replyTo } } : {}),
    }).catch(() => {});
    // Separate disappearing emoji reply to batter's number message
    await sendDisappearingText(match.groupId, runEmoji, replyTo, 5000).catch(() => {});

    // Batting milestones (50, 100)
    await checkMilestone(match, prevRuns, bs.runs).catch(() => {});

    return advanceSolo(match, false);

  } catch (err) {
    console.error("[SOLO processBall]", err.message);
  } finally {
    match.batNumber       = null;
    match.bowlNumber      = null;
    match.ballLocked      = false;
    match.batterMessageId = null;
  }
}

/* ── Bowler haul milestones ── */
async function checkBowlerMilestone(match, ws) {
  const w = ws.wickets;
  let text = null;
  let gif  = null;
  if      (w === 3) { text = randomMilestoneLine("threeFer"); gif = randomGif("hattrick"); }
  else if (w === 4) { text = randomMilestoneLine("fourFer");  gif = randomGif("wicket"); }
  else if (w === 5) { text = randomMilestoneLine("fiveFer");  gif = randomGif("wicket"); }
  else if (w >= 6)  { text = randomMilestoneLine("sixFer");   gif = randomGif("wicket"); }
  if (text) {
    if (gif) await sendGif(match.groupId, gif, text, null).catch(() => {});
    else await bot.telegram.sendMessage(match.groupId, text, { parse_mode: "HTML" }).catch(() => {});
  }
}


module.exports = { init, startBall, processBall, startTurnTimer };