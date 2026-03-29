const MatchArchive = require("../models/MatchArchive");

/**
 * Saves a snapshot of the match to MongoDB.
 * Call this whenever a match ends — force or completed.
 *
 * @param {object} match   - The live match object from matchManager
 * @param {string} reason  - "force_ended" | "completed"
 */
async function archiveMatch(match, reason = "force_ended") {
  try {
    const doc = new MatchArchive({
      groupId:     String(match.groupId),
      endReason:   reason,
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
    });

    await doc.save();
    console.log(`[ARCHIVE] Match ${match.groupId} saved. Reason: ${reason}`);
  } catch (err) {
    console.error("[ARCHIVE] Failed to save match:", err.message);
  }
}

module.exports = archiveMatch;