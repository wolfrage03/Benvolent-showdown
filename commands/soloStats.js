// ===============================================================
// SOLO STATS — soloStats.js
// ===============================================================
// Lifetime stat tracking for solo mode, stored on User document.
//
// Fields ($inc on User):
//   soloMatchesPlayed
//   soloTotalRuns
//   soloTotalBalls
//   soloFours / soloFives / soloSixes
//   soloDucks
//   soloFifties / soloHundreds
//   soloBestScore      ($set — highest single-match runs)
//   soloTotalWickets
//   soloBallsBowled
//   soloRunsConceded
//   soloMOTM
// ===============================================================

const User = require("../User");


/* ─────────────────────────────────────────
   SAVE STATS AFTER MATCH
───────────────────────────────────────── */

async function saveSoloMatchStats(match) {
  // Use allPlayers — match.players gets filtered when players are removed mid-game,
  // so some valid (non-timedOut) players would be missed if we only iterate match.players.
  const roster = match.allPlayers || match.players;

  const promises = roster.map(async (p) => {
    const s = match.stats[p.id];
    if (!s) return;
    if (s.timedOut) return; // timed-out/removed players are excluded from stats

    const isDuck    = s.runs === 0 && s.out && !s.timedOut;
    const isFifty   = s.runs >= 50 && s.runs < 100;
    const isHundred = s.runs >= 100;
    const isMOTM    = match.motm === p.id ? 1 : 0;

    try {
      const existing    = await User.findOne({ telegramId: String(p.id) }, { soloBestScore: 1 }).lean();
      const currentBest = existing?.soloBestScore || 0;
      const newBest     = Math.max(currentBest, s.runs);

      await User.updateOne(
        { telegramId: String(p.id) },
        {
          $inc: {
            soloMatchesPlayed: 1,
            soloTotalRuns:     s.runs          || 0,
            soloTotalBalls:    s.balls         || 0,
            soloFours:         s.fours         || 0,
            soloFives:         s.fives         || 0,
            soloSixes:         s.sixes         || 0,
            soloDucks:         isDuck    ? 1   : 0,
            soloFifties:       isFifty   ? 1   : 0,
            soloHundreds:      isHundred ? 1   : 0,
            soloTotalWickets:  s.wickets       || 0,
            soloBallsBowled:   s.ballsBowled   || 0,
            soloRunsConceded:  s.runsConceded  || 0,
            soloMOTM:          isMOTM,
          },
          $set: { soloBestScore: newBest },
        },
        { upsert: true }
      );
    } catch (e) {
      console.error(`[SOLO saveSoloMatchStats] userId=${p.id}`, e.message);
    }
  });

  await Promise.allSettled(promises);
}


/* ─────────────────────────────────────────
   MAN OF THE MATCH
   Formula: runs + (wickets × 15)
───────────────────────────────────────── */

function determineMOTM(match) {
  let bestId    = null;
  let bestScore = -1;

  for (const p of match.players) {
    const s = match.stats[p.id];
    if (!s || s.timedOut) continue;

    const score = (s.runs || 0) + ((s.wickets || 0) * 15);
    if (score > bestScore) {
      bestScore = score;
      bestId    = p.id;
    }
  }

  return bestId;
}


/* ─────────────────────────────────────────
   /solostats REPLY
   Layout:
     Matches | MOTM
     Batting: Runs Balls SR  4s 5s 6s  Ducks  50s/100s  Best
     Bowling: Wkts Balls Eco
───────────────────────────────────────── */

async function getSoloStatsText(userId, firstName) {
  let dbUser;
  try {
    dbUser = await User.findOne({ telegramId: String(userId) }).lean();
  } catch {
    return "⚠️ Could not fetch stats. Try again later.";
  }

  if (!dbUser || !dbUser.soloMatchesPlayed)
    return "❌ No solo stats yet. Play a solo match first!";

  const played  = dbUser.soloMatchesPlayed  || 0;
  const motm    = dbUser.soloMOTM           || 0;

  const runs    = dbUser.soloTotalRuns      || 0;
  const balls   = dbUser.soloTotalBalls     || 0;
  const fours   = dbUser.soloFours          || 0;
  const fives   = dbUser.soloFives          || 0;
  const sixes   = dbUser.soloSixes          || 0;
  const ducks   = dbUser.soloDucks          || 0;
  const fifties = dbUser.soloFifties        || 0;
  const tons    = dbUser.soloHundreds       || 0;
  const best    = dbUser.soloBestScore      || 0;

  const wickets = dbUser.soloTotalWickets   || 0;
  const bowled  = dbUser.soloBallsBowled    || 0;
  const given   = dbUser.soloRunsConceded   || 0;

  const sr   = balls  > 0 ? ((runs / balls) * 100).toFixed(1) : "—";
  const econ = bowled > 0 ? ((given / bowled) * 6).toFixed(2) : "—";
  const name = firstName || "Player";

  return (
`📊 <b>Solo Stats — ${name}</b>

<blockquote>Matches: ${played}     🌟 MOTM: ${motm}</blockquote>

<blockquote>🏏 Batting
Runs: ${runs}   Balls: ${balls}   SR: ${sr}
4s: ${fours}   5s: ${fives}   6s: ${sixes}
Ducks: ${ducks}   50s/100s: ${fifties}/${tons}
Best Score: ${best}</blockquote>

<blockquote>🎯 Bowling
Wickets: ${wickets}   Balls: ${bowled}   Eco: ${econ}</blockquote>`
  );
}


module.exports = { saveSoloMatchStats, determineMOTM, getSoloStatsText };