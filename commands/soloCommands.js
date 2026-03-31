// ===============================================================
// SOLO COMMANDS — soloCommands.js
// ===============================================================
// Commands:
//   /solostart   — open lobby (group only)
//   /solojoin    — join open lobby
//   /sololeave   — leave lobby before match starts
//   /soloscore   — live scorecard
//   /solostats   — personal lifetime stats
//   /endsolo     — admin force-end current match
//
// Game rules:
//   • Order-based: P1 bats first, P2 bowls first
//   • 3 balls per bowler set, then next eligible player bowls
//   • Batter cannot bowl to himself — skipped in bowler rotation
//   • After last player in rotation, wraps back to P1
//   • 2 consecutive timeouts → player removed from game
//   • Auto-start at 120s (or when 3+ players join for 5s)
// ===============================================================

const {
  soloMatches,
  soloPlayerActive,
  getSoloMatch,
  resetSoloMatch,
  deleteSoloMatch,
} = require("./soloMatchManager");

const soloBallHandler = require("./soloballHandler");

const {
  generateSoloScorecard,
  sendAndPinSoloPlayerList,
} = require("./soloScorecard");

const {
  saveSoloMatchStats,
  determineMOTM,
  getSoloStatsText,
} = require("./soloStats");

module.exports = function registerSoloCommands(bot, helpers) {
  const { isUserBanned } = helpers;

  /* ══════════════════════════════════════════
     TINY HELPERS
  ══════════════════════════════════════════ */

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


  /* ══════════════════════════════════════════
     ROTATION HELPERS
  ══════════════════════════════════════════ */

  /**
   * Find next eligible index in match.players after `afterIndex`.
   * type = "bowler" → skip the current batter's index too.
   * Wraps around (circular). Returns -1 if no eligible player found.
   */
  function nextEligibleIndex(match, afterIndex, type) {
    const n = match.players.length;
    for (let i = 1; i <= n; i++) {
      const idx = (afterIndex + i) % n;
      const p   = match.players[idx];
      const s   = match.stats[p.id];
      if (s?.out || s?.timedOut) continue;
      if (type === "bowler" && idx === match.batterIndex) continue;
      return idx;
    }
    return -1;
  }

  /**
   * Rotate to next bowler (after 3-ball set or force-rotate).
   */
  async function rotateBowler(match) {
    match.ballsThisSet = 0;
    match.setCount++;

    const next = nextEligibleIndex(match, match.bowlerIndex, "bowler");
    if (next === -1) return endSoloMatch(match);

    match.bowlerIndex = next;
    match.bowler      = match.players[next].id;

    await bot.telegram.sendMessage(
      match.groupId,
      `🔄 <b>New Bowler</b>\n\n<blockquote>🎯 ${getSoloName(match, match.bowler)} now bowling (3 balls)</blockquote>`,
      { parse_mode: "HTML" }
    ).catch(() => {});

    await sendAndPinSoloPlayerList(match, bot.telegram);
    return soloBallHandler.startBall(match);
  }

  /**
   * Called after every ball resolves.
   * wicket=true  → advance batter
   * force=true   → skip to next bowler immediately (timeout rotation)
   */
  async function advanceSolo(match, wicket = false, force = false) {
    if (!match || match.matchEnded) return;

    // Count players still eligible (not out, not timed-out)
    const alive = match.players.filter(
      p => !match.stats[p.id]?.out && !match.stats[p.id]?.timedOut
    );

    // Need at least 2 alive to continue (1 batter + 1 bowler)
    if (alive.length < 2) return endSoloMatch(match);
    if (force)            return rotateBowler(match);

    if (wicket) {
      const next = nextEligibleIndex(match, match.batterIndex, "batter");
      if (next === -1) return endSoloMatch(match);

      match.batterIndex = next;
      match.batter      = match.players[next].id;

      await bot.telegram.sendMessage(
        match.groupId,
        `🏏 <b>New Batter</b>\n\n<blockquote>${getSoloName(match, match.batter)} is now batting</blockquote>`,
        { parse_mode: "HTML" }
      ).catch(() => {});

      await sendAndPinSoloPlayerList(match, bot.telegram);

      // If bowler is now also the batter, rotate bowler first
      if (match.bowler === match.batter) return rotateBowler(match);

      if (match.ballsThisSet >= 3) return rotateBowler(match);
      return soloBallHandler.startBall(match);
    }

    // Normal ball — just check if set is done
    if (match.ballsThisSet >= 3) return rotateBowler(match);
    return soloBallHandler.startBall(match);
  }


  /* ══════════════════════════════════════════
     END MATCH
  ══════════════════════════════════════════ */

  async function endSoloMatch(match) {
    if (!match || match.matchEnded) return;

    match.matchEnded = true;
    clearSoloTimers(match);
    clearLobbyTimers(match);

    match.motm = determineMOTM(match);
    await saveSoloMatchStats(match);

    const card = generateSoloScorecard(match, { final: true, motm: match.motm });
    await bot.telegram.sendMessage(match.groupId, card, { parse_mode: "HTML" }).catch(() => {});

    // Unpin player list
    if (match.playerListMessageId) {
      await bot.telegram.unpinChatMessage(match.groupId, match.playerListMessageId).catch(() => {});
    }

    // Clean up active player map
    const allIds = match.allPlayers || match.players;
    allIds.forEach(p => soloPlayerActive.delete(p.id));
    deleteSoloMatch(match.groupId);
  }


  /* ══════════════════════════════════════════
     INIT BALL HANDLER
  ══════════════════════════════════════════ */

  soloBallHandler.init({
    bot,
    getSoloName,
    clearSoloTimers,
    advanceSolo,
    endSoloMatch,
  });


  /* ══════════════════════════════════════════
     /solostart
  ══════════════════════════════════════════ */

  bot.command("solostart", async (ctx) => {
    if (ctx.chat.type === "private")
      return ctx.reply("⚠️ Use this command in a group.");

    const existing = soloMatches.get(ctx.chat.id);
    if (existing && !existing.matchEnded) {
      if (existing.phase === "join")
        return ctx.reply("⚠️ A lobby is already open. Use /solojoin to join.");
      return ctx.reply("⚠️ A solo match is already running.");
    }

    const match = resetSoloMatch(ctx.chat.id);
    match.phase = "join";

    const name      = ctx.from.first_name || "Player";
    const playerObj = { id: ctx.from.id, name };

    match.players    = [playerObj];
    match.allPlayers = [playerObj];
    match.stats[ctx.from.id] = freshStats();

    soloPlayerActive.set(ctx.from.id, ctx.chat.id);

    // Send + pin player list
    await sendAndPinSoloPlayerList(match, ctx.telegram);

    // 60s alert
    match.alert60 = setTimeout(async () => {
      if (match.phase !== "join") return;
      await bot.telegram.sendMessage(
        match.groupId,
        `⏳ <b>60 seconds left</b> to join!\n👥 ${match.players.length} player(s) so far\n👉 /solojoin`,
        { parse_mode: "HTML" }
      ).catch(() => {});
    }, 60_000);

    // 30s alert
    match.alert30 = setTimeout(async () => {
      if (match.phase !== "join") return;
      await bot.telegram.sendMessage(
        match.groupId,
        `🚨 <b>30 seconds left!</b> Lobby closing soon.\n👥 ${match.players.length} joined\n👉 /solojoin`,
        { parse_mode: "HTML" }
      ).catch(() => {});
    }, 90_000);

    // 120s auto-start or cancel
    match.joinTimer = setTimeout(async () => {
      if (match.phase !== "join") return;
      clearLobbyTimers(match);

      if (match.players.length < 3) {
        match.players.forEach(p => soloPlayerActive.delete(p.id));
        if (match.playerListMessageId) {
          await bot.telegram.unpinChatMessage(match.groupId, match.playerListMessageId).catch(() => {});
        }
        deleteSoloMatch(match.groupId);
        return bot.telegram.sendMessage(
          match.groupId,
          "❌ Solo lobby cancelled — need at least 3 players."
        ).catch(() => {});
      }

      await startSoloMatch(match);
    }, 120_000);
  });


  /* ══════════════════════════════════════════
     /solojoin
  ══════════════════════════════════════════ */

  bot.command("solojoin", async (ctx) => {
    if (ctx.chat.type === "private")
      return ctx.reply("⚠️ Use this command in a group.");

    const match = soloMatches.get(ctx.chat.id);
    if (!match || match.phase !== "join")
      return ctx.reply("❌ No open solo lobby right now.");

    if (match.players.length >= 10)
      return ctx.reply("❌ Lobby is full (max 10 players).");

    if (soloPlayerActive.has(ctx.from.id))
      return ctx.reply("⚠️ You already joined this lobby.");

    const name      = ctx.from.first_name || "Player";
    const playerObj = { id: ctx.from.id, name };

    match.players.push(playerObj);
    match.allPlayers.push(playerObj);
    match.stats[ctx.from.id] = freshStats();

    soloPlayerActive.set(ctx.from.id, match.groupId);

    // Update pinned list
    await sendAndPinSoloPlayerList(match, ctx.telegram);
    await ctx.reply(`✅ <b>${name} joined!</b>`, { parse_mode: "HTML" });

    // Auto-start guard: once 3+ in lobby, wait 5s then start if still in join phase
    if (match.players.length >= 3 && !match._autoStartScheduled) {
      match._autoStartScheduled = true;
      setTimeout(async () => {
        if (match.phase !== "join") return;
        if (match.players.length >= 3) {
          clearLobbyTimers(match);
          await startSoloMatch(match);
        }
      }, 5_000);
    }
  });


  /* ══════════════════════════════════════════
     /sololeave  (lobby phase only)
  ══════════════════════════════════════════ */

  bot.command("sololeave", async (ctx) => {
    const match = soloMatches.get(ctx.chat?.id);
    if (!match || match.phase !== "join")
      return ctx.reply("❌ No open lobby to leave. Match in progress cannot be left.");

    if (!soloPlayerActive.has(ctx.from.id))
      return ctx.reply("⚠️ You are not in this lobby.");

    const name = getSoloName(match, ctx.from.id);

    match.players    = match.players.filter(p => p.id !== ctx.from.id);
    match.allPlayers = match.allPlayers.filter(p => p.id !== ctx.from.id);
    delete match.stats[ctx.from.id];
    soloPlayerActive.delete(ctx.from.id);

    await ctx.reply(`👋 <b>${name}</b> left the lobby.`, { parse_mode: "HTML" });
    await sendAndPinSoloPlayerList(match, ctx.telegram);

    // Cancel if no players left
    if (match.players.length === 0) {
      clearLobbyTimers(match);
      if (match.playerListMessageId) {
        await bot.telegram.unpinChatMessage(match.groupId, match.playerListMessageId).catch(() => {});
      }
      deleteSoloMatch(match.groupId);
      return ctx.reply("❌ Lobby closed — no players remaining.");
    }
  });


  /* ══════════════════════════════════════════
     /soloscore
  ══════════════════════════════════════════ */

  bot.command("soloscore", async (ctx) => {
    const match = getSoloMatch(ctx);
    if (!match) return ctx.reply("❌ No active solo match.");
    if (match.phase === "join") return ctx.reply("⏳ Match hasn't started yet.");

    const card = generateSoloScorecard(match, { final: false });
    return ctx.reply(card, { parse_mode: "HTML" });
  });


  /* ══════════════════════════════════════════
     /solostats
  ══════════════════════════════════════════ */

  bot.command("solostats", async (ctx) => {
    const text = await getSoloStatsText(ctx.from.id, ctx.from.first_name);
    return ctx.reply(text, { parse_mode: "HTML" });
  });


  /* ══════════════════════════════════════════
     /endsolo  — admin only
  ══════════════════════════════════════════ */

  bot.command("endsolo", async (ctx) => {
    if (ctx.chat.type === "private")
      return ctx.reply("⚠️ Use this command in a group.");

    // Check admin
    try {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
      if (!["administrator", "creator"].includes(member.status))
        return ctx.reply("🚫 Only admins can end a solo match.");
    } catch {
      return ctx.reply("⚠️ Could not verify admin status.");
    }

    const match = soloMatches.get(ctx.chat.id);
    if (!match || match.matchEnded)
      return ctx.reply("❌ No active solo match in this group.");

    await ctx.reply("🛑 Solo match ended by admin.");
    return endSoloMatch(match);
  });


  /* ══════════════════════════════════════════
     MATCH START
  ══════════════════════════════════════════ */

  async function startSoloMatch(match) {
    if (match.phase !== "join") return;
    match.phase = "play";

    // Reset rotation
    match.batterIndex = 0;
    match.bowlerIndex = 1;
    match.batter      = match.players[0].id;
    match.bowler      = match.players[1].id;
    match.ballsThisSet = 0;
    match.setCount     = 0;

    const playerList = match.players.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
    const batterName = getSoloName(match, match.batter);
    const bowlerName = getSoloName(match, match.bowler);

    await bot.telegram.sendMessage(
      match.groupId,
      `🏏 <b>Solo Match Started!</b>\n\n<blockquote>${playerList}</blockquote>\n\n🏏 <b>${batterName}</b> batting\n🎯 <b>${bowlerName}</b> bowling`,
      { parse_mode: "HTML" }
    ).catch(() => {});

    // Update pinned player list to show batting/bowling roles
    await sendAndPinSoloPlayerList(match, bot.telegram);

    soloBallHandler.startBall(match);
  }


  /* ══════════════════════════════════════════
     TEXT INPUT HANDLER
  ══════════════════════════════════════════ */

  bot.on("text", async (ctx, next) => {
    if (ctx.message.text.startsWith("/")) return next();

    const match = getSoloMatch(ctx);
    if (!match || match.phase !== "play") return next();

    const text = ctx.message.text.trim();

    /* ── Group: batter input (0–6) ── */
    if (ctx.chat.type !== "private") {
      if (ctx.from.id !== match.batter)     return next();
      if (!match.awaitingBat)               return next();
      if (!/^[0-6]$/.test(text))            return next();

      match.batNumber = Number(text);

      if (match.bowlNumber !== null)
        return soloBallHandler.processBall(match);

      return next();
    }

    /* ── DM: bowler input (1–6) ── */
    if (ctx.from.id !== match.bowler)  return next();
    if (!match.awaitingBowl)           return next();
    if (!/^[1-6]$/.test(text))         return next();

    match.bowlNumber   = Number(text);
    match.awaitingBowl = false;
    match.awaitingBat  = true;

    const batterName = getSoloName(match, match.batter);
    await bot.telegram.sendMessage(
      match.groupId,
      `✅ Bowler sent number!\n\n${ping(match.batter, batterName)} — send your number (0–6) in the group 🏏`,
      { parse_mode: "HTML" }
    ).catch(() => {});

    await ctx.reply("✅ Number received!").catch(() => {});

    // Start batter turn timer (fresh 60s)
    clearSoloTimers(match);
    soloBallHandler.startTurnTimer(match, "bat");

    // Race condition: batter already sent
    if (match.batNumber !== null)
      return soloBallHandler.processBall(match);
  });


  /* ══════════════════════════════════════════
     FRESH STATS OBJECT
  ══════════════════════════════════════════ */

  function freshStats() {
    return {
      runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0,
      wickets: 0, out: false,
      ballsBowled: 0, runsConceded: 0,
      ballHistory: [],
      timedOut: false,
      consecutiveTimeouts: 0,
    };
  }
};