// ===============================================================
// SOLO SCORECARD + PLAYER LIST — soloScorecard.js
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

/* ── PINNED PLAYER LIST (mirrors team mode style) ── */

function buildSoloPlayerList(match) {
  if (!match) return "No match data.";

  const roster = match.allPlayers || match.players;
  const lines  = [`👥 <b>Solo Match — Players</b>`, ``];

  roster.forEach((p, i) => {
    const s = match.stats[p.id] || {};
    const isBatter  = match.phase === "play" && p.id === match.batter;
    const isBowler  = match.phase === "play" && p.id === match.bowler;
    const isOut     = s.out;
    const isRemoved = s.timedOut;

    let tag = "";
    if (isBatter)       tag = " 🏏";
    else if (isBowler)  tag = " 🎯";
    else if (isRemoved) tag = " ✗";
    else if (isOut)     tag = " ✗";

    const name = h(p.name || "Player");
    lines.push(`<blockquote>${i + 1}. ${name}${tag}</blockquote>`);
  });

  if (match.phase === "join") {
    lines.push(``);
    lines.push(`👉 /solojoin to join  (120s)`);
  }

  return lines.join("\n");
}

async function sendAndPinSoloPlayerList(match, telegram) {
  const text = buildSoloPlayerList(match);
  try {
    if (match.playerListMessageId) {
      try {
        await telegram.editMessageText(
          match.groupId,
          match.playerListMessageId,
          null,
          text,
          { parse_mode: "HTML" }
        );
      } catch (e) {
        if (!e.message?.includes("message is not modified")) {
          console.error("[SOLO PlayerList edit error]", e.message);
        }
      }
    } else {
      const msg = await telegram.sendMessage(match.groupId, text, { parse_mode: "HTML" });
      match.playerListMessageId = msg.message_id;
      try {
        await telegram.pinChatMessage(match.groupId, msg.message_id, {
          disable_notification: true,
        });
      } catch (e) {
        console.error("[SOLO Pin failed]", e.message);
      }
    }
  } catch (e) {
    console.error("[SOLO PlayerList error]", e.message);
  }
}


/* ── SCORECARD (live & final) ── */

/**
 * @param {object} match
 * @param {object} opts
 * @param {boolean} opts.final  – true = final card
 * @param {number}  opts.motm   – userId of MOTM (final only)
 */
function generateSoloScorecard(match, opts = {}) {
  if (!match) return "No match data.";

  const { final = false } = opts;

  const roster = match.allPlayers || match.players;
  const nameMap = {};
  for (const p of roster) nameMap[p.id] = p.name;

  // Final: show all non-timed-out players; Live: show current active players
  const showIds = final
    ? roster.filter(p => !match.stats[p.id]?.timedOut).map(p => p.id)
    : match.players.map(p => p.id);

  const title = final ? `🏆 <b>Final Scorecard</b>` : `📊 <b>Live Scorecard</b>`;
  const lines = [title, ""];

  for (const id of showIds) {
    const s = match.stats[id] || {
      runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0,
      wickets: 0, out: false,
      ballsBowled: 0, runsConceded: 0,
      ballHistory: [],
    };

    const name  = h(nameMap[id] || `Player_${id}`);
    const runs  = safeNum(s.runs);
    const balls = safeNum(s.balls);
    const fours = safeNum(s.fours);
    const fives = safeNum(s.fives);
    const sixes = safeNum(s.sixes);
    const sr    = balls > 0 ? ((runs / balls) * 100).toFixed(0) : "0";

    // Bowling stats
    const bBalls = safeNum(s.ballsBowled);
    const bRuns  = safeNum(s.runsConceded);
    const bWkts  = safeNum(s.wickets);
    const econ   = bBalls > 0 ? ((bRuns / bBalls) * 6).toFixed(2) : "0.00";

    // Status tag
    let indicator = "";
    if (!final) {
      if (id === match.batter)       indicator = " 🏏";
      else if (id === match.bowler)  indicator = " 🎯";
      else if (s.out || s.timedOut) indicator = " ✗";
    } else {
      indicator = s.out ? " ✗" : "*";
    }

    lines.push(`<b>${name}${indicator}</b>`);
    lines.push(`<blockquote>🏏 ${runs}(${balls})  SR:${sr}  4s:${fours} 5s:${fives} 6s:${sixes}</blockquote>`);

    // Bowling history
    const history = (s.ballHistory || []).map(x => (x === "W" ? "W" : String(x)));
    const histStr = history.length > 0 ? history.join(" ") : "—";
    lines.push(`<blockquote>🎯 ${bBalls}b  ${bRuns}r  ${bWkts}w  eco:${econ}  [ ${histStr} ]</blockquote>`);

    lines.push("");
  }

  // Live footer
  if (!final) {
    const batterName = h(nameMap[match.batter] || "—");
    const bowlerName = h(nameMap[match.bowler] || "—");
    const alive = match.players.filter(
      p => !match.stats[p.id]?.out && !match.stats[p.id]?.timedOut
    ).length;
    lines.push(
      `<blockquote>🏏 ${batterName}  |  🎯 ${bowlerName}\n` +
      `Players: ${alive}/${match.players.length}  |  Ball: ${safeNum(match.ballsThisSet)}/3</blockquote>`
    );
  }

  // MOTM
  if (final && opts.motm != null) {
    const motmName = h(nameMap[opts.motm] || `Player_${opts.motm}`);
    lines.push("");
    lines.push(`🌟 <b>Man of the Match: ${motmName}</b>`);
  }

  return lines.join("\n");
}


module.exports = {
  generateSoloScorecard,
  buildSoloPlayerList,
  sendAndPinSoloPlayerList,
};