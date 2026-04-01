// ===============================================================
// SOLO STATS — soloStats.js
// ===============================================================
// Saves into PlayerStats model (same as team stats) using userId.
// Solo fields are prefixed "solo" so they never clash with team fields.
// ===============================================================

const PlayerStats = require("../models/PlayerStats");


/* ─────────────────────────────────────────
   SAVE STATS AFTER MATCH
───────────────────────────────────────── */

async function saveSoloMatchStats(match) {
  const roster = match.allPlayers || match.players;
  console.log(`[SOLO saveSoloMatchStats] saving for ${roster.length} players`);

  const promises = roster.map(async (p) => {
    const s = match.stats[p.id];
    if (!s) {
      console.warn(`[SOLO stats] no stats object for userId=${p.id} name=${p.name}`);
      return;
    }
    if (s.timedOut) {
      console.log(`[SOLO stats] skipping timedOut player userId=${p.id}`);
      return;
    }

    const isDuck    = s.runs === 0 && s.out && !s.timedOut;
    const isFifty   = s.runs >= 50 && s.runs < 100;
    const isHundred = s.runs >= 100;
    const isMOTM    = match.motm === p.id ? 1 : 0;

    try {
      const existing = await PlayerStats.findOne(
        { userId: String(p.id) },
        { soloBestScore: 1 }
      ).lean();

      const currentBest = existing?.soloBestScore || 0;
      const finalBest   = Math.max(currentBest, s.runs || 0);

      const result = await PlayerStats.updateOne(
        { userId: String(p.id) },
        {
          $inc: {
            soloMatchesPlayed: 1,
            soloTotalRuns:     s.runs         || 0,
            soloTotalBalls:    s.balls        || 0,
            soloFours:         s.fours        || 0,
            soloFives:         s.fives        || 0,
            soloSixes:         s.sixes        || 0,
            soloDucks:         isDuck    ? 1  : 0,
            soloFifties:       isFifty   ? 1  : 0,
            soloHundreds:      isHundred ? 1  : 0,
            soloTotalWickets:  s.wickets      || 0,
            soloBallsBowled:   s.ballsBowled  || 0,
            soloRunsConceded:  s.runsConceded || 0,
            soloMOTM:          isMOTM,
          },
          $set: { soloBestScore: finalBest },
        },
        { upsert: true }
      );

      console.log(`[SOLO stats saved] userId=${p.id} name=${p.name} runs=${s.runs} wkts=${s.wickets} matched=${result.matchedCount} modified=${result.modifiedCount} upserted=${result.upsertedCount}`);
    } catch (e) {
      console.error(`[SOLO saveSoloMatchStats ERROR] userId=${p.id} name=${p.name}:`, e.message);
    }
  });

  await Promise.allSettled(promises);
  console.log(`[SOLO saveSoloMatchStats] done`);
}


/* ─────────────────────────────────────────
   MAN OF THE MATCH
───────────────────────────────────────── */

function determineMOTM(match) {
  const roster = match.allPlayers || match.players;
  let bestId    = null;
  let bestScore = -1;

  for (const p of roster) {
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
   /solostats
───────────────────────────────────────── */

async function getSoloStatsText(userId, firstName) {
  let doc;
  try {
    doc = await PlayerStats.findOne({ userId: String(userId) }).lean();
  } catch (e) {
    console.error("[SOLO getSoloStatsText error]", e.message);
    return "⚠️ Could not fetch stats. Try again later.";
  }

  console.log(`[SOLO solostats] userId=${userId} found=${!!doc} soloMatchesPlayed=${doc?.soloMatchesPlayed}`);

  if (!doc || !doc.soloMatchesPlayed)
    return "❌ No solo stats yet. Play a solo match first!";

  const played  = doc.soloMatchesPlayed  || 0;
  const motm    = doc.soloMOTM           || 0;
  const runs    = doc.soloTotalRuns      || 0;
  const balls   = doc.soloTotalBalls     || 0;
  const fours   = doc.soloFours          || 0;
  const fives   = doc.soloFives          || 0;
  const sixes   = doc.soloSixes          || 0;
  const ducks   = doc.soloDucks          || 0;
  const fifties = doc.soloFifties        || 0;
  const tons    = doc.soloHundreds       || 0;
  const best    = doc.soloBestScore      || 0;
  const wickets = doc.soloTotalWickets   || 0;
  const bowled  = doc.soloBallsBowled    || 0;
  const given   = doc.soloRunsConceded   || 0;

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


/* ─────────────────────────────────────────
   /solostatsdebug — raw dump for diagnosing
───────────────────────────────────────── */

async function getSoloStatsDebug(userId) {
  try {
    const doc = await PlayerStats.findOne({ userId: String(userId) }).lean();
    if (!doc) {
      return `🔍 <b>Debug userId=${userId}</b>\n\n❌ No PlayerStats document found.\n\nPlay a match — check server logs for:\n<code>[SOLO stats saved]</code> or <code>[SOLO saveSoloMatchStats ERROR]</code>`;
    }
    return (
`🔍 <b>Debug userId=${userId}</b>

<blockquote>userId: ${doc.userId}
soloMatchesPlayed: ${doc.soloMatchesPlayed ?? "not set"}
soloTotalRuns: ${doc.soloTotalRuns ?? "not set"}
soloTotalBalls: ${doc.soloTotalBalls ?? "not set"}
soloBestScore: ${doc.soloBestScore ?? "not set"}
soloTotalWickets: ${doc.soloTotalWickets ?? "not set"}
soloBallsBowled: ${doc.soloBallsBowled ?? "not set"}
soloMOTM: ${doc.soloMOTM ?? "not set"}</blockquote>`
    );
  } catch (e) {
    return `⚠️ DB error: ${e.message}`;
  }
}


module.exports = { saveSoloMatchStats, determineMOTM, getSoloStatsText, getSoloStatsDebug };