const { getMatch } = require("../matchManager");

module.exports = function (bot, helpers) {

  function getName(match, id) {
    if (!match) return "Player";
    const all = [...(match.teamA || []), ...(match.teamB || [])];
    const p = all.find(x => x.id === id);
    return p ? p.name : "Player";
  }

  // Strips ALL characters that can break Telegram HTML parse_mode:
  // - HTML special chars (&, <, >)
  // - Control characters
  // - Emoji that aren't in the BMP (some cause parse issues in certain clients)
  function safeHtml(str) {
    return String(str ?? "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // control chars
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function short(name) {
    const s = String(name ?? "");
    return s.length > 10 ? s.substring(0, 9) + "…" : s;
  }

  function getLiveScore(match) {
    if (!match) return null;

    // Safe fallbacks for every nullable field
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

    const battingTeamLetter  = match.battingTeam  || "A";
    const bowlingTeamLetter  = match.bowlingTeam  || "B";
    const battingTeamName    = battingTeamLetter  === "A" ? match.teamAName : match.teamBName;
    const bowlingTeamName    = bowlingTeamLetter  === "A" ? match.teamAName : match.teamBName;

    const st  = match.batterStats?.[match.striker]    || { runs: 0, balls: 0 };
    const nst = match.batterStats?.[match.nonStriker] || { runs: 0, balls: 0 };
    const stSR  = st.balls  > 0 ? ((st.runs  / st.balls)  * 100).toFixed(0) : "0";
    const nstSR = nst.balls > 0 ? ((nst.runs / nst.balls) * 100).toFixed(0) : "0";

    const bwl   = match.bowlerStats?.[match.bowler] || { balls: 0, runs: 0, wickets: 0 };
    const bwlOv = `${Math.floor(bwl.balls / 6)}.${bwl.balls % 6}`;
    const econ  = bwl.balls > 0 ? ((bwl.runs / bwl.balls) * 6).toFixed(2) : "0.00";

    const partRuns  = match.currentPartnershipRuns  || 0;
    const partBalls = match.currentPartnershipBalls || 0;

    const strikerName    = safeHtml(short(getName(match, match.striker)));
    const nonStrikerName = safeHtml(short(getName(match, match.nonStriker)));
    const bowlerName     = safeHtml(short(getName(match, match.bowler)));
    const batTeamSafe    = safeHtml(battingTeamName  || "Team");
    const bowlTeamSafe   = safeHtml(bowlingTeamName  || "Team");

    const currentOverHistory = (match.overHistory || []).find(
      o => o.bowler === match.bowler && o.over === curOver + 1
    );
    const overBalls = currentOverHistory
      ? currentOverHistory.balls.map(x => x === "W" ? "W" : String(x)).join(" ")
      : "-";

    const lines = [
      `📊 <b>Live Score</b>`,
      ``,
      `🏏 <b>${batTeamSafe}</b> (Team ${battingTeamLetter})  batting`,
      `🎯 <b>${bowlTeamSafe}</b> (Team ${bowlingTeamLetter})  bowling`,
      ``,
      `<blockquote>📊 ${score}/${wickets}   ⚙️ ${curOver}.${curBall}/${totalOvers}   📈 ${runRate}</blockquote>`,
    ];

    if (match.innings === 2) {
      const runsNeeded = (match.firstInningsScore + 1) - score;
      if (runsNeeded > 0) {
        const rrr = ballsLeft > 0 ? ((runsNeeded / ballsLeft) * 6).toFixed(2) : "-";
        lines.push(`<blockquote>🏹 Need ${runsNeeded} from ${ballsLeft} balls   RRR: ${rrr}</blockquote>`);
      } else {
        lines.push(`<blockquote>✅ Target achieved!</blockquote>`);
      }
    }

    lines.push(
      ``,
      `<b>🏏 Batting</b>`,
      `<blockquote>⭐ ${strikerName}  ${st.runs}(${st.balls})  SR:${stSR}\n` +
      `🏹 ${nonStrikerName}  ${nst.runs}(${nst.balls})  SR:${nstSR}\n` +
      `🤝 Partnership: ${partRuns}(${partBalls})</blockquote>`,
      ``,
      `<b>🎾 Bowling</b>`,
      `<blockquote>🎾 ${bowlerName}  ${bwlOv}ov  ${bwl.runs}r  ${bwl.wickets}w  econ:${econ}\n` +
      `This over: ${overBalls}</blockquote>`
    );

    return lines.join("\n");
  }


  /* ================= /score COMMAND ================= */

  bot.command("score", async (ctx) => {
    const match = getMatch(ctx);
    if (!match) return ctx.reply("⚠️ No active match.");

    // Generate ONCE — old code called getLiveScore() twice which could
    // produce inconsistent output if match state changed between calls
    const text = getLiveScore(match);

    if (!text) return ctx.reply("⚠️ Could not generate score.");

    try {
      await ctx.reply(text, { parse_mode: "HTML" });
    } catch (e) {
      console.error("Score send failed:", e.message);
      // Strip all HTML tags for plain text fallback — use the SAME text, not a second call
      try {
        await ctx.reply(text.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
      } catch (e2) {
        console.error("Score fallback failed:", e2.message);
        await ctx.reply("⚠️ Score unavailable — try again.").catch(() => {});
      }
    }
  });

};