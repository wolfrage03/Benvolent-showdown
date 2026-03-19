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

  /* ── target line (innings 2 only, no "need X runs" block) ── */
  const targetLine = match.innings === 2
    ? `🏹 Target ${(match.firstInningsScore ?? 0) + 1}`
    : "";

  /* ── pad helper for alignment ── */
  function rpad(str, len) {
    str = String(str);
    return str.length >= len ? str : str + " ".repeat(len - str.length);
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

    const name  = getName(match, id);
    const sr    = stats.balls > 0
      ? ((stats.runs / stats.balls) * 100).toFixed(0)
      : "0";
    const fours = stats.fours ?? 0;
    const fives = stats.fives ?? 0;
    const sixes = stats.sixes ?? 0;

    // Status: striker / non-striker / not out (still in) / dismissed / timed out
    const isStriker    = id === match.striker;
    const isNonStriker = id === match.nonStriker;
    const isTimedOut   = match.timedOutBatters?.includes(id);
    const isDismissed  = match.usedBatters?.includes(id) && !isStriker && !isNonStriker;
    const isNotOut     = isStriker || isNonStriker;

    // Score string — not-out gets asterisk
    const scoreStr = isNotOut
      ? `${stats.runs}(${stats.balls})*`
      : `${stats.runs}(${stats.balls})`;

    // 3rd line: dismissal info (bowler name or timed out)
    let dismissalLine = "";
    if (isTimedOut) {
      dismissalLine = "\n   timed out";
    } else if (isDismissed && stats.dismissedBy) {
      const bowlerName = getName(match, stats.dismissedBy);
      dismissalLine = `\n   b ${bowlerName}`;
    }

    // All batters get 🏏
    battingRows += `🏏 ${name}\n`;
    battingRows += `   ${rpad(scoreStr, 10)}  ${rpad(stats.balls + "B", 5)}  SR:${sr}\n`;
    battingRows += `   ${rpad("4s:" + fours, 7)}  ${rpad("5s:" + fives, 7)}  6s:${sixes}${dismissalLine}\n`;
  }

  /* ── did not bat ── */
  const battingTeamPlayers = battingTeamLetter === "A" ? match.teamA : match.teamB;
  const didNotBat = (battingTeamPlayers || []).filter(p => !allBatted.includes(p.id));
  const dnbBat = didNotBat.length
    ? `– DNB: ${didNotBat.map(p => p.name).join(", ")}`
    : "";

  /* ── bowling section ── */
  const bowlingTeamPlayers = bowlingTeamLetter === "A" ? match.teamA : match.teamB;
  const bowlerIds = Object.keys(match.bowlerStats || {}).map(Number);

  let bowlingRows = "";
  for (const id of bowlerIds) {
    const b    = match.bowlerStats[id];
    const name = getName(match, id);
    const econ = b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(1) : "0.0";
    const ov   = `${Math.floor(b.balls / 6)}.${b.balls % 6}`;

    // Format: name  overs-runs-wickets-econ
    bowlingRows += `🎯 ${name}  ${ov}-${b.runs}-${b.wickets}-${econ}\n`;

    // Over history — only overs this bowler actually bowled
    const theirOvers = (match.overHistory || []).filter(
      o => String(o.bowler) === String(id)
    );
    for (const o of theirOvers) {
      const balls = o.balls.map(x => x === "W" ? "W" : String(x)).join("  ");
      bowlingRows += `   Over ${o.over}:  ${balls}\n`;
    }
    bowlingRows += "\n";
  }

  /* ── did not bowl ── */
  const didNotBowl = (bowlingTeamPlayers || []).filter(
    p => !bowlerIds.includes(p.id)
  );
  const dnbBowl = didNotBowl.length
    ? `– DNB: ${didNotBowl.map(p => p.name).join(", ")}`
    : "";

  /* ── assemble ── */
  const inningsLabel = `Innings ${match.innings ?? 1}`;

  return [
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ` ${inningsLabel} Scorecard`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🏏 ${battingTeam}`,
    `🎯 ${bowlingTeam}`,
    `📊 ${match.score}/${match.wickets}  ⚙️ ${match.currentOver}.${match.currentBall}/${match.totalOvers}  📈 ${crr}`,
    ...(targetLine ? [targetLine] : []),
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ` BATTING`,
    `────────────────────────`,
    battingRows.trimEnd(),
    ...(dnbBat ? [dnbBat] : []),
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ` BOWLING`,
    `────────────────────────`,
    bowlingRows.trimEnd(),
    ...(dnbBowl ? [dnbBowl] : []),
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
  ].join("\n");
}

module.exports = generateScorecard;