// ===============================================================
// SOLO SCORECARD GENERATOR — soloScorecard.js
// ===============================================================
// Live (/soloscore) and final (end of match) scorecard.
//
// Per-player block:
//   <b>Name</b> 🏏 / 🎯 / ✗ indicator
//   <blockquote>runs(balls)  SR:xx  4s(x) 5s(x) 6s(x)</blockquote>
//   <blockquote>🎯 Bowling: 3 W 6 6 W 1</blockquote>   ← ball history only
//
// Live footer: current batter/bowler + players alive + set ball count
// Final:       timed-out players excluded, MOTM shown at bottom
// ===============================================================

function h(str) {
  return String(str ?? "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeNum(n) {
  return typeof n === "number" && !isNaN(n) ? n : 0;
}

/**
 * @param {object} match
 * @param {object} opts
 * @param {boolean} opts.final  – true = final card
 * @param {number}  opts.motm   – userId of MOTM (final card only)
 */
function generateSoloScorecard(match, opts = {}) {
  if (!match) return "No match data.";

  const { final = false } = opts;

  // ── Build name map from ALL players who ever joined ──
  // match.allPlayers preserves everyone including timed-out ones
  // fallback to match.players if allPlayers not set
  const roster = match.allPlayers || match.players;
  const nameMap = {};
  for (const p of roster) nameMap[p.id] = p.name;

  // ── Who to show ──
  // Live  → only current active players (timed-out removed from match.players)
  // Final → only active players (timed-out excluded from final card per spec)
  const showIds = match.players.map(p => p.id);

  const title = final ? `🏆 <b>Final Scorecard</b>` : `📊 <b>Live Scorecard</b>`;
  const lines = [title, ""];

  for (const id of showIds) {
    const s = match.stats[id] || {
      runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0,
      wickets: 0, out: false,
      ballsBowled: 0, runsConceded: 0,
      ballHistory: [],
      timedOut: false,
    };

    // Skip timed-out players on final card
    if (final && s.timedOut) continue;

    const name   = h(nameMap[id] || `Player_${id}`);
    const runs   = safeNum(s.runs);
    const balls  = safeNum(s.balls);
    const fours  = safeNum(s.fours);
    const fives  = safeNum(s.fives);
    const sixes  = safeNum(s.sixes);
    const sr     = balls > 0 ? ((runs / balls) * 100).toFixed(0) : "0";

    // ── Status indicator ──
    let indicator = "";
    if (!final) {
      if (id === match.batter)       indicator = " 🏏";
      else if (id === match.bowler)  indicator = " 🎯";
      else if (s.out || s.timedOut) indicator = " ✗";
    } else {
      if (s.out) indicator = " ✗";
      else       indicator = "*"; // not out
    }

    // ── Batting line ──
    lines.push(`<b>${name}${indicator}</b>`);
    lines.push(`<blockquote>${runs}(${balls})  SR:${sr}  4s(${fours}) 5s(${fives}) 6s(${sixes})</blockquote>`);

    // ── Bowling / ball history line ──
    const history = (s.ballHistory || []).map(x => (x === "W" ? "W" : String(x)));
    const histStr = history.length > 0 ? history.join(" ") : "—";
    lines.push(`<blockquote>🎯 ${histStr}</blockquote>`);

    lines.push("");
  }

  // ── Live footer ──
  if (!final) {
    const batterName = h(nameMap[match.batter] || "—");
    const bowlerName = h(nameMap[match.bowler] || "—");
    const alive      = match.players.filter(p => !match.stats[p.id]?.out && !match.stats[p.id]?.timedOut).length;
    lines.push(
      `<blockquote>🏏 ${batterName}  |  🎯 ${bowlerName}\n` +
      `Alive: ${alive}/${match.players.length}  |  Ball: ${safeNum(match.ballsThisSet)}/3</blockquote>`
    );
  }

  // ── Final: MOTM ──
  if (final && opts.motm != null) {
    const motmName = h(nameMap[opts.motm] || `Player_${opts.motm}`);
    lines.push("");
    lines.push(`🌟 <b>Man of the Match: ${motmName}</b>`);
  }

  return lines.join("\n");
}

module.exports = generateSoloScorecard;