const { getMatch } = require("../matchManager");

module.exports = function (bot, helpers) {

  function getName(match, id) {
    if (!match) return "Player";
    const all = [...(match.teamA || []), ...(match.teamB || [])];
    const p = all.find(x => x.id === id);
    return p ? p.name : "Player";
  }

  function safeHtml(str) {
    return String(str ?? "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .replace(/[\uD800-\uDFFF]/g, "")
      .replace(/[\uFFF0-\uFFFF]/g, "")
      .replace(/[^\u0000-\uFFFF]/g, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .trim();
  }

  function safeName(str) {
    return safeHtml(str)
      .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "")
      .replace(/[\u0300-\u036F]/g, "")
      || "Player";
  }

  function short(name) {
    const s = String(name ?? "");
    return s.length > 14 ? s.substring(0, 13) + "…" : s;
  }

  function getLiveScore(match) {
    if (!match) return null;

    const score      = match.score        ?? 0;
    const wickets    = match.wickets      ?? 0;
    const curOver    = match.currentOver  ?? 0;
    const curBall    = match.currentBall  ?? 0;
    const totalOvers = match.totalOvers   ?? 0;

    const ballsBowled = (curOver * 6) + curBall;
    const totalBalls  = totalOvers * 6;
    const ballsLeft   = Math.max(totalBalls - ballsBowled, 0);
    const runRate     = ballsBowled > 0
      ? ((score / ballsBowled) * 6).toFixed(2) : "0.00";

    const battingTeamLetter = match.battingTeam || "A";
    const battingTeamName   = safeName(battingTeamLetter === "A" ? match.teamAName : match.teamBName);

    const inn1TeamLetter = match.innings === 2
      ? (match.battingTeam === "A" ? "B" : "A")
      : battingTeamLetter;
    const inn1TeamName = safeName(
      inn1TeamLetter === "A" ? match.teamAName : match.teamBName
    );

    const st  = match.batterStats?.[match.striker]    || { runs: 0, balls: 0 };
    const nst = match.batterStats?.[match.nonStriker] || { runs: 0, balls: 0 };
    const stSR  = st.balls  > 0 ? ((st.runs  / st.balls)  * 100).toFixed(0) : "0";
    const nstSR = nst.balls > 0 ? ((nst.runs / nst.balls) * 100).toFixed(0) : "0";

    const bwl   = match.bowlerStats?.[match.bowler] || { balls: 0, runs: 0, wickets: 0 };
    const bwlOv = `${Math.floor(bwl.balls / 6)}.${bwl.balls % 6}`;
    const econ  = bwl.balls > 0 ? ((bwl.runs / bwl.balls) * 6).toFixed(2) : "0.00";

    const partRuns  = match.currentPartnershipRuns  || 0;
    const partBalls = match.currentPartnershipBalls || 0;

    const strikerName    = safeName(short(getName(match, match.striker)));
    const nonStrikerName = safeName(short(getName(match, match.nonStriker)));
    const bowlerName     = safeName(short(getName(match, match.bowler)));

    const currentOverHistory = (match.overHistory || []).find(
      o => o.bowler === match.bowler && o.over === curOver + 1
    );
    const overBalls = currentOverHistory
      ? currentOverHistory.balls.map(x => x === "W" ? "W" : String(x)).join(" · ")
      : "—";

    const lines = [];

    // ── Header ──
    lines.push(`📊 <b>Live Score</b>`);
    lines.push(``);

    // ── 1st Innings ──
    if (match.innings === 2 && match.firstInningsScore != null) {
      lines.push(`🏏 <b>1st Innings  ·  ${inn1TeamName}</b>`);
      lines.push(`<blockquote>📌 ${match.firstInningsScore}  |  ${totalOvers}/${totalOvers} ov</blockquote>`);
    } else {
      lines.push(`🏏 <b>1st Innings  ·  ${battingTeamName}</b>`);
      lines.push(`<blockquote>📊 ${score}/${wickets}   ⚙️ ${curOver}.${curBall}/${totalOvers}   📈 RR: ${runRate}</blockquote>`);
    }

    lines.push(``);

    // ── 2nd Innings ──
    if (match.innings === 2) {
      lines.push(`🏏 <b>2nd Innings  ·  ${battingTeamName}</b>`);
      lines.push(`<blockquote>📊 ${score}/${wickets}   ⚙️ ${curOver}.${curBall}/${totalOvers}   📈 RR: ${runRate}</blockquote>`);
      lines.push(``);

      const runsNeeded = (match.firstInningsScore + 1) - score;
      lines.push(`🎯 <b>Target</b>`);
      if (runsNeeded > 0) {
        const rrr = ballsLeft > 0 ? ((runsNeeded / ballsLeft) * 6).toFixed(2) : "—";
        lines.push(`<blockquote>🏹 Need <b>${runsNeeded}</b> from <b>${ballsLeft}</b> balls   RRR: ${rrr}</blockquote>`);
      } else {
        lines.push(`<blockquote>✅ Target achieved!</blockquote>`);
      }
    } else {
      // Inn 2 not started — placeholder
      lines.push(`🏏 <b>2nd Innings</b>`);
      lines.push(`<blockquote>📊 0/0   ⚙️ 0.0/${totalOvers}   📈 RR: 0.00</blockquote>`);
      lines.push(``);
      lines.push(`🎯 <b>Target</b>`);
      lines.push(`<blockquote>🏹 Not yet started</blockquote>`);
    }

    lines.push(``);

    // ── Batting ──
    lines.push(`🏏 <b>Batting</b>`);
    lines.push(``);
    lines.push(`<blockquote>🏏 <b>${strikerName} *</b>\n     ${st.runs} runs  (${st.balls} balls)   SR: ${stSR}</blockquote>`);
    lines.push(`<blockquote>🏏 <b>${nonStrikerName}</b>\n     ${nst.runs} runs  (${nst.balls} balls)   SR: ${nstSR}</blockquote>`);
    lines.push(`<blockquote>🤝 Partnership:  ${partRuns} runs  (${partBalls} balls)</blockquote>`);

    lines.push(``);

    // ── Bowling ──
    // One wide blockquote keeps figures + over history on their own single lines
    lines.push(`🎾 <b>Bowling</b>`);
    lines.push(``);
    lines.push(
      `<blockquote>🎯 <b>${bowlerName}</b>\n` +
      `🔢 ${bwlOv} ov   ${bwl.runs} runs   ${bwl.wickets} wkts   Econ: ${econ}\n` +
      `📋 ${overBalls}</blockquote>`
    );

    return lines.join("\n");
  }


  /* ================= /score COMMAND ================= */

  bot.command("score", async (ctx) => {
    const match = getMatch(ctx);
    if (!match) return ctx.reply("⚠️ No active match.");

    const text = getLiveScore(match);
    if (!text) return ctx.reply("⚠️ Could not generate score.");

    try {
      await ctx.reply(text, { parse_mode: "HTML" });
    } catch (e) {
      console.error("Score send failed:", e.message);
      try {
        const plain = text
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/[\uD800-\uDFFF]/g, "")
          .replace(/[^\u0000-\uFFFF]/g, "");
        await ctx.reply(plain);
      } catch (e2) {
        console.error("Score fallback failed:", e2.message);
        await ctx.reply("⚠️ Score unavailable — a player name contains unsupported characters.").catch(() => {});
      }
    }
  });

};