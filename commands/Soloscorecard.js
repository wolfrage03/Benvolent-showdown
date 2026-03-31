
// ===============================================================
// SOLO SCORECARD GENERATOR
// ===============================================================
// Used for both /soloscore (live) and end-of-match final card.
// Format per player (combined bat + bowl):
//   Name   runs(balls)  SR  4s()  5s()  6s()
//   Bowl history: 3 W 6 6 W 1
// ===============================================================

function h(str) {
  return String(str ?? "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeNum(n) {
  return (typeof n === "number" && !isNaN(n)) ? n : 0;
}

/**
 * Build a scorecard message for a solo match.
 *
 * @param {object} match        - the solo match object
 * @param {object} [opts]
 * @param {boolean} opts.final  - true = final scorecard (include MOTM, no live indicators)
 * @param {string}  opts.motm   - userId of man of the match (for final card)
 */
function generateSoloScorecard(match, opts = {}) {
  if (!match) return "No match data.";

  const { final = false } = opts;

  const title = final
    ? `🏆 <b>Final Scorecard</b>`
    : `📊 <b>Live Scorecard</b>`;

  const lines = [title, ""];

  // All players who are still in the list (timed-out players were removed from match.players)
  // But for the scorecard we want everyone who ever had stats
  // For live: show all current players; for final: show all who have stats
  const allIds = final
    ? [...new Set([
        ...match.players.map(p => p.id),
        ...Object.keys(match.stats).map(Number)
      ])]
    : match.players.map(p => p.id);

  // Build a name map — players array + fallback
  const nameMap = {};
  for (const p of match.players) nameMap[p.id] = p.name;

  for (const id of allIds) {
    const s = match.stats[id] || {
      runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0,
      wickets: 0, out: false,
      ballsBowled: 0, runsConceded: 0,
      ballHistory: [],
      timedOut: false,
    };

    const name    = h(nameMap[id] || `Player_${id}`);
    const runs    = safeNum(s.runs);
    const balls   = safeNum(s.balls);
    const fours   = safeNum(s.fours);
    const fives   = safeNum(s.fives);
    const sixes   = safeNum(s.sixes);
    const sr      = balls > 0 ? ((runs / balls) * 100).toFixed(0) : "0";

    const isCurrentBatter = !final && id === match.batter;
    const isCurrentBowler = !final && id === match.bowler;

    let statusTag = "";
    if (!final) {
      if (isCurrentBatter) statusTag = " 🏏";
      else if (isCurrentBowler) statusTag = " 🎯";
      else if (s.out || s.timedOut) statusTag = " ✗";
    } else {
      if (s.timedOut) statusTag = " ⏱ timed out";
      else if (s.out) statusTag = " ✗";
      else statusTag = "*"; // not out
    }

    // ── Batting line ──
    lines.push(`<b>${name}${statusTag}</b>`);
    lines.push(
      `<blockquote>🏏 ${runs}(${balls})  SR:${sr}  4s(${fours})  5s(${fives})  6s(${sixes})</blockquote>`
    );

    // ── Bowling / ball history line ──
    const history = (s.ballHistory || []).map(x => x === "W" ? "W" : String(x));
    const histStr = history.length > 0 ? history.join(" ") : "—";
    lines.push(
      `<blockquote>🎯 ${safeNum(s.wickets)}w  ${safeNum(s.ballsBowled)}b  ${safeNum(s.runsConceded)}r  |  ${histStr}</blockquote>`
    );

    lines.push("");
  }

  // ── Live: current match state summary ──
  if (!final) {
    const batterName = nameMap[match.batter] ? h(nameMap[match.batter]) : "—";
    const bowlerName = nameMap[match.bowler] ? h(nameMap[match.bowler]) : "—";
    const alive      = match.players.filter(p => !match.stats[p.id]?.out).length;
    lines.push(
      `<blockquote>🏏 Batting: ${batterName}  |  🎯 Bowling: ${bowlerName}\n` +
      `Players alive: ${alive}/${match.players.length}  |  Set ball: ${match.ballsThisSet}/3</blockquote>`
    );
  }

  // ── Final: Man of the Match ──
  if (final && opts.motm) {
    const motmName = h(nameMap[opts.motm] || `Player_${opts.motm}`);
    lines.push(`🌟 <b>Man of the Match: ${motmName}</b>`);
    lines.push("");
  }

  return lines.join("\n");
}

module.exports = generateSoloScorecard;