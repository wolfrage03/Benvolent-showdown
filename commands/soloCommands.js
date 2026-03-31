// ===============================================================
// SOLO COMMANDS — soloCommands.js
// ===============================================================

const {
  soloMatches,
  soloPlayerActive,
  getSoloMatch,
  resetSoloMatch,
  deleteSoloMatch,
} = require("./soloMatchManager");

const soloBallHandler    = require("./soloballHandler");
const generateSoloScorecard = require("./soloScorecard");

const {
  saveSoloMatchStats,
  determineMOTM,
  getSoloStatsText,
} = require("./soloStats");

const User = require("../User");

module.exports = function registerSoloCommands(bot, helpers) {
  const { isUserBanned } = helpers;

  /* ─── tiny helpers ─── */

  const getSoloName = (match, id) =>
    (match?.allPlayers || match?.players || []).find(p => p.id === id)?.name || "Player";

  const ping = (id, name) => `<a href="tg://user?id=${id}">${name}</a>`;

  const clearSoloTimers = (m) => {
    if (!m) return;
    ["warning30", "warning10", "ballTimer"].forEach(k => {
      if (m[k]) { clearTimeout(m[k]); m[k] = null; }
    });
  };

  const clearLobbyTimers = (m) => {
    if (!m) return;
    ["joinTimer", "alert60", "alert30"].forEach(k => {
      if (m[k]) { clearTimeout(m[k]); m[k] = null; }
    });
  };

  /* ─── rotation ─── */

  const nextIndex = (match, after, type) => {
    const n = match.players.length;
    for (let i = 1; i < n; i++) {
      const idx = (after + i) % n;
      const p   = match.players[idx];
      if (
        !match.stats[p.id]?.out &&
        !match.stats[p.id]?.timedOut &&
        (type !== "bowler" || idx !== match.batterIndex)
      ) return idx;
    }
    return -1;
  };

  async function rotateBowler(match) {
    match.ballsThisSet = 0;
    match.setCount++;

    const next = nextIndex(match, match.bowlerIndex, "bowler");
    if (next === -1) return endSoloMatch(match);

    match.bowlerIndex = next;
    match.bowler      = match.players[next].id;

    await bot.telegram.sendMessage(
      match.groupId,
      `🔄 <b>New Bowler</b>\n\n<blockquote>🎯 ${getSoloName(match, match.bowler)} now bowling (3 balls)</blockquote>`,
      { parse_mode: "HTML" }
    ).catch(() => {});

    return soloBallHandler.startBall(match);
  }

  async function advanceSolo(match, wicket = false, force = false) {
    if (!match || match.matchEnded) return;

    const alive = match.players.filter(
      p => !match.stats[p.id]?.out && !match.stats[p.id]?.timedOut
    );
    if (alive.length <= 1) return endSoloMatch(match);
    if (force)             return rotateBowler(match);

    if (wicket) {
      const next = nextIndex(match, match.batterIndex, "batter");
      if (next === -1) return endSoloMatch(match);

      match.batterIndex = next;
      match.batter      = match.players[next].id;

      await bot.telegram.sendMessage(
        match.groupId,
        `🏏 <b>New Batter</b>\n\n<blockquote>${getSoloName(match, match.batter)} is now batting</blockquote>`,
        { parse_mode: "HTML" }
      ).catch(() => {});

      if (match.ballsThisSet >= 3) return rotateBowler(match);
      return soloBallHandler.startBall(match);
    }

    if (match.ballsThisSet >= 3) return rotateBowler(match);
    return soloBallHandler.startBall(match);
  }

  async function endSoloMatch(match) {
    if (!match || match.matchEnded) return;

    match.matchEnded = true;
    clearSoloTimers(match);
    clearLobbyTimers(match);

    match.motm = determineMOTM(match);
    await saveSoloMatchStats(match);

    const card = generateSoloScorecard(match, { final: true, motm: match.motm });

    await bot.telegram.sendMessage(match.groupId, card, { parse_mode: "HTML" }).catch(() => {});

    match.players.forEach(p => soloPlayerActive.delete(p.id));
    deleteSoloMatch(match.groupId);
  }

  /* ─── init ball handler ─── */

  soloBallHandler.init({
    bot,
    getSoloName,
    clearSoloTimers,
    advanceSolo,
    endSoloMatch,
  });

  /* ═══════════════════════════════════════
     COMMANDS
  ═══════════════════════════════════════ */

  /* ── /solostart ── */

  bot.command("solostart", async (ctx) => {
    if (ctx.chat.type === "private") return ctx.reply("Use this command in a group.");

    // Block if lobby or match already active
    const existing = soloMatches.get(ctx.chat.id);
    if (existing && !existing.matchEnded) {
      if (existing.phase === "join")
        return ctx.reply("⚠️ A lobby is already open. Use /solojoin to join.");
      return ctx.reply("⚠️ A solo match is already running.");
    }

    const match     = resetSoloMatch(ctx.chat.id);
    match.phase     = "join";
    const name      = ctx.from.first_name || "Player";

    // allPlayers keeps full roster even after timed-out players are removed
    match.allPlayers = [{ id: ctx.from.id, name }];
    match.players    = [{ id: ctx.from.id, name }];
    match.stats[ctx.from.id] = {
      runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0,
      wickets: 0, out: false,
      ballsBowled: 0, runsConceded: 0,
      ballHistory: [],
      timedOut: false,
    };

    soloPlayerActive.set(ctx.from.id, ctx.chat.id);

    await ctx.reply(
      `🏏 <b>Solo Lobby Started</b>\n\n1. ${name}\n\n👉 /solojoin to join  (120s)`,
      { parse_mode: "HTML" }
    );

    /* ── 60s alert ── */
    match.alert60 = setTimeout(async () => {
      if (match.phase !== "join") return;
      await bot.telegram.sendMessage(
        match.groupId,
        `⏳ <b>60 seconds left</b> to join the solo lobby!\n👥 ${match.players.length} joined so far\n👉 /solojoin`,
        { parse_mode: "HTML" }
      ).catch(() => {});
    }, 60_000);

    /* ── 30s alert ── */
    match.alert30 = setTimeout(async () => {
      if (match.phase !== "join") return;
      await bot.telegram.sendMessage(
        match.groupId,
        `🚨 <b>30 seconds left!</b> Lobby closing soon.\n👥 ${match.players.length} joined\n👉 /solojoin`,
        { parse_mode: "HTML" }
      ).catch(() => {});
    }, 90_000);

    /* ── 120s auto-start / cancel ── */
    match.joinTimer = setTimeout(async () => {
      if (match.phase !== "join") return;
      clearLobbyTimers(match);

      if (match.players.length < 3) {
        match.players.forEach(p => soloPlayerActive.delete(p.id));
        deleteSoloMatch(match.groupId);
        return bot.telegram.sendMessage(
          match.groupId,
          "❌ Solo lobby cancelled — need at least 3 players."
        ).catch(() => {});
      }

      await startMatch(match);
    }, 120_000);
  });


  /* ── /solojoin ── */

  bot.command("solojoin", async (ctx) => {
    const match = getSoloMatch(ctx);
    if (!match || match.phase !== "join")
      return ctx.reply("❌ No open solo lobby right now.");

    if (match.players.length >= 10)
      return ctx.reply("❌ Lobby is full (max 10 players).");

    // Duplicate join guard
    if (soloPlayerActive.has(ctx.from.id))
      return ctx.reply("⚠️ You already joined this lobby.");

    const name = ctx.from.first_name || "Player";

    const playerObj = { id: ctx.from.id, name };
    match.players.push(playerObj);
    if (!match.allPlayers) match.allPlayers = [...match.players];
    else match.allPlayers.push(playerObj);

    match.stats[ctx.from.id] = {
      runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0,
      wickets: 0, out: false,
      ballsBowled: 0, runsConceded: 0,
      ballHistory: [],
      timedOut: false,
    };

    soloPlayerActive.set(ctx.from.id, match.groupId);

    const playerList = match.players.map((p, i) => `${i + 1}. ${p.name}`).join("\n");

    await ctx.reply(
      `✅ <b>${name} joined!</b>\n\n${playerList}`,
      { parse_mode: "HTML" }
    );

    // Auto-start as soon as 3+ players are in
    if (match.players.length >= 3 && match.phase === "join") {
      // Give a brief moment so more can join, then check again in 5s
      // Only trigger once — guard with a flag
      if (!match._autoStartScheduled) {
        match._autoStartScheduled = true;
        setTimeout(async () => {
          if (match.phase !== "join") return; // already started / cancelled
          // Still have 3+? start now
          if (match.players.length >= 3) {
            clearLobbyTimers(match);
            await startMatch(match);
          }
        }, 5_000);
      }
    }
  });


  /* ── /soloscore ── */

  bot.command("soloscore", async (ctx) => {
    const match = getSoloMatch(ctx);
    if (!match) return ctx.reply("❌ No active solo match.");
    if (match.phase === "join") return ctx.reply("⏳ Match hasn't started yet.");

    const card = generateSoloScorecard(match, { final: false });
    return ctx.reply(card, { parse_mode: "HTML" });
  });


  /* ── /solostats ── */

  bot.command("solostats", async (ctx) => {
    const text = await getSoloStatsText(ctx.from.id, ctx.from.first_name);
    return ctx.reply(text, { parse_mode: "HTML" });
  });


  /* ═══════════════════════════════════════
     MATCH START
  ═══════════════════════════════════════ */

  async function startMatch(match) {
    if (match.phase !== "join") return; // guard double-fire
    match.phase = "play";

    match.batterIndex = 0;
    match.bowlerIndex = 1;
    match.batter      = match.players[0].id;
    match.bowler      = match.players[1].id;

    const batterName = getSoloName(match, match.batter);
    const bowlerName = getSoloName(match, match.bowler);
    const playerList = match.players.map((p, i) => `${i + 1}. ${p.name}`).join("\n");

    await bot.telegram.sendMessage(
      match.groupId,
`🏏 <b>Solo Match Started!</b>

<blockquote>${playerList}</blockquote>

🏏 <b>${batterName}</b> batting
🎯 <b>${bowlerName}</b> bowling`,
      { parse_mode: "HTML" }
    ).catch(() => {});

    soloBallHandler.startBall(match);
  }


  /* ═══════════════════════════════════════
     TEXT INPUT HANDLER
  ═══════════════════════════════════════ */

  bot.on("text", async (ctx, next) => {
    if (ctx.message.text.startsWith("/")) return next();

    const match = getSoloMatch(ctx);
    if (!match || match.phase !== "play") return next();

    const text = ctx.message.text.trim();

    /* Group chat — batter input */
    if (ctx.chat.type !== "private") {
      if (ctx.from.id !== match.batter) return next();
      if (!/^[0-6]$/.test(text)) return next();

      match.batNumber = Number(text);
      if (match.bowlNumber !== null)
        return soloBallHandler.processBall(match);

      return next();
    }

    /* DM — bowler input */
    if (ctx.from.id !== match.bowler) return next();
    if (!/^[1-6]$/.test(text)) return next();

    match.bowlNumber   = Number(text);
    match.awaitingBowl = false;
    match.awaitingBat  = true;

    // Notify group that bowler has bowled — now waiting for batter
    const batterName = getSoloName(match, match.batter);
    await bot.telegram.sendMessage(
      match.groupId,
      `✅ Bowler sent their number!\n\n${ping(match.batter, batterName)} — send your number (0–6) in the group 🏏`,
      { parse_mode: "HTML" }
    ).catch(() => {});

    await ctx.reply("✅ Number received!");

    // Start batter turn timer
    soloBallHandler.startTurnTimer(match, "bat");

    // If batter already sent (race condition — very unlikely but safe)
    if (match.batNumber !== null)
      return soloBallHandler.processBall(match);
  });
};