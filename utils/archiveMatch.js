const MatchArchive = require("../models/MatchArchive");

/**
 * Saves match snapshot to MongoDB AND sends a JSON file to Telegram.
 *
 * @param {object} match    - The live match object
 * @param {string} reason   - "force_ended" | "completed"
 * @param {object} telegram - bot.telegram instance (pass from handler)
 * @param {number} sendTo   - chat ID to send the file to (groupId or admin ID)
 */
async function archiveMatch(match, reason = "force_ended", telegram = null, sendTo = null) {

  const snapshot = {
    groupId:     String(match.groupId),
    endReason:   reason,
    endedAt:     new Date().toISOString(),
    phase:       match.phase,
    totalOvers:  match.totalOvers,
    currentOver: match.currentOver,
    currentBall: match.currentBall,
    innings:     match.innings,

    teamAName:   match.teamAName,
    teamBName:   match.teamBName,
    teamA:       (match.teamA || []).map(p => ({ id: p.id, name: p.name })),
    teamB:       (match.teamB || []).map(p => ({ id: p.id, name: p.name })),
    captains:    match.captains || {},
    host:        match.host,

    battingTeam:  match.battingTeam,
    bowlingTeam:  match.bowlingTeam,
    score:        match.score,
    wickets:      match.wickets,
    striker:      match.striker,
    nonStriker:   match.nonStriker,
    bowler:       match.bowler,

    firstInningsScore:   match.firstInningsScore,
    firstInningsWickets: match.firstInningsWickets,
    target:              match.target,

    ballLog: match.ballLog || [],
  };

  /* ── 1. Save to MongoDB ── */
  try {
    const doc = new MatchArchive(snapshot);
    await doc.save();
    console.log(`[ARCHIVE] Match ${match.groupId} saved to DB. Reason: ${reason}`);
  } catch (err) {
    console.error("[ARCHIVE] DB save failed:", err.message);
  }

  /* ── 2. Send JSON file to Telegram ── */
  if (telegram && sendTo) {
    try {
      const json     = JSON.stringify(snapshot, null, 2);
      const buffer   = Buffer.from(json, "utf8");
      const filename = `match_${String(match.groupId).replace("-", "")}_${Date.now()}.json`;

      await telegram.sendDocument(sendTo, {
        source:   buffer,
        filename: filename,
      }, {
        caption:    `📁 Match Archive\n🏷 Reason: ${reason}\n🕐 ${snapshot.endedAt}`,
        parse_mode: "HTML",
      });

      console.log(`[ARCHIVE] JSON file sent to ${sendTo}`);
    } catch (err) {
      console.error("[ARCHIVE] File send failed:", err.message);
    }
  }
}

module.exports = archiveMatch;