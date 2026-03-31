// ===============================================================
// SOLO MODE COMMANDS  —  soloCommands.js
// ===============================================================
// Place this file in:  commands/soloCommands.js
// Required siblings:
//   commands/soloMatchManager.js
//   commands/soloBallHandler.js
//   commands/soloScorecard.js
//   commands/soloStats.js
//
// Register in index.js BEFORE handleInput:
//   require("./commands/soloCommands")(bot, helpers);
// ===============================================================

const {
  soloMatches,
  soloPlayerActive,
  getSoloMatch,
  resetSoloMatch,
  deleteSoloMatch,
} = require("./soloMatchManager");

const soloBallHandler        = require("./commands/soloBallHandler");
const generateSoloScorecard  = require("./commands/soloScorecard");
const { saveSoloMatchStats, determineMOTM, getSoloStatsText } = require("./commands/soloStats");
const User = require("../User");


module.exports = function registerSoloCommands(bot, helpers) {

  const { isUserBanned } = helpers;


  /* ═══════════════════════════════════════════════════════════
     PURE HELPERS
  ═══════════════════════════════════════════════════════════ */

  function getSoloName(match, id) {
    if (!match || !id) return "Player";
    const p = match.players.find(x => x.id === id);
    return p ? p.name : "Player";
  }

  function ping(id, name) {
    return `<a href="tg://user?id=${id}">${name}</a>`;
  }

  function clearSoloTimers(match) {
    if (!match) return;
    if (match.warning30) { clearTimeout(match.warning30); match.warning30 = null; }
    if (match.warning10) { clearTimeout(match.warning10); match.warning10 = null; }
    if (match.ballTimer) { clearTimeout(match.ballTimer); match.ballTimer  = null; }
  }

  function clearLobbyTimers(match) {
    if (!match) return;
    if (match.joinTimer) { clearTimeout(match.joinTimer); match.joinTimer = null; }
    if (match.alert60)   { clearTimeout(match.alert60);   match.alert60   = null; }
    if (match.alert30)   { clearTimeout(match.alert30);   match.alert30   = null; }
  }

  async function isGroupAdmin(ctx, userId) {
    try {
      const member = await ctx.getChatMember(userId);
      return ["administrator", "creator"].includes(member.status);
    } catch {
      return false;
    }
  }


  /* ═══════════════════════════════════════════════════════════
     ROTATION HELPERS
  ═══════════════════════════════════════════════════════════ */

  function nextBatterIndex(match, afterIndex) {
    const n = match.players.length;
    for (let i = 1; i < n; i++) {
      const idx = (afterIndex + i) % n;
      const p   = match.players[idx];
      if (!match.stats[p.id]?.out && !match.stats[p.id]?.timedOut) return idx;
    }
    return -1;
  }

  function nextBowlerIndex(match, afterIndex) {
    const n = match.players.length;
    for (let i = 1; i < n; i++) {
      const idx = (afterIndex + i) % n;
      const p   = match.players[idx];
      if (idx !== match.batterIndex &&
          !match.stats[p.id]?.out &&
          !match.stats[p.id]?.timedOut) return idx;
    }
    return -1;
  }


  /* ═══════════════════════════════════════════════════════════
     ADVANCE SOLO
     Called after every ball. wasWicket = batter just got out.
     forceRotate = bowler was removed (timed out).
  ═══════════════════════════════════════════════════════════ */

  async function advanceSolo(match, wasWicket = false, forceRotate = false) {
    if (!match || match.matchEnded) return;

    const alive = match.players.filter(
      p => !match.stats[p.id]?.out && !match.stats[p.id]?.timedOut
    );

    if (alive.length === 0) return endSoloMatch(match);
    if (alive.length === 1 && alive[0].id === match.batter) return endSoloMatch(match);

    /* ── Forced bowler rotation (bowler timed out) ── */
    if (forceRotate) {
      // Re-index after player removal
      match.batterIndex = match.players.findIndex(p => p.id === match.batter);
      if (match.batterIndex === -1) return endSoloMatch(match);
      return rotateBowler(match);
    }

    /* ── Wicket: new batter, same bowler set ── */
    if (wasWicket) {
      const nextBI = nextBatterIndex(match, match.batterIndex);
      if (nextBI === -1) return endSoloMatch(match);

      match.batterIndex = nextBI;
      match.batter      = match.players[nextBI].id;
      match.striker     = match.batter;
      soloPlayerActive.set(match.batter, match.groupId);

      const batterName = getSoloName(match, match.batter);
      const bowlerName = getSoloName(match, match.bowler);
      const ballsLeft  = 3 - match.ballsThisSet;

      await bot.telegram.sendMessage(
        match.groupId,
`🏏 <b>New Batter</b>\n\n<blockquote>🏏 ${batterName}  is now batting\n🎯 ${bowlerName}  continues (${ballsLeft} ball${ballsLeft !== 1 ? "s" : ""} left)</blockquote>`,
        { parse_mode: "HTML" }
      ).catch(() => {});

      if (match.ballsThisSet >= 3) return rotateBowler(match);
      return soloBallHandler.startBall(match);
    }

    /* ── Normal: check if set done ── */
    if (match.ballsThisSet >= 3) return rotateBowler(match);

    return soloBallHandler.startBall(match);
  }


  /* ═══════════════════════════════════════════════════════════
     ROTATE BOWLER
  ═══════════════════════════════════════════════════════════ */

  async function rotateBowler(match) {
    match.ballsThisSet = 0;
    match.setCount++;

    const nextBI = nextBowlerIndex(match, match.bowlerIndex);
    if (nextBI === -1) return endSoloMatch(match);

    match.bowlerIndex = nextBI;
    match.bowler      = match.players[nextBI].id;
    soloPlayerActive.set(match.bowler, match.groupId);

    const bowlerName = getSoloName(match, match.bowler);
    const batterName = getSoloName(match, match.batter);

    await bot.telegram.sendMessage(
      match.groupId,
`🔄 <b>New Bowler</b>\n\n<blockquote>🎯 ${bowlerName}  now bowling (3 balls)\n🏏 ${batterName}  still batting</blockquote>`,
      { parse_mode: "HTML" }
    ).catch(() => {});

    return soloBallHandler.startBall(match);
  }


  /* ═══════════════════════════════════════════════════════════
     END SOLO MATCH
  ═══════════════════════════════════════════════════════════ */

  async function endSoloMatch(match) {
    if (!match || match.matchEnded) return;
    match.matchEnded = true;
    match.phase      = "idle";
    clearSoloTimers(match);
    clearLobbyTimers(match);

    // Determine MOTM
    match.motm = determineMOTM(match);

    // Save stats to DB
    await saveSoloMatchStats(match);

    // Final scorecard
    const card = generateSoloScorecard(match, { final: true, motm: match.motm });

    try {
      await bot.telegram.sendMessage(match.groupId, card, { parse_mode: "HTML" });
    } catch (e) {
      console.error("[SOLO endSoloMatch] send error:", e.message);
      // Fallback plain text
      try {
        await bot.telegram.sendMessage(
          match.groupId,
          card.replace(/<[^>]*>/g, "").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
        );
      } catch {}
    }

    // Clean up
    for (const p of match.players) soloPlayerActive.delete(p.id);
    deleteSoloMatch(match.groupId);
  }


  /* ═══════════════════════════════════════════════════════════
     INJECT DEPS INTO BALL HANDLER
  ═══════════════════════════════════════════════════════════ */

  soloBallHandler.init({
    bot,
    getSoloName,
    clearSoloTimers,
    advanceSolo,
    endSoloMatch,
  });


  /* ═══════════════════════════════════════════════════════════
     /solostart
  ═══════════════════════════════════════════════════════════ */

  bot.command("solostart", async (ctx) => {
    if (ctx.chat.type === "private")
      return ctx.reply("⚠️ Use /solostart in a group chat.");

    // Block if team match running
    const { matches } = require("../matchManager");
    const teamMatch   = matches.get(ctx.chat.id);
    if (teamMatch && !teamMatch.matchEnded && teamMatch.phase !== "idle") {
      return ctx.reply(
        "⚠️ A team match is running.\n\n<blockquote>End it with /endmatch first.</blockquote>",
        { parse_mode: "HTML" }
      );
    }

    // Block if solo match running
    const existing = soloMatches.get(ctx.chat.id);
    if (existing && !existing.matchEnded && existing.phase !== "idle") {
      return ctx.reply("⚠️ A solo match is already running here.");
    }

    if (await isUserBanned(ctx.from.id))
      return ctx.reply("🚫 You are banned.");

    if (soloPlayerActive.has(ctx.from.id))
      return ctx.reply("❌ You are already in a solo match.");

    const { playerActiveMatch } = require("../matchManager");
    if (playerActiveMatch.has(ctx.from.id))
      return ctx.reply("❌ You are already in a team match.");

    // Create match, initiator auto-joins as player 1
    const match = resetSoloMatch(ctx.chat.id);
    match.phase  = "join";

    const name = ctx.from.first_name || "Player";
    match.players.push({ id: ctx.from.id, name });
    match.stats[ctx.from.id] = {
      runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0,
      wickets: 0, out: false,
      ballsBowled: 0, runsConceded: 0,
      ballHistory: [], timedOut: false,
    };
    soloPlayerActive.set(ctx.from.id, ctx.chat.id);

    // DB upsert
    try {
      const { id, username, first_name, last_name } = ctx.from;
      await User.updateOne(
        { telegramId: String(id) },
        { $set: { telegramId: String(id), username: username?.toLowerCase(), firstName: first_name, lastName: last_name } },
        { upsert: true }
      );
    } catch (e) { console.error("[SOLO] solostart DB:", e.message); }

    try { await ctx.deleteMessage(); } catch {}

    await ctx.reply(
`🏏 <b>Solo Cricket — Lobby Open!</b>

<blockquote>📋 Every player bats until out.
🎯 Each bowler gets exactly 3 balls, then rotates.
🔄 Join order = batting &amp; bowling order.
👥 Min 3 · Max 10 · ⏱ 120s to join</blockquote>

<blockquote>1. ${name}  ✅</blockquote>

👉 /solojoin to join
👮 Admin: /closesolo to start early`,
      { parse_mode: "HTML" }
    );

    // ── Lobby alerts ──
    match.alert60 = setTimeout(async () => {
      if (match.phase !== "join") return;
      await bot.telegram.sendMessage(
        match.groupId,
        `⏱ <b>60s left</b> to join the solo lobby!\n\n<blockquote>${match.players.length} player${match.players.length !== 1 ? "s" : ""} joined so far. Need at least 3.</blockquote>\n\n👉 /solojoin`,
        { parse_mode: "HTML" }
      ).catch(() => {});
    }, 60000);

    match.alert30 = setTimeout(async () => {
      if (match.phase !== "join") return;
      await bot.telegram.sendMessage(
        match.groupId,
        `🚨 <b>30s left</b> to join!\n\n<blockquote>${match.players.length} player${match.players.length !== 1 ? "s" : ""} so far.</blockquote>\n\n👉 /solojoin`,
        { parse_mode: "HTML" }
      ).catch(() => {});
    }, 90000);

    // ── Auto-start / expire at 120s ──
    match.joinTimer = setTimeout(async () => {
      if (match.phase !== "join") return;

      if (match.players.length < 3) {
        clearLobbyTimers(match);
        for (const p of match.players) soloPlayerActive.delete(p.id);
        deleteSoloMatch(match.groupId);
        await bot.telegram.sendMessage(
          match.groupId,
          "⏱ Solo lobby expired.\n\n<blockquote>Not enough players (need at least 3).</blockquote>",
          { parse_mode: "HTML" }
        ).catch(() => {});
        return;
      }

      await startMatch(match);
    }, 120000);
  });


  /* ═══════════════════════════════════════════════════════════
     /solojoin
  ═══════════════════════════════════════════════════════════ */

  bot.command("solojoin", async (ctx) => {
    if (ctx.chat.type === "private")
      return ctx.reply("⚠️ Use /solojoin in the group.");

    const match = getSoloMatch(ctx);
    if (!match || match.phase !== "join")
      return ctx.reply("⚠️ No open solo lobby. Use /solostart first.");

    if (await isUserBanned(ctx.from.id))
      return ctx.reply("🚫 You are banned.");

    if (match.players.some(p => p.id === ctx.from.id))
      return ctx.reply("⚠️ You already joined.");

    if (soloPlayerActive.has(ctx.from.id))
      return ctx.reply("❌ You are already in another solo match.");

    const { playerActiveMatch } = require("../matchManager");
    if (playerActiveMatch.has(ctx.from.id))
      return ctx.reply("❌ You are already in a team match.");

    if (match.players.length >= 10)
      return ctx.reply("⚠️ Lobby full (10 max).");

    const name = ctx.from.first_name || "Player";
    match.players.push({ id: ctx.from.id, name });
    match.stats[ctx.from.id] = {
      runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0,
      wickets: 0, out: false,
      ballsBowled: 0, runsConceded: 0,
      ballHistory: [], timedOut: false,
    };
    soloPlayerActive.set(ctx.from.id, match.groupId);

    try {
      const { id, username, first_name, last_name } = ctx.from;
      await User.updateOne(
        { telegramId: String(id) },
        { $set: { telegramId: String(id), username: username?.toLowerCase(), firstName: first_name, lastName: last_name } },
        { upsert: true }
      );
    } catch (e) { console.error("[SOLO] solojoin DB:", e.message); }

    try { await ctx.deleteMessage(); } catch {}

    const list = match.players.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
    const msg  = await ctx.reply(
      `✅ ${name} joined! (${match.players.length}/10)\n\n<blockquote>${list}</blockquote>`,
      { parse_mode: "HTML" }
    );
    setTimeout(() => bot.telegram.deleteMessage(match.groupId, msg.message_id).catch(() => {}), 5000);
  });


  /* ═══════════════════════════════════════════════════════════
     /closesolo  — admin only
  ═══════════════════════════════════════════════════════════ */

  bot.command("closesolo", async (ctx) => {
    if (ctx.chat.type === "private")
      return ctx.reply("⚠️ Use this in the group.");

    const match = getSoloMatch(ctx);
    if (!match || match.phase !== "join")
      return ctx.reply("⚠️ No open solo lobby.");

    if (!(await isGroupAdmin(ctx, ctx.from.id)))
      return ctx.reply("❌ Only group admins can start the match.");

    if (match.players.length < 3)
      return ctx.reply(
        `⚠️ Need at least 3 players.\n\n<blockquote>Currently: ${match.players.length}</blockquote>`,
        { parse_mode: "HTML" }
      );

    clearLobbyTimers(match);
    try { await ctx.deleteMessage(); } catch {}
    await startMatch(match);
  });


  /* ═══════════════════════════════════════════════════════════
     /endsolo  — admin only
  ═══════════════════════════════════════════════════════════ */

  bot.command("endsolo", async (ctx) => {
    if (ctx.chat.type === "private")
      return ctx.reply("⚠️ Use this in the group.");

    const match = getSoloMatch(ctx);
    if (!match || match.matchEnded || match.phase === "idle")
      return ctx.reply("⚠️ No active solo match.");

    if (!(await isGroupAdmin(ctx, ctx.from.id)))
      return ctx.reply("❌ Only group admins can end the match.");

    clearSoloTimers(match);
    clearLobbyTimers(match);
    try { await ctx.deleteMessage(); } catch {}

    await ctx.reply(
      "🛑 Solo match ended by admin.\n\n<blockquote>Generating final scorecard...</blockquote>",
      { parse_mode: "HTML" }
    );

    await endSoloMatch(match);
  });


  /* ═══════════════════════════════════════════════════════════
     /soloscore  — live scorecard
  ═══════════════════════════════════════════════════════════ */

  bot.command("soloscore", async (ctx) => {
    const match = getSoloMatch(ctx);
    if (!match || match.matchEnded || match.phase === "idle")
      return ctx.reply("⚠️ No active solo match.");

    const card = generateSoloScorecard(match, { final: false });

    try {
      await ctx.reply(card, { parse_mode: "HTML" });
    } catch (e) {
      console.error("[SOLO soloscore] HTML failed:", e.message);
      try {
        await ctx.reply(
          card.replace(/<[^>]*>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
        );
      } catch {}
    }
  });


  /* ═══════════════════════════════════════════════════════════
     /solostats  — personal lifetime stats
  ═══════════════════════════════════════════════════════════ */

  bot.command("solostats", async (ctx) => {
    const text = await getSoloStatsText(ctx.from.id, ctx.from.first_name);
    try {
      await ctx.reply(text, { parse_mode: "HTML" });
    } catch {
      await ctx.reply(text.replace(/<[^>]*>/g,"").replace(/&amp;/g,"&")).catch(() => {});
    }
  });


  /* ═══════════════════════════════════════════════════════════
     INTERNAL: close lobby and start match
  ═══════════════════════════════════════════════════════════ */

  async function startMatch(match) {
    match.phase = "play";

    match.batterIndex  = 0;
    match.bowlerIndex  = 1;
    match.batter       = match.players[0].id;
    match.bowler       = match.players[1].id;
    match.striker      = match.batter;
    match.ballsThisSet = 0;
    match.setCount     = 0;

    soloPlayerActive.set(match.batter, match.groupId);
    soloPlayerActive.set(match.bowler, match.groupId);

    const list       = match.players.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
    const batterName = getSoloName(match, match.batter);
    const bowlerName = getSoloName(match, match.bowler);

    await bot.telegram.sendMessage(
      match.groupId,
`🏏 <b>Solo Match Starting!</b>

<blockquote>${list}</blockquote>

<blockquote>🏏 ${batterName}  bats first\n🎯 ${bowlerName}  bowls first (3 balls)</blockquote>

<b>How to play</b>
<blockquote>🏏 Batter — send 0–6 in GROUP
🎯 Bowler — send 1–6 in DM
💀 Same number = wicket!</blockquote>`,
      { parse_mode: "HTML" }
    ).catch(e => console.error("[SOLO startMatch]", e.message));

    await soloBallHandler.startBall(match);
  }


  /* ═══════════════════════════════════════════════════════════
     TEXT INPUT HANDLER
     Registered before team handleInput in index.js.
     Passes non-solo messages to next().
  ═══════════════════════════════════════════════════════════ */

  bot.on("text", async (ctx, next) => {
    if (ctx.message.text.startsWith("/")) return next();

    const match = getSoloMatch(ctx);
    if (!match || match.matchEnded || match.phase !== "play") return next();

    const text = ctx.message.text.trim();

    /* ── GROUP: batter ── */
    if (ctx.chat.type !== "private") {
      if (!match.awaitingBat) return next();
      if (ctx.from.id !== match.batter) return; // silently ignore non-batter

      if (!/^[0-6]$/.test(text))
        return ctx.reply("❌ Send a number 0–6.");

      if (match.ballLocked)
        return ctx.reply("⏳ Processing — please wait.");

      match.strikerMessageId = ctx.message.message_id;
      match.batNumber        = Number(text);
      match.awaitingBat      = false;

      if (match.bowlNumber === null) return;

      match.ballLocked = true;
      clearSoloTimers(match);
      return soloBallHandler.processBall(match);
    }

    /* ── DM: bowler ── */
    if (!match.awaitingBowl) return next();
    if (ctx.from.id !== match.bowler)
      return ctx.reply("❌ You are not the current bowler.");

    if (!/^[1-6]$/.test(text))
      return ctx.reply("❌ Send a number 1–6.");

    clearSoloTimers(match);
    match.bowlNumber   = Number(text);
    match.awaitingBowl = false;
    match.awaitingBat  = true;
    match.ballLocked   = false;

    await ctx.reply("✅ Submitted — waiting for batter");

    const batterName = getSoloName(match, match.batter);
    const ballNum    = `Ball ${match.ballsThisSet}/3`;

    await bot.telegram.sendMessage(
      match.groupId,
      `${ping(match.batter, batterName)} 🏏 ${ballNum} — send your number (0–6)`,
      { parse_mode: "HTML" }
    ).catch(() => {});

    soloBallHandler.startTurnTimer(match, "bat");
  });

};