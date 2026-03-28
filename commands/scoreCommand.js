const { getMatch } = require("../matchManager");

module.exports = function (bot, helpers) {

  const { getName } = helpers;

  function getLiveScore(match) {
    if (!match) return "⚠️ No active match.";

    const ballsBowled = (match.currentOver * 6) + match.currentBall;
    const totalBalls  = (match.totalOvers || 0) * 6;
    const ballsLeft   = Math.max(totalBalls - ballsBowled, 0);
    const runRate     = ballsBowled > 0
      ? ((match.score / ballsBowled) * 6).toFixed(2) : "0.00";

    const battingTeamLetter = match.battingTeam;
    const bowlingTeamLetter = match.bowlingTeam;
    const battingTeamName = battingTeamLetter === "A" ? match.teamAName : match.teamBName;
    const bowlingTeamName = bowlingTeamLetter === "A" ? match.teamAName : match.teamBName;

    const st  = match.batterStats?.[match.striker]    || { runs: 0, balls: 0 };
    const nst = match.batterStats?.[match.nonStriker] || { runs: 0, balls: 0 };
    const stSR  = st.balls  > 0 ? ((st.runs  / st.balls)  * 100).toFixed(0) : "0";
    const nstSR = nst.balls > 0 ? ((nst.runs / nst.balls) * 100).toFixed(0) : "0";

    const bwl  = match.bowlerStats?.[match.bowler] || { balls: 0, runs: 0, wickets: 0 };
    const bwlOv = `${Math.floor(bwl.balls / 6)}.${bwl.balls % 6}`;
    const econ  = bwl.balls > 0 ? ((bwl.runs / bwl.balls) * 6).toFixed(2) : "0.00";

    const partRuns  = match.currentPartnershipRuns  || 0;
    const partBalls = match.currentPartnershipBalls || 0;

    // Sanitize names for HTML — strips control chars, escapes HTML entities
    function h(str) {
      return String(str ?? "")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function short(name) {
      const s = String(name ?? "");
      return s.length > 10 ? s.substring(0, 9) + "…" : s;
    }

    const strikerName    = getName(match, match.striker);
    const nonStrikerName = getName(match, match.nonStriker);
    const bowlerName     = getName(match, match.bowler);

    const currentOverHistory = (match.overHistory || []).find(
      o => o.bowler === match.bowler && o.over === match.currentOver + 1
    );
    const overBalls = currentOverHistory
      ? currentOverHistory.balls.map(x => x === "W" ? "W" : String(x)).join(" ")
      : "-";

    const lines = [
      `📊 Live Score`,
      ``,
      `🏏 ${h(battingTeamName)} (Team ${battingTeamLetter})  batting`,
      `🎯 ${h(bowlingTeamName)} (Team ${bowlingTeamLetter})  bowling`,
      ``,
      `<blockquote>📊 ${match.score}/${match.wickets}   ⚙️ ${match.currentOver}.${match.currentBall}/${match.totalOvers}   📈 ${runRate}</blockquote>`,
    ];

    if (match.innings === 2) {
      const runsNeeded = (match.firstInningsScore + 1) - match.score;
      if (runsNeeded > 0) {
        const rrr = ballsLeft > 0 ? ((runsNeeded / ballsLeft) * 6).toFixed(2) : "-";
        lines.push(`<blockquote>🏹 Need ${runsNeeded} from ${ballsLeft} balls   RRR: ${rrr}</blockquote>`);
      } else {
        lines.push(`✅ Target achieved!`);
      }
    }

    lines.push(
      ``,
      `<b>🏏 Batting</b>`,
      `<blockquote>⭐ ${h(short(strikerName))}  ${st.runs}(${st.balls})  SR:${stSR}\n🏹 ${h(short(nonStrikerName))}  ${nst.runs}(${nst.balls})  SR:${nstSR}\n🤝 Partnership: ${partRuns}(${partBalls})</blockquote>`,
      ``,
      `<b>🎾 Bowling</b>`,
      `<blockquote>🎾 ${h(short(bowlerName))}  ${bwlOv}ov  ${bwl.runs}r  ${bwl.wickets}w  econ:${econ}\nThis over: ${overBalls}</blockquote>`
    );

    return lines.join("\n");
  }


  /* ================= /score COMMAND ================= */

  bot.command("score", async (ctx) => {
    const match = getMatch(ctx);
    if (!match) return ctx.reply("⚠️ No active match.");
    try {
      await ctx.reply(getLiveScore(match), { parse_mode: "HTML" });
    } catch (e) {
      console.error("Score HTML failed:", e.message);
      try {
        const plain = getLiveScore(match).replace(/<[^>]*>/g, "");
        await ctx.reply(plain);
      } catch (e2) {
        console.error("Score fallback failed:", e2.message);
      }
    }
  });

};  