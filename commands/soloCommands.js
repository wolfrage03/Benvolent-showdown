// ===============================================================
// SOLO MODE COMMANDS  —  soloCommands.js
// ===============================================================
//
// Commands
//   /solostart  — anyone opens a lobby (auto-joins as player 1)
//   /solojoin   — anyone joins the lobby
//   /closesolo  — GROUP ADMIN ONLY — closes lobby and starts match
//   /endsolo    — GROUP ADMIN ONLY — force ends a running match
//   /solostats  — personal lifetime solo stats from DB
//
// Input handler (text)
//   Group:   batter sends 0–6
//   DM:      bowler sends 1–6
//
// Isolation
//   • Uses soloMatches / soloPlayerActive — zero overlap with team maps
//   • Blocks /solostart if a team match is active in the same group
//   • Blocks /solostart if a solo match is already active
//
// ===============================================================

const {
  soloMatches,
  soloPlayerActive,
  getSoloMatch,
  resetSoloMatch,
  deleteSoloMatch,
} = require("./soloMatchManager");

const soloBallHandler = require("./soloBallHandler");
const User            = require("../User");


module.exports = function registerSoloCommands(bot, helpers) {

  const { isUserBanned } = helpers;


  /* ─────────────────────────────────────────
     PURE HELPERS  (no side-effects)
  ───────────────────────────────────────── */

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

  async function isGroupAdmin(ctx, userId) {
    try {
      const member = await ctx.getChatMember(userId);
      return ["administrator", "creator"].includes(member.status);
    } catch {
      return false;
    }
  }


  /* ─────────────────────────────────────────
     NEXT BATTER
     Returns the index of the next non-out player
     after `afterIndex` (wraps around).
     Returns -1 if nobody is left alive.
  ───────────────────────────────────────── */

  function nextBatterIndex(match, afterIndex) {
    const n = match.players.length;
    for (let i = 1; i < n; i++) {
      const idx = (afterIndex + i) % n;
      if (!match.stats[match.players[idx].id]?.out) return idx;
    }
    return -1;
  }


  /* ─────────────────────────────────────────
     NEXT BOWLER
     Round-robin from `afterIndex`, skipping the
     current batter and any dismissed players.
     Returns -1 if no valid bowler exists.
  ───────────────────────────────────────── */

  function nextBowlerIndex(match, afterIndex) {
    const n = match.players.length;
    for (let i = 1; i < n; i++) {
      const idx = (afterIndex + i) % n;
      const p   = match.players[idx];
      if (idx !== match.batterIndex && !match.stats[p.id]?.out) return idx;
    }
    return -1;
  }


  /* ─────────────────────────────────────────
     ADVANCE SOLO
     Core rotation logic called after every ball.
     wasWicket = true  → batter just got out.
     wasWicket = false → normal run ball.
  ───────────────────────────────────────── */

  async function advanceSolo(match, wasWicket = false) {
    if (!match || match.matchEnded) return;

    const aliveCount = match.players.filter(p => !match.stats[p.id]?.out).length;

    // Nobody left standing
    if (aliveCount === 0) return endSoloMatch(match);

    // Only one alive and they are already the batter — no bowler possible
    if (aliveCount === 1) {
      const soleAlive = match.players.find(p => !match.stats[p.id]?.out);
      if (soleAlive && soleAlive.id === match.batter) return endSoloMatch(match);
    }

    /* ── Wicket: rotate batter, keep bowler's current set going ── */
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
`🏏 <b>New Batter</b>\n\n<blockquote>🏏 ${batterName}  is now batting\n🎯 ${bowlerName}  continues (${ballsLeft} ball${ballsLeft !== 1 ? "s" : ""} left in set)</blockquote>`,
        { parse_mode: "HTML" }
      );

      // If bowler's set is also exhausted, rotate bowler before next ball
      if (match.ballsThisSet >= 3) return rotateBowler(match);
      return soloBallHandler.startBall(match);
    }

    /* ── Run ball: check if 3-ball set is done ── */
    if (match.ballsThisSet >= 3) return rotateBowler(match);

    /* ── Continue current set ── */
    return soloBallHandler.startBall(match);
  }


  /* ─────────────────────────────────────────
     ROTATE BOWLER
     Resets ballsThisSet, advances bowlerIndex,
     announces new bowler, then starts next ball.
  ───────────────────────────────────────── */

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
    );

    return soloBallHandler.startBall(match);
  }


  /* ─────────────────────────────────────────
     END SOLO MATCH
     Saves lifetime stats to DB, announces winner.
  ───────────────────────────────────────── */

  async function endSoloMatch(match) {
    if (!match || match.matchEnded) return;
    match.matchEnded = true;
    match.phase      = "idle";
    clearSoloTimers(match);

    // ── Persist stats ──
    try {
      for (const p of match.players) {
        const s = match.stats[p.id] || {};
        await User.updateOne(
          { telegramId: String(p.id) },
          {
            $inc: {
              soloMatchesPlayed:  1,
              soloTotalRuns:      s.runs          || 0,
              soloTotalWickets:   s.wickets       || 0,
              soloTotalBalls:     s.balls         || 0,
              soloBallsBowled:    s.ballsBowled   || 0,
              soloRunsConceded:   s.runsConceded  || 0,
            }
          },
          { upsert: true }
        );
      }
    } catch (e) {
      console.error("[SOLO endSoloMatch] DB error:", e.message);
    }

    // ── Build result message ──
    const sorted = [...match.players].sort((a, b) =>
      (match.stats[b.id]?.runs || 0) - (match.stats[a.id]?.runs || 0)
    );

    const winner      = sorted[0];
    const winnerStats = match.stats[winner.id] || {};

    let msg = `🏆 <b>Solo Match Over!</b>\n\n`;
    msg    += `<blockquote>🥇 Winner: ${winner.name}\n`;
    msg    += `🏏 ${winnerStats.runs || 0} runs (${winnerStats.balls || 0} balls)</blockquote>\n\n`;
    msg    += `<b>Final Standings</b>\n\n`;

    const medals = ["🥇", "🥈", "🥉"];
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const s = match.stats[p.id] || { runs: 0, balls: 0, wickets: 0, ballsBowled: 0 };
      const sr = s.balls > 0 ? ((s.runs / s.balls) * 100).toFixed(0) : "0";
      const medal = medals[i] || `${i + 1}.`;
      msg += `<blockquote>${medal} ${p.name}\n`;
      msg += `🏏 ${s.runs}(${s.balls})  SR: ${sr}  🎯 ${s.wickets}w / ${s.ballsBowled}b</blockquote>\n`;
    }

    msg += `\n👉 /solostart for a new match`;

    try {
      await bot.telegram.sendMessage(match.groupId, msg, { parse_mode: "HTML" });
    } catch (e) {
      console.error("[SOLO endSoloMatch] send error:", e.message);
    }

    // Clean up active map
    for (const p of match.players) soloPlayerActive.delete(p.id);
    deleteSoloMatch(match.groupId);
  }


  /* ─────────────────────────────────────────
     INJECT DEPS INTO BALL HANDLER
  ───────────────────────────────────────── */

  soloBallHandler.init({
    bot,
    getSoloName,
    clearSoloTimers,
    advanceSolo,
    endSoloMatch,
  });


  /* ═══════════════════════════════════════════════════════════
     /solostart  — open a lobby, auto-join as player 1
  ═══════════════════════════════════════════════════════════ */

  bot.command("solostart", async (ctx) => {
    if (ctx.chat.type === "private")
      return ctx.reply("⚠️ Use /solostart in a group chat.");

    // Block if a TEAM match is running here
    const { matches } = require("../matchManager");
    const teamMatch   = matches.get(ctx.chat.id);
    if (teamMatch && !teamMatch.matchEnded && teamMatch.phase !== "idle") {
      return ctx.reply(
        "⚠️ A team match is running in this group.\n\n<blockquote>End it with /endmatch before starting a solo match.</blockquote>",
        { parse_mode: "HTML" }
      );
    }

    // Block if a solo match is already running here
    const existing = soloMatches.get(ctx.chat.id);
    if (existing && !existing.matchEnded && existing.phase !== "idle") {
      return ctx.reply("⚠️ A solo match is already running here.");
    }

    if (await isUserBanned(ctx.from.id))
      return ctx.reply("🚫 You are banned from this bot.");

    // Check user not already in another solo match elsewhere
    if (soloPlayerActive.has(ctx.from.id))
      return ctx.reply("❌ You are already in a solo match.");

    // Check user not in a team match elsewhere
    const { playerActiveMatch } = require("../matchManager");
    if (playerActiveMatch.has(ctx.from.id))
      return ctx.reply("❌ You are already in a team match.");

    // Create match, initiator auto-joins as player 1
    const match  = resetSoloMatch(ctx.chat.id);
    match.phase  = "join";

    const name = ctx.from.first_name || "Player";
    match.players.push({ id: ctx.from.id, name });
    match.stats[ctx.from.id] = { runs: 0, balls: 0, wickets: 0, out: false, ballsBowled: 0, runsConceded: 0 };
    soloPlayerActive.set(ctx.from.id, ctx.chat.id);

    // DB upsert
    try {
      const { id, username, first_name, last_name } = ctx.from;
      await User.updateOne(
        { telegramId: String(id) },
        { $set: { telegramId: String(id), username: username?.toLowerCase(), firstName: first_name, lastName: last_name } },
        { upsert: true }
      );
    } catch (e) { console.error("[SOLO] solostart DB error:", e.message); }

    try { await ctx.deleteMessage(); } catch {}

    await ctx.reply(
`🏏 <b>Solo Cricket — Lobby Open!</b>

<blockquote>📋 Every player bats until they get out.
🎯 Each bowler gets exactly 3 balls, then rotates.
🔄 Join order = batting &amp; bowling order.
👥 Min 3 · Max 10 players</blockquote>

<blockquote>1. ${name}  ✅ joined</blockquote>

👉 /solojoin to enter
👮 Group admin: /closesolo to start  |  /endsolo to end`,
      { parse_mode: "HTML" }
    );

    // Auto-expire lobby after 120 s if admin never closes it
    match.joinTimer = setTimeout(async () => {
      if (match.phase !== "join") return;

      if (match.players.length < 3) {
        // Not enough players — cancel silently
        for (const p of match.players) soloPlayerActive.delete(p.id);
        deleteSoloMatch(match.groupId);
        await bot.telegram.sendMessage(
          match.groupId,
          "⏱ Solo lobby expired.\n\n<blockquote>Not enough players joined (need at least 3).</blockquote>",
          { parse_mode: "HTML" }
        );
        return;
      }

      // Enough players — start automatically
      await startMatch(match);
    }, 120000);
  });


  /* ═══════════════════════════════════════════════════════════
     /solojoin  — anyone joins the open lobby
  ═══════════════════════════════════════════════════════════ */

  bot.command("solojoin", async (ctx) => {
    if (ctx.chat.type === "private")
      return ctx.reply("⚠️ Use /solojoin in the group.");

    const match = getSoloMatch(ctx);
    if (!match || match.phase !== "join")
      return ctx.reply("⚠️ No open solo lobby here. Use /solostart first.");

    if (await isUserBanned(ctx.from.id))
      return ctx.reply("🚫 You are banned from this bot.");

    // Already in this lobby?
    if (match.players.some(p => p.id === ctx.from.id))
      return ctx.reply("⚠️ You already joined this lobby.");

    // Already in a different solo match?
    if (soloPlayerActive.has(ctx.from.id))
      return ctx.reply("❌ You are already in another solo match.");

    // Already in a team match?
    const { playerActiveMatch } = require("../matchManager");
    if (playerActiveMatch.has(ctx.from.id))
      return ctx.reply("❌ You are already in a team match.");

    if (match.players.length >= 10)
      return ctx.reply("⚠️ Lobby is full (10 players max).");

    const name = ctx.from.first_name || "Player";
    match.players.push({ id: ctx.from.id, name });
    match.stats[ctx.from.id] = { runs: 0, balls: 0, wickets: 0, out: false, ballsBowled: 0, runsConceded: 0 };
    soloPlayerActive.set(ctx.from.id, match.groupId);

    // DB upsert
    try {
      const { id, username, first_name, last_name } = ctx.from;
      await User.updateOne(
        { telegramId: String(id) },
        { $set: { telegramId: String(id), username: username?.toLowerCase(), firstName: first_name, lastName: last_name } },
        { upsert: true }
      );
    } catch (e) { console.error("[SOLO] solojoin DB error:", e.message); }

    try { await ctx.deleteMessage(); } catch {}

    const list = match.players.map((p, i) => `${i + 1}. ${p.name}`).join("\n");

    const joinMsg = await ctx.reply(
      `✅ ${name} joined! (${match.players.length}/10)\n\n<blockquote>${list}</blockquote>`,
      { parse_mode: "HTML" }
    );
    setTimeout(() =>
      bot.telegram.deleteMessage(match.groupId, joinMsg.message_id).catch(() => {}),
    4000);
  });


  /* ═══════════════════════════════════════════════════════════
     /closesolo  — GROUP ADMIN ONLY — close lobby & start
  ═══════════════════════════════════════════════════════════ */

  bot.command("closesolo", async (ctx) => {
    if (ctx.chat.type === "private")
      return ctx.reply("⚠️ Use this command in the group.");

    const match = getSoloMatch(ctx);
    if (!match || match.phase !== "join")
      return ctx.reply("⚠️ No open solo lobby to close.");

    if (!(await isGroupAdmin(ctx, ctx.from.id)))
      return ctx.reply("❌ Only group admins can start the solo match.");

    if (match.players.length < 3)
      return ctx.reply(
        `⚠️ Need at least 3 players to start.\n\n<blockquote>Currently: ${match.players.length} player${match.players.length !== 1 ? "s" : ""}</blockquote>`,
        { parse_mode: "HTML" }
      );

    if (match.joinTimer) { clearTimeout(match.joinTimer); match.joinTimer = null; }

    try { await ctx.deleteMessage(); } catch {}
    await startMatch(match);
  });


  /* ═══════════════════════════════════════════════════════════
     /endsolo  — GROUP ADMIN ONLY — force end running match
  ═══════════════════════════════════════════════════════════ */

  bot.command("endsolo", async (ctx) => {
    if (ctx.chat.type === "private")
      return ctx.reply("⚠️ Use this command in the group.");

    const match = getSoloMatch(ctx);
    if (!match || match.matchEnded || match.phase === "idle")
      return ctx.reply("⚠️ No active solo match to end.");

    if (!(await isGroupAdmin(ctx, ctx.from.id)))
      return ctx.reply("❌ Only group admins can end the solo match.");

    clearSoloTimers(match);
    if (match.joinTimer) { clearTimeout(match.joinTimer); match.joinTimer = null; }

    try { await ctx.deleteMessage(); } catch {}

    await ctx.reply(
      "🛑 Solo match ended by admin.\n\n<blockquote>Calculating final standings...</blockquote>",
      { parse_mode: "HTML" }
    );

    await endSoloMatch(match);
  });


  /* ═══════════════════════════════════════════════════════════
     /solostats  — personal lifetime solo stats
  ═══════════════════════════════════════════════════════════ */

  bot.command("solostats", async (ctx) => {
    const userId = ctx.from.id;

    let dbUser;
    try {
      dbUser = await User.findOne({ telegramId: String(userId) }).lean();
    } catch {
      return ctx.reply("⚠️ Could not fetch stats. Try again later.");
    }

    if (!dbUser || !dbUser.soloMatchesPlayed)
      return ctx.reply("❌ No solo stats yet. Play a solo match first!");

    const played  = dbUser.soloMatchesPlayed  || 0;
    const runs    = dbUser.soloTotalRuns       || 0;
    const wickets = dbUser.soloTotalWickets    || 0;
    const balls   = dbUser.soloTotalBalls      || 0;
    const bowled  = dbUser.soloBallsBowled     || 0;
    const given   = dbUser.soloRunsConceded    || 0;

    const avg  = played > 0 ? (runs / played).toFixed(1)              : "—";
    const sr   = balls  > 0 ? ((runs / balls) * 100).toFixed(1)       : "—";
    const econ = bowled > 0 ? ((given / bowled) * 6).toFixed(2)       : "—";

    const name = ctx.from.first_name || "Player";

    await ctx.reply(
`📊 <b>Solo Stats — ${name}</b>

<blockquote>🏏 Matches Played:  ${played}</blockquote>

<blockquote>Batting
🏏 Total Runs:     ${runs}
📦 Balls Faced:    ${balls}
⚡ Strike Rate:    ${sr}
📈 Avg per match:  ${avg}</blockquote>

<blockquote>Bowling
🎯 Wickets Taken:  ${wickets}
🎯 Balls Bowled:   ${bowled}
💧 Runs Given:     ${given}
📉 Economy:        ${econ}</blockquote>`,
      { parse_mode: "HTML" }
    );
  });


  /* ─────────────────────────────────────────
     INTERNAL: start the match after lobby closes
  ───────────────────────────────────────── */

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
<blockquote>🏏 Batter — send 0–6 in this GROUP
🎯 Bowler — send 1–6 in DM
💀 Same number = wicket!</blockquote>`,
      { parse_mode: "HTML" }
    );

    await soloBallHandler.startBall(match);
  }


  /* ═══════════════════════════════════════════════════════════
     TEXT INPUT HANDLER
     Must be registered BEFORE team-mode text handler in index.js.
     Passes through to next() for anything not solo-related.
  ═══════════════════════════════════════════════════════════ */

  bot.on("text", async (ctx, next) => {
    if (ctx.message.text.startsWith("/")) return next();

    const match = getSoloMatch(ctx);

    // Not a solo match context — let team handler deal with it
    if (!match || match.matchEnded || match.phase !== "play") return next();

    const text = ctx.message.text.trim();

    /* ── GROUP: batter input ── */
    if (ctx.chat.type !== "private") {
      if (!match.awaitingBat) return next();

      // Silently ignore anyone who isn't the batter
      if (ctx.from.id !== match.batter) return;

      if (!/^[0-6]$/.test(text))
        return ctx.reply("❌ Send a number 0–6.");

      if (match.ballLocked)
        return ctx.reply("⏳ Processing — please wait.");

      match.strikerMessageId = ctx.message.message_id;
      match.batNumber        = Number(text);
      match.awaitingBat      = false;

      if (match.bowlNumber === null) return; // shouldn't happen but guard it

      match.ballLocked = true;
      clearSoloTimers(match);
      return soloBallHandler.processBall(match);
    }

    /* ── DM: bowler input ── */
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
    const ballNum    = `Ball ${match.ballsThisSet}/3`;   // ballsThisSet already incremented in processBall, so show current

    await bot.telegram.sendMessage(
      match.groupId,
      `${ping(match.batter, batterName)} 🏏 ${ballNum} — send your number (0–6)`,
      { parse_mode: "HTML" }
    );

    soloBallHandler.startTurnTimer(match, "bat");
  });

};