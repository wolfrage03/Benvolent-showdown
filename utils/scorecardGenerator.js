function generateScorecard(match, getName) {
  if (!match) return "No match data.";

  const hostName = match.hostName || "Host";

  const battingTeamLetter = match.battingTeam;
  const bowlingTeamLetter = match.bowlingTeam;

  const battingTeam =
    battingTeamLetter === "A" ? match.teamAName : match.teamBName;

  const bowlingTeam =
    bowlingTeamLetter === "A" ? match.teamAName : match.teamBName;

  function h(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function bq(text) {
    return `<blockquote>${text}</blockquote>`;
  }

  const ballsBowled = (match.currentOver * 6) + (match.currentBall || 0);
  const oversDecimal = ballsBowled / 6;

  const crr = oversDecimal > 0
    ? (match.score / oversDecimal).toFixed(2)
    : "0.00";

  let requiredRR = null;
  if (match.innings === 2) {
    const runsNeeded = (match.firstInningsScore + 1) - match.score;
    const oversLeft = match.totalOvers - oversDecimal;
    if (runsNeeded <= 0 || oversLeft <= 0) {
      requiredRR = "—";
    } else {
      const rrr = runsNeeded / oversLeft;
      requiredRR = rrr < 0 ? "—" : rrr.toFixed(2);
    }
  }

  const oversDisplay = `${match.currentOver}.${match.currentBall}/${match.totalOvers}`;
  const inningsNum = match.innings ?? 1;

  /* ── BATTING ── */

  const battingOrder = match.battingOrder || [];
  const allBatted = [
    ...battingOrder,
    ...Object.keys(match.batterStats || {})
      .map(Number)
      .filter(id => !battingOrder.includes(id))
  ];

  let battingBlock = "";

  for (const id of allBatted) {
    const stats = match.batterStats?.[id];
    if (!stats) continue;

    const name = getName(match, id);
    const sr = stats.balls > 0
      ? ((stats.runs / stats.balls) * 100).toFixed(0)
      : "0";

    const fours = stats.fours ?? 0;
    const fives = stats.fives ?? 0;
    const sixes = stats.sixes ?? 0;

    const isTimedOut   = match.timedOutBatters?.includes(id);
    const isDismissed  = !!stats.dismissedBy || isTimedOut;
    const isStriker    = id === match.striker;
    const isNonStriker = id === match.nonStriker;
    const isNotOut     = (isStriker || isNonStriker) && !isDismissed;
    // ⭐ for striker, 🏹 for non-striker
    const indicator    = isStriker ? "⭐ " : isNonStriker ? "🏹 " : "";
    const notOutMark   = isNotOut ? "*" : "";

    // Batter name — plain
    battingBlock += `\n🏏 ${indicator}${h(name)}${notOutMark}\n`;

    // Box 1: runs / balls / SR
    battingBlock += bq(`${stats.runs}(${stats.balls})  ⚡SR:${sr}`);

    // Box 2: boundaries
    battingBlock += bq(`${fours}(4s)  ${fives}(5s)  ${sixes}(6s)`);

    // Box 3: dismissal (only if out)
    if (isTimedOut) {
      battingBlock += bq(`⏱ timed out`);
    } else if (isDismissed && stats.dismissedBy && !isNotOut) {
      battingBlock += bq(`🎾 b ${h(getName(match, stats.dismissedBy))}`);
    }

    battingBlock += "\n";
  }

  const battingTeamPlayers =
    battingTeamLetter === "A" ? match.teamA : match.teamB;

  const didNotBat = (battingTeamPlayers || [])
    .filter(p => !allBatted.includes(p.id));

  const dnbNames = didNotBat
    .map(p => p.name)
    .filter(n => n && n.trim().length > 0);

  const dnbBat = bq(`🪑 DNB: ${dnbNames.length ? dnbNames.map(h).join(", ") : "—"}`);

  /* ── BOWLING ── */

  const bowlingTeamPlayers =
    bowlingTeamLetter === "A" ? match.teamA : match.teamB;

  const bowlerIds = Object.keys(match.bowlerStats || {}).map(Number);

  let bowlingBlock = "";

  for (const id of bowlerIds) {
    const b    = match.bowlerStats[id];
    const name = getName(match, id);

    const econ = b.balls > 0
      ? ((b.runs / b.balls) * 6).toFixed(1)
      : "0.0";

    const ovW = Math.floor(b.balls / 6);
    const ovB = b.balls % 6;

    // Bowler name — plain
    bowlingBlock += `\n🎾 ${h(name)}\n`;

    // Box 1: stats
    bowlingBlock += bq(`${ovW}.${ovB}ov  🏏${b.runs}  ⚾${b.wickets}  📉${econ}`);

    // Box 2: over history (only if exists)
    const theirOvers = (match.overHistory || []).filter(
      o => String(o.bowler) === String(id)
    );
    if (theirOvers.length) {
      const histLines = theirOvers.map(o => {
        const balls = o.balls.map(x => x === "W" ? "W" : String(x)).join("  ");
        return `Ov ${o.over}: ${balls}`;
      }).join("\n");
      bowlingBlock += bq(histLines);
    }

    bowlingBlock += "\n";
  }

  const didNotBowl = (bowlingTeamPlayers || [])
    .filter(p => !bowlerIds.includes(p.id));

  const dnbBowlNames = didNotBowl
    .map(p => p.name)
    .filter(n => n && n.trim().length > 0);

  const dnbBowl = dnbBowlNames.length
    ? bq(`🪑 DNB: ${dnbBowlNames.map(h).join(", ")}`)
    : "";

  /* ── ASSEMBLE ── */

  const parts = [];

  parts.push(h(hostName));
  parts.push("");
  parts.push(`• 📋 Innings ${inningsNum}`);
  parts.push("");

  // Teams — blockquote
  parts.push(bq(`🏏 ${h(battingTeam)} (Team ${battingTeamLetter})  vs  🎯 ${h(bowlingTeam)} (Team ${bowlingTeamLetter})`));
  parts.push("");

  // Score — separate blockquotes
  parts.push(bq(`📊 ${match.score}/${match.wickets}  |  ⚙️ ${oversDisplay}`));

  let rrLine = `📈 RR: ${crr}`;
  if (match.innings === 2) {
    rrLine += `  |  Req RR: ${requiredRR}`;
    parts.push(bq(rrLine));
    parts.push(bq(`🏹 Target: ${(match.firstInningsScore ?? 0) + 1}`));
  } else {
    parts.push(bq(rrLine));
  }

  parts.push("");
  parts.push(`• 🏏 Batting`);
  parts.push(battingBlock.trimEnd());
  parts.push("");
  parts.push(dnbBat);
  parts.push("");
  parts.push(`• 🎾 Bowling`);
  parts.push(bowlingBlock.trimEnd());
  if (dnbBowl) {
    parts.push("");
    parts.push(dnbBowl);
  }

  return parts.join("\n");
}

module.exports = generateScorecard;