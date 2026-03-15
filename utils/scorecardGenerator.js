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

  /* ── chase block ── */
  let chaseBlock = "";
  if (match.innings === 2) {
    const target     = (match.firstInningsScore ?? 0) + 1;
    const ballsLeft  = (match.totalOvers * 6) - ballsBowled;
    const runsNeeded = target - match.score;
    if (runsNeeded <= 0) {
      chaseBlock = `✅ Target achieved!`;
    } else if (ballsLeft > 0) {
      const rrr = ((runsNeeded * 6) / ballsLeft).toFixed(2);
      chaseBlock = `🏹 Need ${runsNeeded} from ${ballsLeft} balls  RRR: ${rrr}`;
    }
  }

  const targetLine = match.innings === 2
    ? `🏹 Target ${(match.firstInningsScore ?? 0) + 1}  (1st: ${match.firstInningsScore ?? 0})`
    : "";

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

    const name   = getName(match, id);
    const sr     = stats.balls > 0
      ? ((stats.runs / stats.balls) * 100).toFixed(0)
      : "0";
    const fours  = stats.fours ?? 0;
    const fives  = stats.fives ?? 0;
    const sixes  = stats.sixes ?? 0;

    let emoji = "🚶";
    if (id === match.striker)                  emoji = "🏏";
    else if (id === match.nonStriker)          emoji = "🪄";
    else if (match.usedBatters?.includes(id))  emoji = "🏃";

    battingRows += `${emoji} ${name}  ${stats.runs}(${stats.balls})\n`;
    battingRows += `   4s:${fours}  5s:${fives}  6s:${sixes}  SR:${sr}\n`;
  }

  /* ── did not bat ── */
  const battingTeamPlayers = battingTeamLetter === "A" ? match.teamA : match.teamB;
  const didNotBat = (battingTeamPlayers || []).filter(p => !allBatted.includes(p.id));
  const dnbBat = didNotBat.length
    ? `💤 DNB: ${didNotBat.map(p => p.name).join(", ")}\n`
    : "";

  /* ── bowling section ── */
  const bowlingTeamPlayers = bowlingTeamLetter === "A" ? match.teamA : match.teamB;
  const bowlerIds = Object.keys(match.bowlerStats || {}).map(Number);

  let bowlingRows = "";
  for (const id of bowlerIds) {
    const b    = match.bowlerStats[id];
    const name = getName(match, id);
    const econ = b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(2) : "0.00";
    const ov   = `${Math.floor(b.balls / 6)}.${b.balls % 6}`;

    bowlingRows += `🏐 ${name}\n`;
    bowlingRows += `   ${ov}ov  ${b.runs}r  ${b.wickets}w  E:${econ}\n`;

    const theirOvers = (match.overHistory || []).filter(
      o => String(o.bowler) === String(id)
    );
    for (const o of theirOvers) {
      const balls = o.balls.map(x => x === "W" ? "W" : String(x)).join("  ");
      bowlingRows += `   〔Ov ${o.over}〕  ${balls}\n`;
    }
    bowlingRows += "\n";
  }

  /* ── did not bowl ── */
  const didNotBowl = (bowlingTeamPlayers || []).filter(
    p => !bowlerIds.includes(p.id)
  );
  const dnbBowl = didNotBowl.length
    ? `💤 DNB: ${didNotBowl.map(p => p.name).join(", ")}\n`
    : "";

  /* ── assemble ── */
  const inningsLabel = `INNINGS ${match.innings ?? 1} SCORECARD`;

  return [
    `╭───────────╮`,
    `  📋 ${inningsLabel}`,
    `╰───────────╯`,
    `🏏 〔Team ${battingTeamLetter}〕 ${battingTeam}`,
    `🎯 〔Team ${bowlingTeamLetter}〕 ${bowlingTeam}`,
    `───────────`,
    `📊 ${match.score}/${match.wickets}  ⚙️ ${match.currentOver}.${match.currentBall}/${match.totalOvers}  📈 ${crr}`,
    ...(targetLine  ? [targetLine]  : []),
    ...(chaseBlock  ? [chaseBlock]  : []),
    `───────────`,
    `〔 🏏 BATTING 〕`,
    battingRows.trimEnd(),
    ...(dnbBat.trim() ? [dnbBat.trim()] : []),
    `───────────`,
    `〔 🎳 BOWLING 〕`,
    bowlingRows.trimEnd(),
    ...(dnbBowl.trim() ? [dnbBowl.trim()] : []),
    `───────────`,
  ].join("\n");
}

module.exports = generateScorecard;