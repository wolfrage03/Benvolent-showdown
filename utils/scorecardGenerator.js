function generateScorecard(match, getName) {
  if (!match) return "No match data.";

  const battingTeamLetter = match.battingTeam;
  const bowlingTeamLetter = match.bowlingTeam;
  const battingTeam = battingTeamLetter === "A" ? match.teamAName : match.teamBName;
  const bowlingTeam = bowlingTeamLetter === "A" ? match.teamAName : match.teamBName;

  /* ── run rate ── */
  const ballsBowled  = (match.currentOver * 6) + (match.currentBall || 0);
  const oversDecimal = ballsBowled / 6;
  const crr          = oversDecimal > 0 ? (match.score / oversDecimal).toFixed(2) : "0.00";

  const sep = `───────────────────────`;

  /* ════════════════════════════════
     BATTING SECTION
  ════════════════════════════════ */

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
    const sr    = stats.balls > 0
      ? ((stats.runs / stats.balls) * 100).toFixed(0)
      : "0";
    const fours = stats.fours ?? 0;
    const fives = stats.fives ?? 0;
    const sixes = stats.sixes ?? 0;

    const isStriker    = id === match.striker;
    const isNonStriker = id === match.nonStriker;
    const isTimedOut   = match.timedOutBatters?.includes(id);
    const isNotOut     = isStriker || isNonStriker;

    // Not-out: asterisk after balls
    const ballsStr = isNotOut ? `${stats.balls}*` : `${stats.balls}`;

    // Line 1: 🏏 Name   5R  1B  500SR
    battingRows += `🏏 ${name}   ${stats.runs}R  ${ballsStr}B  ${sr}SR\n`;

    // Line 2: boundary counts
    battingRows += `        ${fours}(4)  ${fives}(5)  ${sixes}(6)\n`;

    // Line 3: timed out OR bowler who took the wicket (only for dismissed batters)
    if (isTimedOut) {
      battingRows += `        timed out\n`;
    } else if (!isNotOut && stats.dismissedBy) {
      const bowlerName = getName(match, stats.dismissedBy);
      battingRows += `        b ${bowlerName}\n`;
    }
  }

  /* ── did not bat ── */
  const battingTeamPlayers = battingTeamLetter === "A" ? match.teamA : match.teamB;
  const didNotBat = (battingTeamPlayers || []).filter(p => !allBatted.includes(p.id));
  const dnbBat = didNotBat.length
    ? `DNB: ${didNotBat.map(p => p.name).join(", ")}`
    : `DNB: —`;

  /* ════════════════════════════════
     BOWLING SECTION
  ════════════════════════════════ */

  const bowlingTeamPlayers = bowlingTeamLetter === "A" ? match.teamA : match.teamB;
  const bowlerIds = Object.keys(match.bowlerStats || {}).map(Number);

  let bowlingRows = "";

  for (const id of bowlerIds) {
    const b    = match.bowlerStats[id];
    const name = getName(match, id);
    const econ = b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(1) : "0.0";
    const ov   = `${Math.floor(b.balls / 6)}.${b.balls % 6}`;

    // Single line: 🎯 Name   ov-runs-wickets-econ
    bowlingRows += `🎯 ${name}   ${ov}-${b.runs}-${b.wickets}-${econ}\n`;

    // Over history — actual over numbers from overHistory
    const theirOvers = (match.overHistory || []).filter(
      o => String(o.bowler) === String(id)
    );
    for (const o of theirOvers) {
      const balls = o.balls.map(x => x === "W" ? "W" : String(x)).join("  ");
      bowlingRows += `   〔Ov ${o.over}〕  ${balls}\n`;
    }
  }

  /* ── did not bowl ── */
  const didNotBowl = (bowlingTeamPlayers || []).filter(
    p => !bowlerIds.includes(p.id)
  );
  const dnbBowl = didNotBowl.length
    ? `DNB: ${didNotBowl.map(p => p.name).join(", ")}`
    : "";

  /* ════════════════════════════════
     HEADER
  ════════════════════════════════ */

  const inningsNum   = match.innings ?? 1;
  const inningsLabel = `Innings ${inningsNum} · ${battingTeam} (Team ${battingTeamLetter})`;

  const scoreLine =
    `📊 ${match.score}/${match.wickets}` +
    `  ⚙️ ${match.currentOver}.${match.currentBall}/${match.totalOvers}` +
    `  📈 ${crr}`;

  // Innings 2: target only, no "need X runs"
  const targetLine = match.innings === 2
    ? `🏹 Target ${(match.firstInningsScore ?? 0) + 1}`
    : "";

  /* ════════════════════════════════
     ASSEMBLE
  ════════════════════════════════ */

  return [
    sep,
    inningsLabel,
    sep,
    scoreLine,
    ...(targetLine ? [targetLine] : []),
    sep,
    battingRows.trimEnd(),
    dnbBat,
    sep,
    bowlingRows.trimEnd(),
    ...(dnbBowl ? [dnbBowl] : []),
    sep,
  ].join("\n");
}

module.exports = generateScorecard;