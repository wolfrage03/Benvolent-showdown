const generateScorecard   = require("../utils/scorecardGenerator");
const updatePlayerStats   = require("../utils/updateStats");
const { sendAndPinPlayerList } = require("../commands/captainCommands");
const { matches, playerActiveMatch } = require("../matchManager");

/* ================= HELPERS (injected from index.js) ================= */
// getName, clearTimers, clearActiveMatchPlayers are passed in via init()

let bot, getName, clearTimers, clearActiveMatchPlayers;

function init(deps) {
  bot                  = deps.bot;
  getName              = deps.getName;
  clearTimers          = deps.clearTimers;
  clearActiveMatchPlayers = deps.clearActiveMatchPlayers;
}


/* ================= MAN OF THE MATCH ================= */

function calculateMOTM(match) {
  const allPlayers = [...match.teamA, ...match.teamB];
  const allBatStats  = {};
  const allBowlStats = {};

  const inn1Bat  = match.firstInningsData?.batterStats  || {};
  const inn1Bowl = match.firstInningsData?.bowlerStats   || {};

  for (const id in inn1Bat) {
    if (!allBatStats[id]) allBatStats[id] = { runs: 0, balls: 0 };
    allBatStats[id].runs  += inn1Bat[id].runs  || 0;
    allBatStats[id].balls += inn1Bat[id].balls || 0;
  }
  for (const id in match.batterStats) {
    if (!allBatStats[id]) allBatStats[id] = { runs: 0, balls: 0 };
    allBatStats[id].runs  += match.batterStats[id].runs  || 0;
    allBatStats[id].balls += match.batterStats[id].balls || 0;
  }
  for (const id in inn1Bowl) {
    if (!allBowlStats[id]) allBowlStats[id] = { balls: 0, runs: 0, wickets: 0 };
    allBowlStats[id].balls   += inn1Bowl[id].balls   || 0;
    allBowlStats[id].runs    += inn1Bowl[id].runs    || 0;
    allBowlStats[id].wickets += inn1Bowl[id].wickets || 0;
  }
  for (const id in match.bowlerStats) {
    if (!allBowlStats[id]) allBowlStats[id] = { balls: 0, runs: 0, wickets: 0 };
    allBowlStats[id].balls   += match.bowlerStats[id].balls   || 0;
    allBowlStats[id].runs    += match.bowlerStats[id].runs    || 0;
    allBowlStats[id].wickets += match.bowlerStats[id].wickets || 0;
  }

  const scores = {};
  for (const p of allPlayers) {
    const id   = String(p.id);
    let score  = 0;
    const bat  = allBatStats[id];
    const bowl = allBowlStats[id];

    if (bat && bat.balls > 0) {
      score += bat.runs;
      const sr = (bat.runs / bat.balls) * 100;
      if (sr >= 150)      score += 15;
      else if (sr >= 100) score += 8;
      else if (sr >= 75)  score += 3;
    }
    if (bowl && bowl.balls > 0) {
      score += bowl.wickets * 20;
      const econ = (bowl.runs / bowl.balls) * 6;
      if (econ <= 6)       score += 20;
      else if (econ <= 8)  score += 12;
      else if (econ <= 10) score += 6;
      else if (econ <= 12) score += 2;
    }
    scores[id] = score;
  }

  let motmId = null, topScore = -1;
  for (const [id, score] of Object.entries(scores)) {
    if (score > topScore) { topScore = score; motmId = id; }
  }
  if (!motmId) return null;

  const player   = allPlayers.find(p => String(p.id) === motmId);
  const bat      = allBatStats[motmId];
  const bowl     = allBowlStats[motmId];
  const batLine  = bat  && bat.balls  > 0
    ? `🏏 ${bat.runs}(${bat.balls})  SR:${((bat.runs / bat.balls) * 100).toFixed(0)}`
    : null;
  const bowlLine = bowl && bowl.balls > 0
    ? `🎾 ${Math.floor(bowl.balls/6)}.${bowl.balls%6}ov  ${bowl.wickets}w  ${bowl.runs}r  E:${((bowl.runs/bowl.balls)*6).toFixed(1)}`
    : null;

  return { player, batLine, bowlLine };
}

