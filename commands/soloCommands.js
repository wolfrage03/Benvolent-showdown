// ===============================================================
// SOLO COMMANDS — soloCommands.js
// ===============================================================
//
// GAME RULES:
//   • Minimum 3, maximum 10 players
//   • ALL players bat individually in join order (P1, P2, P3 … Pn)
//   • Bowler starts at P2, bowls 3 balls, then P3, P4 … wraps back to P1
//   • Batter can NEVER bowl to himself — bowler rotation skips him
//   • If a bowler gets out as batter while still having balls left,
//     the NEXT player becomes bowler with a FULL 3 balls (no reduction)
//   • After last player bowls, rotation wraps to P1 (circular, skip batter)
//   • 2 consecutive timeouts → player removed
//   • First timeout = warning, ball doesn't count, next bowler
//
// COMMANDS:
//   /solostart  — open lobby
//   /solojoin   — join lobby
//   /sololeave  — leave lobby (lobby phase only)
//   /soloscore  — live scorecard
//   /solostats  — personal stats
//   /endsolo    — admin force-end
// ===============================================================

const {
  getBattingCall,
} = require("../commentary");

/* ── All other requires are inside registerSoloCommands() to prevent circular deps ── */

module.exports = function registerSoloCommands(bot, helpers) {

  /* ── Lazy requires: prevents circular dependency at module load time ── */
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
    getSoloStatsDebug,
  } = require("./soloStats");

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

  /* ── Debounce solo player list pins — batches rapid joins into 1 API call ── */
  const _soloPinDebounce = new Map();
  function debouncedSoloPin(match) {
    if (_soloPinDebounce.has(match.groupId)) {
      clearTimeout(_soloPinDebounce.get(match.groupId));
    }
    _soloPinDebounce.set(match.groupId, setTimeout(() => {
      _soloPinDebounce.delete(match.groupId);
      sendAndPinSoloPlayerList(match, bot.telegram).catch(() => {});
    }, 300));
  }

    /* ── send batting call gif to group ── */
  async function sendBattingCallToGroup(match, batterName) {
    const call = getBattingCall();
    const text = `${ping(match.batter, batterName)} — ${call.text}`;
    try {
      await bot.telegram.sendAnimation(match.groupId, call.gif, {
        caption: text, parse_mode: "HTML",
      });
    } catch {
      try {
        await bot.telegram.sendVideo(match.groupId, call.gif, {
          caption: text, parse_mode: "HTML",
        });
      } catch {
        await bot.telegram.sendMessage(match.groupId, text, { parse_mode: "HTML" }).catch(() => {});
      }
    }
  }


  /* ══════════════════════════════════════════
     ROTATION LOGIC
  ══════════════════════════════════════════ */

  /**
   * Find the next eligible bowler index in match.players[].
   *
   * Rules:
   *  - Wraps circularly after last player → back to index 0
   *  - Skips players who are timedOut or removed
   *  - Skips the current batterIndex (batter cannot bowl to himself)
   *  - Starts search AFTER afterIndex (not inclusive)
   *
   * Returns index, or -1 if no eligible bowler exists.
   */
  function nextBowlerIndex(match, afterIndex) {
    const n = match.players.length;
    for (let i = 1; i <= n; i++) {
      const idx = (afterIndex + i) % n;
      const p   = match.players[idx];
      if (!p) continue;
      const s = match.stats[p.id];
      // Skip removed players
      if (s?.timedOut) continue;
      // Skip the current batter (cannot bowl to himself)
      if (idx === match.batterIndex) continue;
      return idx;
    }
    return -1;
  }

  /**
   * Find the next eligible batter index in match.players[].
   *
   * Rules:
   *  - Sequential: next player in join order after current batter
   *  - Skips out / timedOut players
   *  - Does NOT wrap (each player bats only once in order)
   *
   * Returns index, or -1 if no more batters.
   */
  function nextBatterIndex(match) {
    const n = match.players.length;
    // Look strictly forward from current batter
    for (let i = match.batterIndex + 1; i < n; i++) {
      const p = match.players[i];
      if (!p) continue;
      const s = match.stats[p.id];
      if (s?.timedOut) continue;  // removed player
      if (s?.out)      continue;  // already dismissed
      return i;
    }
    return -1;
  }


  /* ══════════════════════════════════════════
     BOWLER ROTATION
  ══════════════════════════════════════════ */

  async function rotateBowler(match) {
    match.ballsThisSet = 0;
    match.setCount++;

    const next = nextBowlerIndex(match, match.bowlerIndex);
    if (next === -1) return endSoloMatch(match);

    match.bowlerIndex = next;
    match.bowler      = match.players[next].id;

    await bot.telegram.sendMessage(
      match.groupId,
      `🔄 <b>New Bowler</b>\n\n<blockquote>🎯 ${getSoloName(match, match.bowler)} now bowling (3 balls)</blockquote>`,
      { parse_mode: "HTML" }
    ).catch(() => {});

    debouncedSoloPin(match);
    return soloBallHandler.startBall(match);
  }


  /* ══════════════════════════════════════════
     ADVANCE SOLO  (called after every ball)
  ══════════════════════════════════════════ */

  /**
   * @param {object}  match
   * @param {boolean} wicket  – true if batter just got out
   * @param {boolean} force   – true to skip immediately to next bowler (timeout)
   */
  async function advanceSolo(match, wicket = false, force = false) {
    if (!match || match.matchEnded) return;

    if (force) return rotateBowler(match);

    if (wicket) {
      // ── Find next batter ──
      const next = nextBatterIndex(match);

      if (next === -1) {
        // No more batters → match over
        return endSoloMatch(match);
      }

      match.batterIndex = next;
      match.batter      = match.players[next].id;

      await bot.telegram.sendMessage(
        match.groupId,
        `🏏 <b>New Batter</b>\n\n<blockquote>${getSoloName(match, match.batter)} is now batting</blockquote>`,
        { parse_mode: "HTML" }
      ).catch(() => {});

      debouncedSoloPin(match);

      if (match.bowler === match.batter) {
        // The old bowler is now the new batter.
        // Point bowlerIndex at the new batter so nextBowlerIndex searches *after* them.
        match.bowlerIndex  = match.batterIndex;
        match.ballsThisSet = 0; // new bowler gets a full 3-ball set
        return rotateBowler(match);
      }

      // If 3-ball set is done, rotate bowler
      if (match.ballsThisSet >= 3) return rotateBowler(match);

      // Continue same bowler, same set
      return soloBallHandler.startBall(match);
    }

    // No wicket — just check if set is done
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

    if (match.playerListMessageId) {
      await bot.telegram.unpinChatMessage(match.groupId, match.playerListMessageId).catch(() => {});
    }

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
    if (!ctx.from || ctx.from.is_bot) return;
    if (ctx.message?.sender_chat) return;

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
        `⏳ <b>60 seconds left</b> to join the solo lobby!\n👥 ${match.players.length} player(s) joined\n👉 /solojoin`,
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

    if (!ctx.from || ctx.from.is_bot)
      return ctx.reply("🚫 Bots cannot join the lobby.");

    if (ctx.message?.sender_chat)
      return ctx.reply("🚫 Channels cannot join the lobby.");

    const match = soloMatches.get(ctx.chat.id); // rest unchanged
    if (!match || match.phase !== "join")
      return ctx.reply("❌ No open solo lobby right now.");

    if (match.players.length >= 10)
      return ctx.reply("❌ Lobby is full (max 10 players).");

    if (soloPlayerActive.has(ctx.from.id))
      return ctx.reply("⚠️ You are already in this lobby.");

    const name      = ctx.from.first_name || "Player";
    const playerObj = { id: ctx.from.id, name };
    match.players.push(playerObj);
    match.allPlayers.push(playerObj);
    match.stats[ctx.from.id] = freshStats();
    soloPlayerActive.set(ctx.from.id, match.groupId);

    await sendAndPinSoloPlayerList(match, ctx.telegram);
    await ctx.reply(`✅ <b>${name} joined!</b>`, { parse_mode: "HTML" });

   
    // Auto-start ONLY when 10 players join
    if (match.players.length === 10 && !match._autoStartScheduled) {
      match._autoStartScheduled = true;
      setTimeout(async () => {
        if (match.phase !== "join") return;
        if (match.players.length === 10) {
          clearLobbyTimers(match);
          await startSoloMatch(match);
        }
      }, 1000); // small delay (optional, can be 0)
    }
  });


  /* ══════════════════════════════════════════
     /sololeave  (lobby only)
  ══════════════════════════════════════════ */

  bot.command("sololeave", async (ctx) => {
    if (ctx.chat.type === "private")
      return ctx.reply("⚠️ Use this command in a group.");

    const match = soloMatches.get(ctx.chat?.id);
    if (!match || match.phase !== "join")
      return ctx.reply("❌ You can only leave during the lobby phase.");

    if (!soloPlayerActive.has(ctx.from.id))
      return ctx.reply("⚠️ You are not in this lobby.");

    const name = getSoloName(match, ctx.from.id);
    match.players    = match.players.filter(p => p.id !== ctx.from.id);
    match.allPlayers = match.allPlayers.filter(p => p.id !== ctx.from.id);
    delete match.stats[ctx.from.id];
    soloPlayerActive.delete(ctx.from.id);

    await ctx.reply(`👋 <b>${name}</b> left the lobby.`, { parse_mode: "HTML" });

    if (match.players.length === 0) {
      clearLobbyTimers(match);
      if (match.playerListMessageId) {
        await bot.telegram.unpinChatMessage(match.groupId, match.playerListMessageId).catch(() => {});
      }
      deleteSoloMatch(match.groupId);
      return ctx.reply("❌ Lobby closed — no players remaining.");
    }

    await sendAndPinSoloPlayerList(match, ctx.telegram);
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

  /* ══════════════════════════════════════════
     /closejoin  — admin manually starts match early
  ══════════════════════════════════════════ */

  bot.command("closejoin", async (ctx) => {
    if (ctx.chat.type === "private")
      return ctx.reply("⚠️ Use this command in a group.");

    try {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
      if (!["administrator", "creator"].includes(member.status))
        return ctx.reply("🚫 Only admins can close the lobby.");
    } catch {
      return ctx.reply("⚠️ Could not verify admin status.");
    }

    const match = soloMatches.get(ctx.chat.id);
    if (!match || match.phase !== "join")
      return ctx.reply("❌ No open solo lobby right now.");

    if (match.players.length < 3)
      return ctx.reply(`❌ Need at least 3 players to start. Currently: ${match.players.length}/3`);

    clearLobbyTimers(match);
    await ctx.reply(`✅ Lobby closed by admin — starting with ${match.players.length} players!`);
    return startSoloMatch(match);
  });


  /* ══════════════════════════════════════════
     /endsolo  — admin force-end (with confirmation)
  ══════════════════════════════════════════ */

  bot.command("endsolo", async (ctx) => {
    if (ctx.chat.type === "private")
      return ctx.reply("⚠️ Use this command in a group.");

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

    await ctx.reply(
      "⚠️ <b>Are you sure you want to end the solo match?</b>\n\nThis will save all current stats and post the final scorecard.",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ Yes, End Match", callback_data: `endsolo_confirm_${ctx.chat.id}` },
            { text: "❌ Cancel",         callback_data: `endsolo_cancel_${ctx.chat.id}` },
          ]],
        },
      }
    );
  });

  /* Confirmation callback */
  bot.action(/^endsolo_confirm_(-\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const groupId = Number(ctx.match[1]);

    // Verify the person clicking is still an admin
    try {
      const member = await ctx.telegram.getChatMember(groupId, ctx.from.id);
      if (!["administrator", "creator"].includes(member.status)) {
        return ctx.answerCbQuery("🚫 Only admins can confirm this.", { show_alert: true });
      }
    } catch { /* ignore */ }

    const match = soloMatches.get(groupId);
    if (!match || match.matchEnded) {
      return ctx.editMessageText("❌ No active solo match found.").catch(() => {});
    }

    await ctx.editMessageText("🛑 <b>Solo match ended by admin.</b>", { parse_mode: "HTML" }).catch(() => {});
    return endSoloMatch(match);
  });

  bot.action(/^endsolo_cancel_(-\d+)$/, async (ctx) => {
    await ctx.answerCbQuery("Cancelled.");
    await ctx.editMessageText("✅ End match cancelled.").catch(() => {});
  });


  /* ══════════════════════════════════════════
     MATCH START
  ══════════════════════════════════════════ */

  async function startSoloMatch(match) {
    if (match.phase !== "join") return;
    match.phase = "play";

    // P1 bats, P2 bowls, both start at index 0 and 1
    match.batterIndex  = 0;
    match.bowlerIndex  = 1;
    match.batter       = match.players[0].id;
    match.bowler       = match.players[1].id;
    match.ballsThisSet = 0;
    match.setCount     = 0;

    const batterName = getSoloName(match, match.batter);
    const bowlerName = getSoloName(match, match.bowler);
    const playerList = match.players.map((p, i) => `${i + 1}. ${p.name}`).join("\n");

    await bot.telegram.sendMessage(
      match.groupId,
      `🏏 <b>Solo Match Started!</b>\n\n<blockquote>${playerList}</blockquote>\n\n🏏 <b>${batterName}</b> batting first\n🎯 <b>${bowlerName}</b> bowling`,
      { parse_mode: "HTML" }
    ).catch(() => {});

    // Update pinned list with roles
    await sendAndPinSoloPlayerList(match, bot.telegram);

    soloBallHandler.startBall(match);
  }


  /* ══════════════════════════════════════════
     /solostatsdebug  — admin raw DB dump
  ══════════════════════════════════════════ */

  bot.command("solostatsdebug", async (ctx) => {
    try {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
      if (!["administrator", "creator"].includes(member.status) && ctx.chat.type !== "private")
        return ctx.reply("🚫 Admin only.");
    } catch { /* allow in private */ }

    const targetId = ctx.from.id;
    const text = await getSoloStatsDebug(targetId);
    return ctx.reply(text, { parse_mode: "HTML" });
  });


  /* ══════════════════════════════════════════
     TEXT INPUT HANDLER
  ══════════════════════════════════════════ */

  bot.on("text", async (ctx, next) => {
    if (ctx.message.text.startsWith("/")) return next();

    const match = getSoloMatch(ctx);
    if (!match || match.phase !== "play") return next();

    const rawText = ctx.message.text.trim();
    // Only accept purely numeric input: "2", "02", "006" are valid.
    // Anything with letters ("play 3", "hit4") is rejected.
    // Emojis alongside a number ("4") are still accepted.
    const noLetters  = !/[a-zA-Z]/.test(rawText);
    const digitsOnly = rawText.replace(/[^0-9]/g, "");
    const text       = (noLetters && digitsOnly.length >= 1)
      ? String(Number(digitsOnly))
      : rawText;

    /* ── Group: batter input (0–6) ── */
    if (ctx.chat.type !== "private") {
      if (ctx.from.id !== match.batter)  return next();
      if (!match.awaitingBat)            return next();
      if (!/^[1-6]$/.test(text))         return next();

      // Capture the message ID so the result gif can reply to it
      match.batterMessageId = ctx.message.message_id;
      match.batNumber       = Number(text);

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

    await ctx.reply("✅ Number received!").catch(() => {});

    const batterName = getSoloName(match, match.batter);

    // Send batting call gif to group (reply prompt to batter)
    await sendBattingCallToGroup(match, batterName).catch(() => {});

    // Clear existing timer, start fresh 60s for batter
    clearSoloTimers(match);
    soloBallHandler.startTurnTimer(match, "bat");

    // Race condition: batter already sent
    if (match.batNumber !== null)
      return soloBallHandler.processBall(match);
  });
};