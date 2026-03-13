const { getName } = require("../index");

function generateScorecard(match) {

  if (!match) return "No match data.";

  const battingTeam  = match.battingTeam  === "A" ? match.teamAName : match.teamBName;
  const bowlingTeam  = match.bowlingTeam  === "A" ? match.teamAName : match.teamBName;
  const overs        = `${match.currentOver} / ${match.totalOvers}`;

  /* ================= RUN RATE ================= */

  const ballsBowled  = (match.currentOver * 6) + (match.currentBall || 0);
  const oversDecimal = ballsBowled / 6;
  const crr          = oversDecimal > 0 ? (match.score / oversDecimal).toFixed(2) : "0.00";

  let rrrLine = "";

  if (match.innings === 2 && match.target) {
    const ballsLeft  = (match.totalOvers * 6) - ballsBowled;
    const runsNeeded = match.target - match.score;
    if (ballsLeft > 0) {
      const rrr = ((runsNeeded * 6) / ballsLeft).toFixed(2);
      rrrLine = `Need ${runsNeeded} from ${ballsLeft} balls  (RRR ${rrr})`;
    }
  }

  /* ================= BATTERS ================= */

  const strikerStats    = match.batterStats[match.striker]    || { runs: 0, balls: 0 };
  const nonStrikerStats = match.batterStats[match.nonStriker] || { runs: 0, balls: 0 };

  const strikerName    = getName(match, match.striker).padEnd(14, " ");
  const nonStrikerName = getName(match, match.nonStriker).padEnd(14, " ");

  const batters =
    `${strikerName} ⭐  ${strikerStats.runs}(${strikerStats.balls})\n` +
    `${nonStrikerName}    ${nonStrikerStats.runs}(${nonStrikerStats.balls})`;

  /* ================= BOWLERS ================= */

  let bowlers = "";

  for (const id in match.bowlerStats) {
    const b            = match.bowlerStats[id];
    const oversBowled  = Math.floor(b.balls / 6);
    const dots         = b.history.filter(x => x === 0).length;
    const name         = getName(match, id).padEnd(14, " ");
    bowlers           += `${name}  ${oversBowled}-${dots}-${b.runs}-${b.wickets}\n`;

    const oversHistory = match.overHistory.filter(o => o.bowler == id);
    for (const o of oversHistory) {
      bowlers += `  Over ${o.over}  (${o.balls.join("  ")})\n`;
    }
  }

  return `\`\`\`
[ SCORECARD ]

${battingTeam} vs ${bowlingTeam}
━━━━━━━━━━━━━━━━━━━━
Score   ${match.score} / ${match.wickets}
Overs   ${overs}
CRR     ${crr}${rrrLine ? `\n${rrrLine}` : ""}

BATTING
━━━━━━━━━━━━━━━━━━━━
${batters}

BOWLING  —  ${bowlingTeam}
━━━━━━━━━━━━━━━━━━━━
${bowlers}\`\`\``;
}

module.exports = generateScorecard;