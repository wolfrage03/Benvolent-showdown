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

  /* ── pad helpers ── */
  function lpad(str, len) {
    str = String(str);
    return str.length >= len ? str : " ".repeat(len - str.length) + str;
  }
  function rpad(str, len) {
    str = String(str);
    return str.length >= len ? str : str + " ".repeat(len - str.length);
  }

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

  // Column header
  const batHeader =
    ` ${"BATTER".padEnd(16)} ${"R".padStart(4)} ${"B".padStart(5)}` +
    `  ${"4s".padStart(3)} ${"5s".padStart(3)} ${"6s".padStart(3)}  ${"SR".padStart(5)}`;

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
    const isDismissed  = match.usedBatters?.includes(id) && !isStriker && !isNonStriker;
    const isNotOut     = isStriker || isNonStriker;

    // Balls field: append * for not-out (after balls count)
    const ballsStr = isNotOut ? `${stats.balls}*` : `${stats.balls}`;

    // All batters same 🏏 emoji — no special icon for striker/non-striker
    const nameField = rpad(name, 16);

    const statLine =
      ` 🏏 ${nameField}` +
      ` ${lpad(stats.runs, 4)} ${lpad(ballsStr, 5)}` +
      `  ${lpad(fours, 3)} ${lpad(fives, 3)} ${lpad(sixes, 3)}  ${lpad(sr, 5)}`;

    battingRows += statLine + "\n";

    // Second line: runs, balls, boundary counts with SR
    const countsPart = `4:${lpad(fours, 2)}  5:${lpad(fives, 2)}  6:${lpad(sixes, 2)}`;
    battingRows += `   ${rpad(stats.runs + "R", 6)} ${rpad(stats.balls + "B", 6)}  ${countsPart}  SR:${sr}\n`;

    // Third line: dismissal / timed out (only if applicable)
    if (isTimedOut) {
      battingRows += `   timed out\n`;
    } else if (isDismissed && stats.dismissedBy) {
      const bowlerName = getName(match, stats.dismissedBy);
      battingRows += `   b ${bowlerName}\n`;
    }
  }

  /* ── did not bat ── */
  const battingTeamPlayers = battingTeamLetter === "A" ? match.teamA : match.teamB;
  const didNotBat = (battingTeamPlayers || []).filter(p => !allBatted.includes(p.id));
  const dnbBat = didNotBat.length
    ? ` DNB: ${didNotBat.map(p => p.name).join(", ")}`
    : ` DNB: —`;

  /* ════════════════════════════════
     BOWLING SECTION
  ════════════════════════════════ */

  const bowlingTeamPlayers = bowlingTeamLetter === "A" ? match.teamA : match.teamB;
  const bowlerIds = Object.keys(match.bowlerStats || {}).map(Number);

  // Column header
  const bowlHeader =
    ` ${"BOWLER".padEnd(16)} ${"OV".padStart(5)} ${"R".padStart(4)} ${"W".padStart(3)}  ${"ECON".padStart(5)}`;

  let bowlingRows = "";

  for (const id of bowlerIds) {
    const b    = match.bowlerStats[id];
    const name = getName(match, id);
    const econ = b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(1) : "0.0";
    const ov   = `${Math.floor(b.balls / 6)}.${b.balls % 6}`;

    const nameField = rpad(name, 16);
    const bowlLine =
      ` 🎯 ${nameField}` +
      ` ${lpad(ov, 5)} ${lpad(b.runs, 4)} ${lpad(b.wickets, 3)}  ${lpad(econ, 5)}`;

    bowlingRows += bowlLine + "\n";

    // Over history using actual over numbers from overHistory
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
    ? ` DNB: ${didNotBowl.map(p => p.name).join(", ")}`
    : "";

  /* ════════════════════════════════
     HEADER
  ════════════════════════════════ */

  const inningsNum   = match.innings ?? 1;
  const inningsLabel = `INNINGS ${inningsNum} · ${battingTeam} bat · ${bowlingTeam} bowl`;

  const sep  = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  const thin = ` ─────────────────────────────────────────`;

  const scoreLine =
    ` 📊 ${match.score}/${match.wickets}` +
    `   ⚙️ ${match.currentOver}.${match.currentBall}/${match.totalOvers}` +
    `   📈 ${crr}`;

  // Innings 2: show target only, no "need X runs" line
  const targetLine = match.innings === 2
    ? ` 🏹 Target ${(match.firstInningsScore ?? 0) + 1}`
    : "";

  /* ════════════════════════════════
     ASSEMBLE
  ════════════════════════════════ */

  return [
    sep,
    ` ${inningsLabel}`,
    sep,
    scoreLine,
    ...(targetLine ? [targetLine] : []),
    sep,
    batHeader,
    thin,
    battingRows.trimEnd(),
    dnbBat,
    sep,
    bowlHeader,
    thin,
    bowlingRows.trimEnd(),
    ...(dnbBowl ? [dnbBowl] : []),
    sep,
  ].join("\n");
}

module.exports = generateScorecard;