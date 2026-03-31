// ===============================================================
// SOLO STATS  —  soloStats.js
// ===============================================================
// Handles all solo-mode lifetime stat tracking.
// Kept separate from team PlayerStats so neither pollutes the other.
//
// Schema fields stored on the existing User document (via $inc):
//   soloMatchesPlayed
//   soloTotalRuns
//   soloTotalBalls
//   soloFours
//   soloFives
//   soloSixes
//   soloDucks          (0 runs, not timed out)
//   soloFifties
//   soloHundreds
//   soloBestScore      (highest single-match runs — stored as number)
//   soloTotalWickets
//   soloBallsBowled
//   soloRunsConceded
//   soloMOTM          (Man of the Match awards)
//
// No new Mongoose model is needed — we just $inc on User.
// ===============================================================

const User = require("../User");


/* ─────────────────────────────────────────
   SAVE STATS FOR ALL PLAYERS AFTER A MATCH
───────────────────────────────────────── */

async function saveSoloMatchStats(match) {
  const promises = match.players.map(async (p) => {
    const s = match.stats[p.id];
    if (!s) return;

    // Skip timed-out players entirely (they are removed)
    if (s.timedOut) return;

    const isDuck    = s.runs === 0 && s.out && !s.timedOut;
    const isFifty   = s.runs >= 50 && s.runs < 100;
    const isHundred = s.runs >= 100;

    const isMOTM = match.motm === p.id ? 1 : 0;

    try {
      // Fetch current best score first so we can compare
      const existing = await User.findOne(
        { telegramId: String(p.id) },
        { soloBestScore: 1 }
      ).lean();

      const currentBest = existing?.soloBestScore || 0;
      const newBest     = Math.max(currentBest, s.runs);

      await User.updateOne(
        { telegramId: String(p.id) },
        {
          $inc: {
            soloMatchesPlayed:  1,
            soloTotalRuns:      s.runs          || 0,
            soloTotalBalls:     s.balls         || 0,
            soloFours:          s.fours         || 0,
            soloFives:          s.fives         || 0,
            soloSixes:          s.sixes         || 0,
            soloDucks:          isDuck    ? 1   : 0,
            soloFifties:        isFifty   ? 1   : 0,
            soloHundreds:       isHundred ? 1   : 0,
            soloTotalWickets:   s.wickets       || 0,
            soloBallsBowled:    s.ballsBowled   || 0,
            soloRunsConceded:   s.runsConceded  || 0,
            soloMOTM:           isMOTM,
          },
          $set: {
            soloBestScore: newBest,
          }
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
   DETERMINE MAN OF THE MATCH
   Simple formula: runs + (wickets * 15)
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
   FORMAT /solostats REPLY
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
  const motm    = dbUser.soloMOTM           || 0;

  const sr   = balls  > 0 ? ((runs / balls) * 100).toFixed(1)  : "—";
  const econ = bowled > 0 ? ((given / bowled) * 6).toFixed(2)  : "—";
  const name = firstName || "Player";

  return (
`📊 <b>Solo Stats — ${name}</b>

<blockquote>🏏 Matches:     ${played}
🌟 MOTM:        ${motm}</blockquote>

<blockquote>Batting
🏏 Runs:        ${runs}
📦 Balls:       ${balls}
⚡ SR:          ${sr}
4s / 5s / 6s:  ${fours} / ${fives} / ${sixes}
🦆 Ducks:       ${ducks}
50s / 100s:    ${fifties} / ${tons}
🏆 Best Score:  ${best}</blockquote>

<blockquote>Bowling
🎯 Wickets:     ${wickets}
🎯 Balls:       ${bowled}
💧 Runs Given:  ${given}
📉 Economy:     ${econ}</blockquote>`
  );
}


module.exports = { saveSoloMatchStats, determineMOTM, getSoloStatsText };