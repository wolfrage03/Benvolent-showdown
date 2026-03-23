function generateScorecard(match, getName) {
  if (!match) return "No match data.";

  const battingTeamLetter = match.battingTeam;
  const bowlingTeamLetter = match.bowlingTeam;
  const battingTeam = battingTeamLetter === "A" ? match.teamAName : match.teamBName;
  const bowlingTeam = bowlingTeamLetter === "A" ? match.teamAName : match.teamBName;

  const ballsBowled  = (match.currentOver * 6) + (match.currentBall || 0);
  const oversDecimal = ballsBowled / 6;
  const crr          = oversDecimal > 0 ? (match.score / oversDecimal).toFixed(2) : "0.00";

  /* ── BATTING ── */

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

    const name  = getName(match, id);
    const sr    = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(0) : "0";
    const fours = stats.fours ?? 0;
    const fives = stats.fives ?? 0;
    const sixes = stats.sixes ?? 0;

    const isTimedOut  = match.timedOutBatters?.includes(id);
    const isDismissed = !!stats.dismissedBy || isTimedOut;
    const isNotOut    = (id === match.striker || id === match.nonStriker) && !isDismissed;
    const notOutMark  = isNotOut ? "*" : "";

    battingRows += `🏏 ${name}${notOutMark}  ${stats.runs}R  ${stats.balls}B  ⚡SR:${sr}\n`;
    battingRows += `┗━ 🏏${fours}  💫${fives}  🚀${sixes}\n`;

    if (isTimedOut) {
      battingRows += `   ┗━ ⏱ timed out\n`;
    } else if (isDismissed && stats.dismissedBy) {
      const bowlerName = getName(match, stats.dismissedBy);
      battingRows += `   ┗━ 🎾 b ${bowlerName}\n`;
    }

    battingRows += "\n";
  }

  const battingTeamPlayers = battingTeamLetter === "A" ? match.teamA : match.teamB;
  const didNotBat = (battingTeamPlayers || []).filter(p => !allBatted.includes(p.id));
  const dnbBat = `🪑 DNB: ${didNotBat.length ? didNotBat.map(p => p.name).join(", ") : "—"}`;

  /* ── BOWLING ── */

  const bowlingTeamPlayers = bowlingTeamLetter === "A" ? match.teamA : match.teamB;
  const bowlerIds = Object.keys(match.bowlerStats || {}).map(Number);

  let bowlingRows = "";

  for (const id of bowlerIds) {
    const b    = match.bowlerStats[id];
    const name = getName(match, id);
    const econ = b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(1) : "0.0";
    const ovW  = Math.floor(b.balls / 6);
    const ovB  = b.balls % 6;

    bowlingRows += `🎾 ${name}  ${ovW}.${ovB}ov  🏏${b.runs}  ⚾${b.wickets}  📉${econ}\n`;

    const theirOvers = (match.overHistory || []).filter(
      o => String(o.bowler) === String(id)
    );
    for (let i = 0; i < theirOvers.length; i++) {
      const o      = theirOvers[i];
      const balls  = o.balls.map(x => x === "W" ? "⚾" : String(x)).join("  ");
      const indent = "   ".repeat(i + 1);
      bowlingRows += `${indent}┗━ Ov ${o.over}: ${balls}\n`;
    }

    bowlingRows += "\n";
  }

  const didNotBowl = (bowlingTeamPlayers || []).filter(p => !bowlerIds.includes(p.id));
  const dnbBowl = didNotBowl.length
    ? `🪑 DNB: ${didNotBowl.map(p => p.name).join(", ")}`
    : "";

  /* ── ASSEMBLE ── */

  const inningsNum   = match.innings ?? 1;
  const oversDisplay = `${match.currentOver}.${match.currentBall}/${match.totalOvers}`;
  const targetLine   = match.innings === 2
    ? `🏹 Target: ${(match.firstInningsScore ?? 0) + 1}`
    : "";

  return [
    `─── 📋 Innings ${inningsNum} ───`,
    `🏏 ${battingTeam}  vs  🎯 ${bowlingTeam}`,
    ``,
    `📊 ${match.score}/${match.wickets}  |  ⚙️ ${oversDisplay}  |  📈 RR: ${crr}`,
    ...(targetLine ? [targetLine] : []),
    ``,
    `─── 🏏 Batting ───`,
    ``,
    battingRows.trimEnd(),
    ``,
    dnbBat,
    ``,
    `─── 🎾 Bowling ───`,
    ``,
    bowlingRows.trimEnd(),
    ...(dnbBowl ? [``, dnbBowl] : []),
  ].join("\n");
}

module.exports = generateScorecard;