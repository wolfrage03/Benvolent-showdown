// ===============================================================
// SOLO MODE COMMANDS — soloCommands.js (FIXED VERSION)
// ===============================================================

const {
  soloMatches,
  soloPlayerActive,
  getSoloMatch,
  resetSoloMatch,
  deleteSoloMatch,
} = require("./soloMatchManager");

const soloBallHandler = require("./soloBallHandler");
const generateSoloScorecard = require("./soloScorecard");

// ✅ FIXED: correct filename (case-sensitive)
const {
  saveSoloMatchStats,
  determineMOTM,
  getSoloStatsText,
} = require("./soloStats");

const User = require("../User");

module.exports = function registerSoloCommands(bot, helpers) {
  const { isUserBanned } = helpers;

  /* ================= HELPERS ================= */

  const getSoloName = (match, id) =>
    match?.players.find(p => p.id === id)?.name || "Player";

  const ping = (id, name) =>
    `<a href="tg://user?id=${id}">${name}</a>`;

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

  const isGroupAdmin = async (ctx, id) => {
    try {
      const m = await ctx.getChatMember(id);
      return ["administrator", "creator"].includes(m.status);
    } catch { return false; }
  };

  /* ================= ROTATION ================= */

  const nextIndex = (match, after, type) => {
    const n = match.players.length;
    for (let i = 1; i < n; i++) {
      const idx = (after + i) % n;
      const p = match.players[idx];
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
    match.bowler = match.players[next].id;

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

    if (force) return rotateBowler(match);

    if (wicket) {
      const next = nextIndex(match, match.batterIndex, "batter");
      if (next === -1) return endSoloMatch(match);

      match.batterIndex = next;
      match.batter = match.players[next].id;

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

    const card = generateSoloScorecard(match, {
      final: true,
      motm: match.motm,
    });

    await bot.telegram.sendMessage(match.groupId, card, {
      parse_mode: "HTML",
    }).catch(() => {});

    match.players.forEach(p => soloPlayerActive.delete(p.id));
    deleteSoloMatch(match.groupId);
  }

  /* ================= INIT ================= */

  soloBallHandler.init({
    bot,
    getSoloName,
    clearSoloTimers,
    advanceSolo,
    endSoloMatch,
  });

  /* ================= COMMANDS ================= */

  bot.command("solostart", async (ctx) => {
    if (ctx.chat.type === "private")
      return ctx.reply("Use in group.");

    const match = resetSoloMatch(ctx.chat.id);
    match.phase = "join";

    const name = ctx.from.first_name || "Player";

    match.players.push({ id: ctx.from.id, name });
    match.stats[ctx.from.id] = { runs: 0 };

    soloPlayerActive.set(ctx.from.id, ctx.chat.id);

    await ctx.reply(
      `🏏 <b>Solo Lobby Started</b>\n\n1. ${name}\n\n👉 /solojoin`,
      { parse_mode: "HTML" }
    );

    match.joinTimer = setTimeout(() => {
      if (match.players.length < 3) {
        deleteSoloMatch(match.groupId);
        return bot.telegram.sendMessage(match.groupId, "❌ Not enough players");
      }
      startMatch(match);
    }, 120000);
  });

  bot.command("solojoin", async (ctx) => {
    const match = getSoloMatch(ctx);
    if (!match || match.phase !== "join")
      return ctx.reply("No lobby.");

    if (match.players.length >= 10)
      return ctx.reply("Full.");

    const name = ctx.from.first_name || "Player";

    match.players.push({ id: ctx.from.id, name });
    match.stats[ctx.from.id] = { runs: 0 };

    soloPlayerActive.set(ctx.from.id, match.groupId);

    await ctx.reply(`✅ ${name} joined`);
  });

  bot.command("soloscore", async (ctx) => {
    const match = getSoloMatch(ctx);
    if (!match) return ctx.reply("No match.");

    const card = generateSoloScorecard(match, { final: false });
    ctx.reply(card, { parse_mode: "HTML" });
  });

  bot.command("solostats", async (ctx) => {
    const text = await getSoloStatsText(ctx.from.id, ctx.from.first_name);
    ctx.reply(text, { parse_mode: "HTML" });
  });

  async function startMatch(match) {
    match.phase = "play";

    match.batterIndex = 0;
    match.bowlerIndex = 1;
    match.batter = match.players[0].id;
    match.bowler = match.players[1].id;

    await bot.telegram.sendMessage(
      match.groupId,
      `🏏 Match Started!\n\n🏏 ${getSoloName(match, match.batter)} batting\n🎯 ${getSoloName(match, match.bowler)} bowling`,
      { parse_mode: "HTML" }
    );

    soloBallHandler.startBall(match);
  }

  /* ================= INPUT ================= */

  bot.on("text", async (ctx, next) => {
    if (ctx.message.text.startsWith("/")) return next();

    const match = getSoloMatch(ctx);
    if (!match || match.phase !== "play") return next();

    const text = ctx.message.text.trim();

    if (ctx.chat.type !== "private") {
      if (ctx.from.id !== match.batter) return;
      if (!/^[0-6]$/.test(text)) return;

      match.batNumber = Number(text);
      if (match.bowlNumber !== null)
        return soloBallHandler.processBall(match);
    } else {
      if (ctx.from.id !== match.bowler) return;
      if (!/^[1-6]$/.test(text)) return;

      match.bowlNumber = Number(text);

      await ctx.reply("✅ Done");
    }
  });
};