const { getName } = require("../index");

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */

function pad(str, len) {
  str = String(str ?? "");
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}

function rpad(str, len) {
  str = String(str ?? "");
  return str.length >= len ? str.slice(0, len) : " ".repeat(len - str.length) + str;
}

function oversStr(balls) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function row(label, value) {
  return `  ${pad(label, 10)}  ${value}`;
}

/* ═══════════════════════════════════════════
   MAIN
═══════════════════════════════════════════ */

function generateScorecard(match, getName) {
  if (!match) return "No match data.";
 

  const battingTeam = match.battingTeam === "A" ? match.teamAName : match.teamBName;
  const bowlingTeam = match.bowlingTeam === "A" ? match.teamAName : match.teamBName;

  /* ── run rate ── */
  const ballsBowled  = (match.currentOver * 6) + (match.currentBall || 0);
  const oversDecimal = ballsBowled / 6;
  const crr          = oversDecimal > 0 ? (match.score / oversDecimal).toFixed(2) : "0.00";

  let rrrLine = "";
  if (match.innings === 2) {
    const target     = (match.firstInningsScore ?? 0) + 1;
    const ballsLeft  = (match.totalOvers * 6) - ballsBowled;
    const runsNeeded = target - match.score;
    if (ballsLeft > 0 && runsNeeded > 0) {
      const rrr = ((runsNeeded * 6) / ballsLeft).toFixed(2);
      rrrLine = `\n  ${"🎯"} Need ${runsNeeded} from ${ballsLeft} balls  (RRR ${rrr})`;
    } else if (runsNeeded <= 0) {
      rrrLine = `\n  ${"✅"} Target achieved!`;
    }
  }

  /* ── innings 2 target line ── */
  let targetLine = "";
  if (match.innings === 2) {
    const target = (match.firstInningsScore ?? 0) + 1;
    targetLine = `\n${row("🎯 Target", `${target}   (1st inn: ${match.firstInningsScore ?? 0})`)}`;
  }

  /* ── batting section ── */
  const battingOrder = match.battingOrder || [];
  const allBatted = [
    ...battingOrder,
    ...Object.keys(match.batterStats || {})
      .map(Number)
      .filter(id => !battingOrder.includes(id))
  ];

  let battingRows = "";

  for (const id of allBatted) {
    const stats = match.batterStats?.[id];
    if (!stats) continue;

    const name  = pad(getName(match, id), 14);
    const runs  = rpad(stats.runs ?? 0, 3);
    const balls = `(${stats.balls ?? 0})`;
    const sr    = stats.balls > 0
      ? ((stats.runs / stats.balls) * 100).toFixed(0)
      : "0";

    let tag = "   ";
    if (id === match.striker)         tag = " ⭐";
    else if (id === match.nonStriker) tag = "  *";
    else if (
      match.usedBatters?.includes(id) &&
      id !== match.striker &&
      id !== match.nonStriker
    )                                 tag = "  †";

    battingRows += `  ${name}${tag}  ${runs} ${balls}  SR:${sr}\n`;
  }

  /* ── did not bat ── */
  const battingTeamPlayers = match.battingTeam === "A" ? match.teamA : match.teamB;
  const didNotBat = (battingTeamPlayers || []).filter(p => !allBatted.includes(p.id));
  let dnbLine = "";
  if (didNotBat.length) {
    dnbLine = `\n  DNB: ${didNotBat.map(p => p.name).join(", ")}\n`;
  }

  /* ── bowling section ── */
  let bowlingRows = "";
  for (const id in (match.bowlerStats || {})) {
    const b    = match.bowlerStats[id];
    const name = pad(getName(match, Number(id)), 14);
    const ov   = pad(oversStr(b.balls), 4);
    const dots = (b.history || []).filter(x => x === 0).length;
    const econ = b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(2) : "0.00";

    bowlingRows += `  ${name}  ${ov}  ${rpad(b.runs, 3)}r  ${rpad(b.wickets, 1)}w  E:${econ}\n`;

    const theirOvers = (match.overHistory || []).filter(o => String(o.bowler) === String(id));
    for (const o of theirOvers) {
      const balls = o.balls.map(x => x === "W" ? "W" : String(x)).join("  ");
      bowlingRows += `    Ov ${o.over}  ( ${balls} )\n`;
    }
  }

  /* ── over history summary ── */
  let overSummary = "";
  if (match.overHistory?.length) {
    overSummary =
      `\n╠══════════════════════════════════╣\n` +
      `  OVER HISTORY\n` +
      `  --------------------------------\n` +
      match.overHistory
        .map(o => {
          const balls = o.balls.map(x => x === "W" ? "W" : String(x)).join("  ");
          return `  ${rpad(o.over, 2)}  ${pad(getName(match, o.bowler), 13)}  ${balls}`;
        })
        .join("\n");
  }

  /* ── assemble ── */
  const inningsLabel = `INNINGS ${match.innings ?? 1} SCORECARD`;
  const topBorder    = `╔═ ${inningsLabel} ${"═".repeat(Math.max(0, 32 - inningsLabel.length))}╗`;

  return `\`\`\`
${topBorder}
  ${battingTeam}  vs  ${bowlingTeam}
╠══════════════════════════════════╣
${row("📊 Score",  `${match.score} / ${match.wickets}`)}
${row("⚙️  Overs",  `${match.currentOver}.${match.currentBall} / ${match.totalOvers}`)}
${row("📈 CRR",    crr)}${targetLine}${rrrLine}
╠══════════════════════════════════╣
  BATTING  ─  ${battingTeam}
  --------------------------------
  ${pad("Name", 14)}     R  Balls   SR
  --------------------------------
${battingRows.trimEnd()}${dnbLine}
  ⭐ Striker   * Non-striker   † Out
╠══════════════════════════════════╣
  BOWLING  ─  ${bowlingTeam}
  --------------------------------
  ${pad("Name", 14)}  Ov    R   W   Econ
  --------------------------------
${bowlingRows.trimEnd()}${overSummary}
╚══════════════════════════════════╝\`\`\``;
}

module.exports = generateScorecard;