async function announceMotm(match) {
  const result = calculateMOTM(match);
  if (!result) return;

  const { player, batLine, bowlLine } = result;

  try { await updatePlayerStats(player.id, { motm: 1 }); }
  catch (e) { console.error("motm save error:", e.message); }

  const lines = [
    `━━━━━━━━━━━`,
    `   🏅 Man of the Match`,
    `━━━━━━━━━━━`,
    `⭐ ${player.name}`,
    `─────────────`,
  ];
  if (batLine)  lines.push(batLine);
  if (bowlLine) lines.push(bowlLine);
  lines.push(`━━━━━━━━━━━`);

  await bot.telegram.sendMessage(match.groupId, lines.join("\n"));
}


/* ================= MATCH RESULT ================= */

async function endMatchWithWinner(match, winningTeam) {
  const teamName   = winningTeam === "A" ? match.teamAName : match.teamBName;
  const teamLetter = winningTeam;

  // Save matchesWon for winning team
  try {
    const winners = winningTeam === "A" ? match.teamA : match.teamB;
    for (const p of winners) await updatePlayerStats(p.id, { matchesWon: 1 });
  } catch (e) { console.error("matchesWon error:", e.message); }

  let margin = "";
  if (match.innings === 2 && winningTeam === match.battingTeam) {
    const w = match.maxWickets - match.wickets;
    margin = `by ${w} wicket${w !== 1 ? "s" : ""}`;
  } else {
    const r = Math.abs(match.firstInningsScore - match.score);
    margin = `by ${r} run${r !== 1 ? "s" : ""}`;
  }

  await bot.telegram.sendMessage(
    match.groupId,
`━━━━━━━━━━━
   🏆 Match Result
━━━━━━━━━━━
🏆 〔Team ${teamLetter}〕 ${teamName} won
   ${margin}
─────────────
1st innings   ${match.firstInningsScore}
2nd innings   ${match.score}/${match.wickets}
━━━━━━━━━━━`
  );

  clearTimers(match);
}

async function endMatchTie(match) {
  await bot.telegram.sendMessage(
    match.groupId,
`━━━━━━━━━━━
   🤝 Match Tied
━━━━━━━━━━━
Both teams scored ${match.score}
━━━━━━━━━━━`
  );
  clearTimers(match);
}


/* ================= END INNINGS ================= */

