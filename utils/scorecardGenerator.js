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

  const sep = `─────────────────`;

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

    // A batter is truly not-out only if they are currently at crease
    // AND have not been recorded as dismissed (usedBatters includes dismissed ones)
    // usedBatters is populated when batter is SENT IN — so we check dismissedBy and timedOut
    const isTimedOut  = match.timedOutBatters?.includes(id);
    // Dismissed = has a dismissedBy set, OR timed out
    const isDismissed = !!stats.dismissedBy || isTimedOut;
    // Not-out = currently at crease AND not dismissed
    const isNotOut    = (id === match.striker || id === match.nonStriker) && !isDismissed;

    // Asterisk after name for not-out batters
    const nameStr = isNotOut ? `${name}*` : name;

    // Line 1: 🏏 Name*  12R  3B  400SR
    battingRows += `🏏 ${nameStr}  ${stats.runs}R  ${stats.balls}B  ${sr}SR\n`;

    // Line 2: boundary counts aligned under runs
    battingRows += `    ${fours}(4)  ${fives}(5)  ${sixes}(6)\n`;

    // Line 3: dismissal info
    if (isTimedOut) {
      battingRows += `    timed out\n`;
    } else if (isDismissed && stats.dismissedBy) {
      const bowlerName = getName(match, stats.dismissedBy);
      battingRows += `    b ${bowlerName}\n`;
    }
  }

  /* ── did not bat ── */
  // Include batters who are set (in battingOrder / batterStats) but have 0 balls
  // as well as players who haven't been sent in at all
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

    bowlingRows += `🎯 ${name}  ${ov}-${b.runs}-${b.wickets}-${econ}\n`;

    // Over history — actual over numbers
    const theirOvers = (match.overHistory || []).filter(
      o => String(o.bowler) === String(id)
    );
    for (const o of theirOvers) {
      const balls = o.balls.map(x => x === "W" ? "W" : String(x)).join(" ");
      bowlingRows += `   〔Ov ${o.over}〕 ${balls}\n`;
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