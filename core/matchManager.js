const store = require("../state/inMemoryStore");

function ensureMatch(chatId) {
  return store.getMatch(chatId);
}


/* ================= END INNINGS ================= */

async function endInnings(match) {

  if (!match) return;

  clearTimers(match);
  match.awaitingBat = false;
  match.awaitingBowl = false;

  /* 🥇 FIRST INNINGS */
  if (match.innings === 1) {

    match.firstInningsScore = match.score;

    match.phase = "switch";
    match.ballLocked = false;

    return bot.telegram.sendMessage(
      match.groupId,
`🏁 First Innings Completed

Score: ${match.score}/${match.wickets}

Host type:
/inningsswitch`
    );
  }

  /* 🥈 SECOND INNINGS RESULT */

  if (match.score > match.firstInningsScore) {
    return endMatchWithWinner(match.battingTeam);
  }

  if (match.score < match.firstInningsScore) {
    return endMatchWithWinner(match.bowlingTeam);
  }

  await bot.telegram.sendMessage(match.groupId, "🤝 Match Tied!");
  return resetMatch();
}


/* ================= INNINGS SWITCH ================= */

bot.command("inningsswitch", async (ctx) => {

  const m = getMatch(ctx); // avoid shadowing global match

  if (!m || !m.groupId) {
    return ctx.reply("⚠️ No active match.");
  }

  if (String(ctx.from.id) !== String(m.host)) {
    return ctx.reply("❌ Only the match host can switch innings.");
  }

  if (m.phase !== "switch") {
    return ctx.reply(
      `⚠️ Cannot switch innings now.\nCurrent phase: ${m.phase}`
    );
  }

  /* 🔄 MOVE TO 2ND INNINGS */
  m.innings = 2;

  /* 🔁 SWAP TEAMS */
  [m.battingTeam, m.bowlingTeam] =
    [m.bowlingTeam, m.battingTeam];

  /* 🔁 RESET STATS */
  m.score = 0;
  m.wickets = 0;
  m.currentOver = 0;
  m.currentBall = 0;
  m.currentOverNumber = 0;
  m.currentPartnershipRuns = 0;
  m.currentPartnershipBalls = 0;
  m.currentOverRuns = 0;
  m.wicketStreak = 0;
  m.bowlerMissCount = 0;
  m.batterMissCount = 0;

  m.usedBatters = [];
  m.striker = null;
  m.nonStriker = null;
  m.bowler = null;
  m.lastBowler = null;
  m.suspendedBowlers = {};
  m.overHistory = [];
  m.currentOverBalls = [];
  m.awaitingBat = false;
  m.awaitingBowl = false;

  m.phase = "set_striker";

  return ctx.reply(
`🔁 Innings Switched Successfully!

🏏 Now Batting: ${m.battingTeam}
🎯 Target: ${m.firstInningsScore + 1}

Set STRIKER:
/batter number`
  );
});


/* ================= DECLARE WINNER ================= */

async function endMatchWithWinner(match, team) {

  if (!match) return;

  const winnerName =
    team === "A" ? match.teamAName : match.teamBName;

  await bot.telegram.sendMessage(
    match.groupId,
`🏆 ${winnerName} Wins!

📊 Final Score:
Innings 1: ${match.firstInningsScore}
Innings 2: ${match.score}`
  );
  await handleMatchEnd(playerId, {
     runs: playerMatchRuns,
     balls: playerMatchBalls,
     wickets: playerMatchWickets,
     runsConceded: playerMatchRunsConceded,
     ballsBowled: playerMatchBallsBowled,
     wicketsLost: playerOut ? 1 : 0
   });

  try {

    const teamAIds = match.teamA.map(p => p.id);
    const teamBIds = match.teamB.map(p => p.id);

    const allPlayers = [...teamAIds, ...teamBIds];

    await Promise.all(
      allPlayers.map(id =>
        User.updateOne(
          { telegramId: id },
          { $inc: { matchesPlayed: 1 } }
        )
      )
    );

    const winners = team === "A" ? teamAIds : teamBIds;

    await Promise.all(
      winners.map(id =>
        User.updateOne(
          { telegramId: id },
          { $inc: { matchesWon: 1 } }
        )
      )
    );

  } catch (err) {
    console.error("Stats update error:", err);
  }

  return resetMatch(match.groupId);;
}

function setPhase(match, newPhase) {
  console.log(`PHASE: ${match.phase} → ${newPhase}`);
  match.phase = newPhase;
}

module.exports = {
  ensureMatch
};