async function endInnings(match) {
  if (!match) return;
  if (match.inningsEnded) return;
  match.inningsEnded = true;
  match.ballLocked   = true;

  console.log("endInnings called, innings:", match.innings);

  clearTimers(match);
  match.awaitingBat  = false;
  match.awaitingBowl = false;

  /* ── FIRST INNINGS ── */
  if (match.innings === 1) {
    console.log("Switching to innings 2");

    match.firstInningsScore = match.score;
    match.firstInningsData  = JSON.parse(JSON.stringify(match));

    try {
      await bot.telegram.sendMessage(match.groupId, generateScorecard(match, getName));
    } catch (e) { console.error("Scorecard send failed:", e.message); }

    try {
      await bot.telegram.sendMessage(
        match.groupId,
`━━━━━━━━━━━
   ✅ Innings 1 Complete
━━━━━━━━━━━
📊 ${match.score}/${match.wickets}
🏹 Target ${match.score + 1}
⚙️ ${match.currentOver}/${match.totalOvers} overs
─────────────
🔄 Switching innings...`
      );
    } catch (e) { console.error("Innings message failed:", e.message); }

    match.innings      = 2;
    match.target       = match.firstInningsScore + 1;
    match.inningsEnded = false;
    match.ballLocked   = false;

    [match.battingTeam, match.bowlingTeam] = [match.bowlingTeam, match.battingTeam];

    match.score                 = 0;
    match.wickets               = 0;
    match.maxWickets            = (match.battingTeam === "A" ? match.teamA.length : match.teamB.length) - 1;
    match.currentOver           = 0;
    match.currentBall           = 0;
    match.currentOverNumber     = 0;
    match.currentPartnershipRuns  = 0;
    match.currentPartnershipBalls = 0;
    match.currentOverRuns       = 0;
    match.wicketStreak          = 0;
    match.bowlerMissCount       = 0;
    match.batterMissCount       = 0;
    match.usedBatters           = [];
    match.battingOrder          = [];
    match.batterStats           = {};
    match.bowlerStats           = {};
    match.striker               = null;
    match.nonStriker            = null;
    match.bowler                = null;
    match.lastOverBowler        = null;
    match.suspendedBowlers      = {};
    match.overHistory           = [];
    match.currentOverBalls      = [];
    match.awaitingBat           = false;
    match.awaitingBowl          = false;
    match.phase                 = "set_striker";

    try { await sendAndPinPlayerList(match, bot.telegram); }
    catch (e) { console.error("PinList failed:", e.message); }

    try {
      await bot.telegram.sendMessage(
        match.groupId,
`━━━━━━━━━━━
   🏏 Innings 2
━━━━━━━━━━━
🏏 〔Team ${match.battingTeam}〕 ${match.battingTeam === "A" ? match.teamAName : match.teamBName}  batting
🏹 Target ${match.firstInningsScore + 1}
─────────────
👉 /batter [number] set opener`
      );
    } catch (e) { console.error("Innings 2 message failed:", e.message); }

    return;
  }

  /* ── SECOND INNINGS — SAVE STATS ── */
  try {
    // ── Save innings 1 batter stats ──
    const inn1Bat  = match.firstInningsData?.batterStats  || {};
    const inn1Bowl = match.firstInningsData?.bowlerStats  || {};

    for (const playerId in inn1Bat) {
      const b = inn1Bat[playerId];
      const sr = b.balls > 0 ? (b.runs / b.balls) * 100 : 0;
      await updatePlayerStats(playerId, {
        runs:          b.runs,
        balls:         b.balls,
        fours:         b.fours  ?? 0,
        fives:         b.fives  ?? 0,
        sixes:         b.sixes  ?? 0,
        inningsBatting: 1,
        ...(b.runs === 0          ? { ducks: 1 }   : {}),
        ...(b.runs >= 50 && b.runs < 100 ? { fifties: 1 }  : {}),
        ...(b.runs >= 100         ? { hundreds: 1 } : {}),
        bestScore:     b.runs,
      });
    }

    // ── Save innings 1 bowler stats ──
    for (const playerId in inn1Bowl) {
      const b = inn1Bowl[playerId];
      await updatePlayerStats(playerId, {
        wickets:      b.wickets,
        ballsBowled:  b.balls,
        runsConceded: b.runs,
        inningsBowling: 1,
        ...(b.wickets >= 3 ? { threeW: 1 } : {}),
        ...(b.wickets >= 5 ? { fiveW:  1 } : {}),
        bestBowlingWickets: b.wickets,
        bestBowlingRuns:    b.runs,
      });
    }

    // ── Save innings 2 batter stats ──
    for (const playerId in match.batterStats) {
      const b = match.batterStats[playerId];
      await updatePlayerStats(playerId, {
        runs:          b.runs,
        balls:         b.balls,
        fours:         b.fours  ?? 0,
        fives:         b.fives  ?? 0,
        sixes:         b.sixes  ?? 0,
        inningsBatting: 1,
        ...(b.runs === 0          ? { ducks: 1 }   : {}),
        ...(b.runs >= 50 && b.runs < 100 ? { fifties: 1 }  : {}),
        ...(b.runs >= 100         ? { hundreds: 1 } : {}),
        bestScore:     b.runs,
      });
    }

    // ── Save innings 2 bowler stats ──
    for (const playerId in match.bowlerStats) {
      const b = match.bowlerStats[playerId];
      await updatePlayerStats(playerId, {
        wickets:      b.wickets,
        ballsBowled:  b.balls,
        runsConceded: b.runs,
        inningsBowling: 1,
        ...(b.wickets >= 3 ? { threeW: 1 } : {}),
        ...(b.wickets >= 5 ? { fiveW:  1 } : {}),
        bestBowlingWickets: b.wickets,
        bestBowlingRuns:    b.runs,
      });
    }

    // ── Save match played for all players ──
    for (const p of [...match.teamA, ...match.teamB])
      await updatePlayerStats(p.id, { matches: 1 });

  } catch (err) { console.error("Stats update error:", err); }

  try {
    await bot.telegram.sendMessage(match.groupId, generateScorecard(match.firstInningsData, getName));
    await bot.telegram.sendMessage(match.groupId, generateScorecard(match, getName));
  } catch (e) { console.error("Final scorecard failed:", e.message); }

  if (match.score > match.firstInningsScore) {
    await endMatchWithWinner(match, match.battingTeam);
  } else if (match.score < match.firstInningsScore) {
    await endMatchWithWinner(match, match.bowlingTeam);
  } else {
    await endMatchTie(match);
  }

  await announceMotm(match);

  clearActiveMatchPlayers(match);
  matches.delete(match.groupId);
}


/* ================= EXPORTS ================= */

module.exports = { init, endInnings };