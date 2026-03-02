const bot = require("../bot");
const { getMatch } = require("../utils/matchStore"); // 🔥 FIXED PATH
const { getName } = require("../utils/helpers");

/* ================= LIVE SCORE ================= */

function getLiveScore(match) {

  if (!match) return "⚠️ No active match.";

  const totalOvers = match.totalOvers || 0;

  const overs = `${match.currentOver}.${match.currentBall}`;

  const ballsBowled =
    (match.currentOver * 6) + match.currentBall;

  const totalBalls = totalOvers * 6;

  const ballsLeft =
   
    Math.max(totalBalls - ballsBowled, 0);

  const runRate =
    ballsBowled > 0
      ? ((match.score / ballsBowled) * 6).toFixed(2)
      : "0.00";

  /* ================= CHASE INFO ================= */

  let requiredRuns = "";
  let requiredRR = "";

  if (match.innings === 2) {

    const target =
      (match.firstInningsScore || 0) + 1;

    const runsNeeded =
      target - match.score;

    if (runsNeeded > 0) {

      requiredRuns =
        `🎯 Need ${runsNeeded} from ${ballsLeft} balls`;

      requiredRR =
        ballsLeft > 0
          ? ((runsNeeded / ballsLeft) * 6).toFixed(2)
          : "-";
    } else {
      requiredRuns = "✅ Target Achieved";
      requiredRR = "-";
    }
  }

  /* ================= BATTER STATS ================= */

  const strikerStats =
    match.batterStats?.[match.striker] ||
    { runs: 0, balls: 0 };

  const nonStrikerStats =
    match.batterStats?.[match.nonStriker] ||
    { runs: 0, balls: 0 };

  const strikerSR =
    strikerStats.balls > 0
      ? ((strikerStats.runs / strikerStats.balls) * 100).toFixed(1)
      : "0.0";

  const nonStrikerSR =
    nonStrikerStats.balls > 0
      ? ((nonStrikerStats.runs / nonStrikerStats.balls) * 100).toFixed(1)
      : "0.0";

  /* ================= BOWLER STATS ================= */

  const bowlerStats =
    match.bowlerStats?.[match.bowler] ||
    { balls: 0, runs: 0, wickets: 0, history: [] };

  const bowlerOvers =
    `${Math.floor(bowlerStats.balls / 6)}.${bowlerStats.balls % 6}`;

  const economy =
    bowlerStats.balls > 0
      ? ((bowlerStats.runs / bowlerStats.balls) * 6).toFixed(2)
      : "0.00";

  const dots =
    bowlerStats.history?.filter(x => x === 0).length || 0;

  /* ================= OVER HISTORY ================= */

  const overHistoryFormatted =
    match.overHistory?.length
      ? match.overHistory
          .map((o, i) =>
            `Over ${i + 1}: ${o.balls.join(" ")}`
          )
          .join(" | ")
      : "Yet to start";

  const partnershipRuns =
    match.currentPartnershipRuns || 0;

  const partnershipBalls =
    match.currentPartnershipBalls || 0;

  /* ================= OUTPUT ================= */

  return `
╔═══════════════════╗
🏏  LIVE SCOREBOARD
╚═══════════════════╝

📊 ${match.score}/${match.wickets}
(${overs}/${totalOvers})

⚡ RR: ${runRate}
${match.innings === 2 ? `| RRR: ${requiredRR}` : ""}

${match.innings === 2 ? requiredRuns + "\n" : ""}

🔵 Batting:
${match.battingTeam === "A"
  ? `${match.teamAName} (A)`
  : `${match.teamBName} (B)`}

🔴 Bowling:
${match.bowlingTeam === "A"
  ? `${match.teamAName} (A)`
  : `${match.teamBName} (B)`}

━━━━━━━━━━━━━━━━━━

🏏 Batters

⭐ ${getName(match, match.striker)}*
${strikerStats.runs}(${strikerStats.balls})
SR: ${strikerSR}

${getName(match, match.nonStriker)}
${nonStrikerStats.runs}(${nonStrikerStats.balls})
SR: ${nonStrikerSR}

🎯 Bowler

${getName(match, match.bowler)}

${bowlerOvers}-${dots}-${bowlerStats.runs}-${bowlerStats.wickets}
Econ: ${economy}

🤝 Partnership:
${partnershipRuns} (${partnershipBalls})

📜 Overs:
${overHistoryFormatted}
`;
}

/* ================= COMMAND ================= */

bot.command("score", (ctx) => {

  const match = getMatch(ctx);
  if (!match)
    return ctx.reply("⚠️ No active match.");

  ctx.reply(getLiveScore(match));
});

module.exports = { getLiveScore };