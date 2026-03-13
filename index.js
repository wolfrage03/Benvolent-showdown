

const User = require("./User"); 
const { Telegraf, Markup } = require("telegraf");
const initializeApp = require("./config/appInit");
const { bot, initializeBot } = require("./config/bot");


const registerStartHandler = require("./handlers/startHandler");
const registerStatsHandler = require("./handlers/statsHandler");
const updatePlayerStats = require("./utils/updateStats");
const PlayerStats = require("./models/PlayerStats");
const generateScorecard = require("./utils/scorecardGenerator");



const {
  randomLine,
  randomBowlingPrompt,
  randomBatterPrompt,
  getRandomTeams
} = require("./commentary");

// ================= MATCH STORAGE =================

const {
  matches,
  playerActiveMatch,
  getMatch,
  resetMatch,
  deleteMatch
} = require("./matchManager");


/* ================= HELPERS ================= */

const isHost = (match, id) => match && id === match.host;

const battingPlayers = (match) =>
  match.battingTeam === "A" ? match.teamA : match.teamB;

const bowlingPlayers = (match) =>
  match.bowlingTeam === "A" ? match.teamA : match.teamB;


function isPlayer(match, userId) {
  return (
    match.teamA?.some(p => p.id === userId) ||
    match.teamB?.some(p => p.id === userId)
  );
}



function orderedBattingPlayers(match) {
  if (!match) return [];

  const players = battingPlayers(match);
  const captainId =
    match.battingTeam === "A" ? match.captains.A : match.captains.B;

  return [
    ...players.filter(p => p.id === captainId),
    ...players.filter(p => p.id !== captainId)
  ];
}
/* ================= CLEAR ACTIVE PLAYERS ================= */

function clearActiveMatchPlayers(match) {

  if (!match) return;

  const allPlayers = [
    ...(match.teamA || []),
    ...(match.teamB || [])
  ];

  for (const player of allPlayers) {

    if (player?.id)
      playerActiveMatch.delete(player.id);

  }
}

function getPlayerTeam(match, userId) {

  if (!match) return null;

  if ((match.teamA || []).some(p => p.id === userId)) return "A";

  if ((match.teamB || []).some(p => p.id === userId)) return "B";

  return null;
}

function swapStrike(match) {

  if (!match || !match.striker || !match.nonStriker)
    return;

  const temp = match.striker;
  match.striker = match.nonStriker;
  match.nonStriker = temp;
}

function getDisplayName(user) {
  if (!user) return "Player";

  if (user.username) return `@${user.username}`;
  if (user.first_name && user.last_name)
    return `${user.first_name} ${user.last_name}`;
  if (user.first_name) return user.first_name;

  return "Player";
}

function getName(match, id) {
  if (!match) return "Player";

  const all = [
    ...(match.teamA || []),
    ...(match.teamB || [])
  ];

  const p = all.find(x => x.id === id);

  return p ? p.name : "Player";
}

function clearTimers(match) {
  if (!match) return;

  if (match.warning30) {
    clearTimeout(match.warning30);
    match.warning30 = null;
  }

  if (match.warning10) {
    clearTimeout(match.warning10);
    match.warning10 = null;
  }

  if (match.ballTimer) {
    clearTimeout(match.ballTimer);
    match.ballTimer = null;
  }

  match.ballLocked = false;
}


function getOverHistory(match) {

  if (!match || !match.overHistory || !match.overHistory.length)
    return "No overs completed yet.";

  return match.overHistory
    .map(o => {
      const balls = o.balls.join(",");
      return `Over ${o.over} - ${getName(match, o.bowler)} = (${balls})`;
    })
    .join("\n");
}

function bowlDMButton() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🎯 Send Ball in DM",
            url: "https://t.me/Benevolent_Cricket_bot"
          }
        ]
      ]
    }
  };
}


async function advanceGame(match) {
  if (!match) return;

  if (match.phase === "switch") return;

  if (match.wickets >= match.maxWickets) {
    await endInnings(match);
    return;
  }

  if (match.currentOver >= match.totalOvers) {
    await endInnings(match);
    return;
  }

  if (match.phase === "play") {
    startBall(match);
  }
}

const helpers = {
  isHost,
  getDisplayName,
  getName,
  getPlayerTeam,
  clearTimers,
  clearActiveMatchPlayers,
  startToss: null
};


require("./commands/matchCommands")(bot, helpers);
require("./commands/hostControls")(bot, helpers);
require("./commands/teamCommands")(bot, helpers);
require("./commands/captainCommands")(bot, helpers);
require("./commands/tossCommands")(bot, helpers);

module.exports = { getName };


/* ================= SET BATTER ================= */

bot.command("batter", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (!isHost(match, ctx.from.id)) return;

  if (ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ Send batter number in GROUP only.");

  const args = ctx.message.text.trim().split(/\s+/);
  const num = parseInt(args[1], 10);

  const players = orderedBattingPlayers(match);

  if (isNaN(num))
    return ctx.reply("❌ Send batter number like: /batter 2");

  if (num < 1 || num > players.length)
    return ctx.reply(`❌ Invalid number. Choose between 1 and ${players.length}`);

  const selected = players[num - 1];
  if (!selected) return ctx.reply("⚠️ Player not found");

  if (match.usedBatters.includes(selected.id))
    return ctx.reply("⚠️ Player already batted / dismissed");

  const name = selected.name;
  const orderNumber = match.usedBatters.length + 1;

  const ordinal = (n) => {
    const s = ["th","st","nd","rd"];
    const v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  };

  /* STRIKER */
if (match.phase === "set_striker") {

  match.striker = selected.id;
  match.batterStats[selected.id] = { runs: 0, balls: 0 };

  if (!match.battingOrder.includes(selected.id))
    match.battingOrder.push(selected.id);

  match.usedBatters.push(selected.id);
  match.phase = "set_non_striker";

  return ctx.reply(
`🏏 ${name} is ${ordinal(orderNumber)} batter at STRIKER end

Now send NON-STRIKER:
/batter number`);
}



  /* NON STRIKER */
  if (match.phase === "set_non_striker") {

    if (selected.id === match.striker)
      return ctx.reply("⚠️ Choose different player");

    match.nonStriker = selected.id;
    match.usedBatters.push(selected.id);
    match.maxWickets = battingPlayers(match).length - 1;

    match.phase = "set_bowler";

    return ctx.reply(
`🏏 ${name} is ${ordinal(orderNumber)} batter at NON-STRIKER end

🎯 Send bowler:
/bowler number`);
  }

 /* NEW BATTER */
if (match.phase === "new_batter") {

  if (selected.id === match.nonStriker)
    return ctx.reply("⚠️ Choose different player");

  match.striker = selected.id;
  match.batterStats[selected.id] = { runs: 0, balls: 0 };

  if (!match.battingOrder.includes(selected.id))
    match.battingOrder.push(selected.id);

  match.usedBatters.push(selected.id);
  match.phase = "play";

  await ctx.reply(`🏏 ${name} is ${ordinal(orderNumber)} batter`);

  return startBall(match);
}

});

/* ================= SET BOWLER ================= */

bot.command("bowler", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (match.phase !== "set_bowler")
    return ctx.reply("⚠️ You can set bowler only when bot asks.");

  if (ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ This match is not running here.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can set bowler.");

  const num = parseInt(ctx.message.text.split(" ")[1]);
  if (!num) return ctx.reply("Invalid number");

  const base = bowlingPlayers(match);
  const captainId =
    match.bowlingTeam === "A"
      ? match.captains.A
      : match.captains.B;

  const players = [
    ...base.filter(p => p.id === captainId),
    ...base.filter(p => p.id !== captainId)
  ];

  if (num < 1 || num > players.length)
    return ctx.reply("⚠️ Invalid player number.");

  const player = players[num - 1];

  if (match.lastOverBowler === player.id)
    return ctx.reply("⚠️ Same bowler cannot bowl consecutive overs.");

  if (match.suspendedBowlers?.[player.id] >= match.currentOver)
    return ctx.reply("⚠️ This bowler is suspended for this over.");

  match.bowler = player.id;
  match.lastOverBowler = player.id;

  if (!match.overHistory) match.overHistory = [];

  match.overHistory.push({
    over: match.currentOver + 1,
    bowler: match.bowler,
    balls: []
  });

  match.phase = "play";
  match.awaitingBat = false;
  match.awaitingBowl = true;

  await ctx.reply(
`🎯 Bowler Selected: ${player.name}

Ball starting...`
  );

  advanceGame(match);
});



// ================= OVER COMPLETION =================

async function handleOverCompletion(match) {

  if (!match) return false;

  if (match.currentBall !== 6) return false;

  match.currentOver++;
  match.currentBall = 0;
  match.currentOverRuns = 0;
  match.wicketStreak = 0;

  match.awaitingBat = false;
  match.awaitingBowl = false;

  // innings finished
  if (match.currentOver >= match.totalOvers) {
    clearTimers(match);
    await endInnings(match);
    return true;
  }

  // prevent same bowler
  match.lastOverBowler = match.bowler;
  match.bowler = null;

  // rotate strike
  swapStrike(match);

  // phase change
  match.phase = "set_bowler";

  await bot.telegram.sendMessage(
    match.groupId,
    generateScorecard(match)
  );

  await bot.telegram.sendMessage(
    match.groupId,
`🔄 Over ${match.currentOver} Completed!

🎯 Host choose new bowler
/bowler number`
  );

  return true;
}


/* ================= SCORE ================= */

function getLiveScore(match) {

  if (!match) return "⚠️ No active match.";

  const overs = `${match.currentOver}.${match.currentBall}`;

  const ballsBowled = (match.currentOver * 6) + match.currentBall;
  const totalBalls = (match.totalOvers || 0) * 6;
  const ballsLeft = Math.max(totalBalls - ballsBowled, 0);

  const runRate =
    ballsBowled > 0
      ? ((match.score / ballsBowled) * 6).toFixed(2)
      : "0.00";

  let requiredRuns = "";
  let requiredRR = "";

  if (match.innings === 2) {
    const runsNeeded = (match.firstInningsScore + 1) - match.score;

    requiredRuns = runsNeeded > 0
      ? `🎯 Need ${runsNeeded} from ${ballsLeft} balls`
      : "✅ Target Achieved";

    requiredRR =
      (runsNeeded > 0 && ballsLeft > 0)
        ? ((runsNeeded / ballsLeft) * 6).toFixed(2)
        : "-";
  }

  const strikerStats =
    match.batterStats?.[match.striker] || { runs: 0, balls: 0 };

  const nonStrikerStats =
    match.batterStats?.[match.nonStriker] || { runs: 0, balls: 0 };

  const strikerSR =
    strikerStats.balls > 0
      ? ((strikerStats.runs / strikerStats.balls) * 100).toFixed(1)
      : "0.0";

  const nonStrikerSR =
    nonStrikerStats.balls > 0
      ? ((nonStrikerStats.runs / nonStrikerStats.balls) * 100).toFixed(1)
      : "0.0";

  const bowlerStats =
    match.bowlerStats?.[match.bowler] || {
      balls: 0,
      runs: 0,
      wickets: 0,
      history: []
    };

  const bowlerOvers =
    Math.floor(bowlerStats.balls / 6) + "." + (bowlerStats.balls % 6);

  const economy =
    bowlerStats.balls > 0
      ? ((bowlerStats.runs / bowlerStats.balls) * 6).toFixed(2)
      : "0.00";

  const dots =
    bowlerStats.history?.filter(x => x === 0).length || 0;

  const overHistoryFormatted =
    match.overHistory?.length
      ? match.overHistory
          .map((o, i) => `${i + 1}: ${o.balls.join(" ")}`)
          .join(" | ")
      : "Yet to start";

  const partnershipRuns = match.currentPartnershipRuns || 0;
  const partnershipBalls = match.currentPartnershipBalls || 0;

  return `
╔═══════════════════╗
🏏  LIVE SCOREBOARD
╚═══════════════════╝

📊 ${match.score}/${match.wickets}  (${overs}/${match.totalOvers})
⚡ RR: ${runRate}${match.innings === 2 ? ` | RRR: ${requiredRR}` : ""}

${match.innings === 2 ? requiredRuns + "\n" : ""}
🔵 Batting: ${
  match.battingTeam === "A"
    ? `${match.teamAName} (A)`
    : `${match.teamBName} (B)`
}

🔴 Bowling: ${
  match.bowlingTeam === "A"
    ? `${match.teamAName} (A)`
    : `${match.teamBName} (B)`
}

━━━━━━━━━━━━━━━━━━
🏏 Batters
⭐ ${getName(match, match.striker)}*  ${strikerStats.runs}(${strikerStats.balls})  SR:${strikerSR}
   ${getName(match, match.nonStriker)}  ${nonStrikerStats.runs}(${nonStrikerStats.balls})  SR:${nonStrikerSR}

🎯 Bowler
${getName(match, match.bowler)}
${bowlerOvers}-${dots}-${bowlerStats.runs}-${bowlerStats.wickets}  Econ:${economy}

🤝 Partnership: ${partnershipRuns} (${partnershipBalls})

📜 Overs: ${overHistoryFormatted}
`;
}

/* ================= COMMAND ================= */

bot.command("score", async (ctx) => {

  const match = getMatch(ctx);
  if (!match)
    return ctx.reply("⚠️ No active match.");

  await ctx.reply(getLiveScore(match));
});

/* ================= BALL TIMEOUT ================= */

async function ballTimeout(match) {

  if (!match || match.phase === "idle") return;
  if (match.phase !== "play") return;

  // 🔒 Prevent collision with processBall
  if (match.ballLocked) return;
  match.ballLocked = true;

  try {

    clearTimers(match);

    /* ================= BOWLER MISSED ================= */

    if (match.awaitingBowl) {

      match.awaitingBowl = false;
      match.bowlerMissCount = (match.bowlerMissCount || 0) + 1;

      match.score += 6;

      await bot.telegram.sendMessage(
        match.groupId,
`⚠️ Bowler missed!
+6 runs awarded (Ball does NOT count)`
      );

      if (match.bowlerMissCount >= 2) {

        match.bowlerMissCount = 0;

        if (!match.suspendedBowlers)
          match.suspendedBowlers = {};

        match.suspendedBowlers[match.bowler] =
          match.currentOver + 2;

        match.phase = "set_bowler";

        await bot.telegram.sendMessage(
          match.groupId,
`🚫 Bowler removed due to consecutive delays.
Cannot bowl this over and next over.

Host select new bowler:
/bowler number`
        );

        return;
      }

      if (await handleOverCompletion(match)) return;

      advanceGame(match);
      return;
    }

    /* ================= BATTER MISSED ================= */

    if (match.awaitingBat) {

      match.awaitingBat = false;
      match.batterMissCount = (match.batterMissCount || 0) + 1;

      match.currentBall++;
      match.score -= 6; // ✅ negative score allowed

      if (!match.batterStats[match.striker])
        match.batterStats[match.striker] = { runs: 0, balls: 0 };

      match.batterStats[match.striker].runs -= 6;
      match.batterStats[match.striker].balls++;

      await bot.telegram.sendMessage(
        match.groupId,
`⚠️ Batter missed!
-6 runs penalty (Ball counted)`
      );

      if (match.batterMissCount >= 2) {

        match.batterMissCount = 0;
        match.wickets++;

        await bot.telegram.sendMessage(
          match.groupId,
          "❌ Batter OUT due to consecutive delay!"
        );

        if (match.wickets >= match.maxWickets) {
          await endInnings(match);
          return;
        }

        match.phase = "new_batter";

        await bot.telegram.sendMessage(
          match.groupId,
          "📢 Send new batter:\n/batter number"
        );

        return;
      }

      if (await handleOverCompletion(match)) return;

      advanceGame(match);
      return;
    }

  } catch (err) {
    console.error("ballTimeout error:", err);
  } finally {

    // 🔓 Always unlock
    match.ballLocked = false;

    // 🔄 Reset inputs
    match.batNumber = null;
    match.bowlNumber = null;
  }
}

/* ================= ANNOUNCE BALL ================= */

async function announceBall(match) {

  if (!match || !match.bowler || !match.striker) return;

  match.batNumber = null;
  match.bowlNumber = null;

  const bowlerPing =
    `[🎯 ${getName(match, match.bowler)}](tg://user?id=${match.bowler})`;

  await bot.telegram.sendMessage(
    match.groupId,
    `${bowlerPing}\n\n${randomBowlingPrompt()}`,
    {
      parse_mode: "Markdown",
      ...bowlDMButton()
    }
  );

  try {
    await bot.telegram.sendMessage(
      match.bowler,
      "Send number 1-6 in bot DM."
    );
  } catch (e) {}
}

// ================= TIMER CONTROLLER =================

function startTurnTimer(match, type) {

  match.warning30 = setTimeout(() => {
    if ((type === "bowl" && match.awaitingBowl) ||
        (type === "bat" && match.awaitingBat)) {

      bot.telegram.sendMessage(
        match.groupId,
        `⚠️ ${type === "bowl" ? "Bowler" : "Batter"}: 30 seconds left!`
      );
    }
  }, 30000);

  match.warning10 = setTimeout(() => {
    if ((type === "bowl" && match.awaitingBowl) ||
        (type === "bat" && match.awaitingBat)) {

      bot.telegram.sendMessage(
        match.groupId,
        `⏳ ${type === "bowl" ? "Bowler" : "Batter"}: 10 seconds left!`
      );
    }
  }, 50000);

  match.ballTimer = setTimeout(() => ballTimeout(match), 60000);
}



// ================= SAFE PHASE SETTER =================

function setPhase(match, newPhase) {
  console.log(`PHASE: ${match.phase} → ${newPhase}`);
  match.phase = newPhase;
}





/* ================= START BALL ================= */

async function startBall(match) {

  if (!match) return;

  // 🔥 HARD STOPS
  if (match.phase === "switch") return;
  if (match.currentOver >= match.totalOvers) return;
  if (match.wickets >= match.maxWickets) return;

  // ✅ Stop previous timers
  clearTimers(match);

  // Set phase flags
  match.awaitingBowl = true;
  match.awaitingBat = false;

  // Announce the ball
  await announceBall(match);

  // Start turn timer
  startTurnTimer(match, "bowl");
}



/* ================= HANDLE INPUT ================= */

bot.on("text", async (ctx, next) => {

  // 🔥 Always allow commands first
  if (ctx.message.text.startsWith("/")) {
    return next();
  }

  const match = getMatch(ctx);
  if (!match) return;

  // Only allow numbers during play
  if (match.phase !== "play") return;

  const number = parseInt(ctx.message.text);

  if (isNaN(number) || number < 0 || number > 6) return;




  /* ================= GROUP BATTER INPUT ================= */


  if (ctx.chat.type !== "private") {

    if (match.phase !== "play") return;
    if (!match.awaitingBat) return;

    if (ctx.from.id !== match.striker)
      return ctx.reply("❌ You are not the striker.");

    const text = ctx.message.text.trim();

    if (!/^[0-6]$/.test(text))
      return ctx.reply("❌ Send number between 0-6.");

    match.batNumber = Number(text);
    match.awaitingBat = false;

    clearTimers(match);

    return processBall(match);
  }


  /* ================= PRIVATE BOWLER INPUT ================= */

  if (match.phase !== "play") 
    return ctx.reply("⚠️ No active ball.");

  if (!match.awaitingBowl)
    return ctx.reply("⏳ Not accepting bowl now.");

  if (ctx.from.id !== match.bowler)
    return ctx.reply("❌ You are not the current bowler.");

  const text = ctx.message.text.trim();

  if (!/^[1-6]$/.test(text))
    return ctx.reply("❌ Send number between 1-6.");

  clearTimers(match);

  match.bowlNumber = Number(text);
  match.awaitingBowl = false;
  match.awaitingBat = true;

  

  await ctx.reply("✅ Ball submitted!");

  const batterPing =
    `[🏏 ${getName(match, match.striker)}](tg://user?id=${match.striker})`;

  const ballNumber = `${match.currentOver}.${match.currentBall + 1}`;

  await bot.telegram.sendMessage(
    match.groupId,
    `${batterPing}\n\n${randomBatterPrompt()}\n\n🎱 Ball: ${ballNumber}`,
    { parse_mode: "Markdown" }
  );

  startTurnTimer(match, "bat");
});



/* ================= PROCESS BALL ================= */

async function processBall(match) {


  if (!match || match.ballLocked) return;

  clearTimers(match);   // 🔥 stop timers immediately
  match.ballLocked = true;

  try {

    

    if (match.batNumber === null || match.bowlNumber === null) {
      return;
    }

    const bat = Number(match.batNumber);
    const bowl = Number(match.bowlNumber);

    match.bowlerMissCount = 0;
    match.batterMissCount = 0;

   
    /* ================= HATTRICK BLOCK ================= */

    if (match.wicketStreak === 2 && bat === 0) {

      await bot.telegram.sendMessage(
        match.groupId,
        "🔥 HATTRICK BALL! Batter cannot play 0!"
      );

      match.awaitingBat = true;
      startTurnTimer(match, "bat");
      return;
    }

    /* ================= INIT BATTER ================= */

    if (!match.batterStats[match.striker]) {
      match.batterStats[match.striker] = { runs: 0, balls: 0 };
    }

    match.batterStats[match.striker].balls++;

    /* ================= INIT BOWLER ================= */

    if (!match.bowlerStats[match.bowler]) {
      match.bowlerStats[match.bowler] = {
        balls: 0,
        runs: 0,
        wickets: 0,
        history: []
      };
    }

    match.bowlerStats[match.bowler].balls++;
    match.bowlerStats[match.bowler].history.push(bat);

    /* ================= WICKET ================= */

    if (bat === bowl) {

      match.wickets++;
      match.wicketStreak++;
      match.bowlerStats[match.bowler].wickets++;
      match.currentBall++;

      const lastOver = match.overHistory[match.overHistory.length - 1];
      if (lastOver) lastOver.balls.push("W");

      match.currentPartnershipBalls++;

      /* ================= OVER END CHECK ================= */

      if (match.currentBall === 6) {
        const overEnded = await handleOverCompletion(match);
        if (overEnded) return;
      }

      if (match.wickets >= match.maxWickets) {
        await endInnings(match);
        return;
      }

      /* CHECK OVER END */
    const overEnded = await handleOverCompletion(match);
    if (overEnded) return;

      /* ONLY ASK BATTER IF OVER NOT ENDED */
      match.phase = "new_batter";

      await bot.telegram.sendMessage(
         match.groupId,
         "📢 Send new batter:\n/batter number"
      );
      return;
    }

    /* ================= RUNS (NEGATIVE ALLOWED) ================= */

    match.score += bat;                 // ✅ negative runs allowed
    match.currentOverRuns += bat;
    match.currentPartnershipRuns += bat;
    match.currentPartnershipBalls++;

    match.batterStats[match.striker].runs += bat;
    match.bowlerStats[match.bowler].runs += bat;

    match.currentBall++;

    const lastOver = match.overHistory[match.overHistory.length - 1];
    if (lastOver) lastOver.balls.push(bat);

    match.wicketStreak = 0;

    /* ================= OVER END CHECK (EARLY) ================= */

    if (match.currentBall === 6) {
      const overEnded = await handleOverCompletion(match);
      if (overEnded) return;
    }

    /* ================= PARTNERSHIP MILESTONES ================= */

    if (match.currentPartnershipRuns === 50) {
      await bot.telegram.sendMessage(match.groupId, "🔥 50 Run Partnership!");
    }

    if (match.currentPartnershipRuns === 100) {
      await bot.telegram.sendMessage(match.groupId, "💯 100 Run Partnership!");
    }

    /* ================= COMMENTARY ================= */

    await bot.telegram.sendMessage(
      match.groupId,
      randomLine(bat)
    );

    /* ================= STRIKE ROTATION ================= */

    if ([1, 3, 5, -1, -3, -5].includes(bat)) { // optional: rotate on negative odd
      swapStrike(match);
    }

    /* ================= CHASE CHECK ================= */

    if (
      match.innings === 2 &&
      match.score >= match.firstInningsScore + 1
    ) {
      await endInnings(match);
      return;
    }


    /* ================= NEXT BALL ================= */

    advanceGame(match);

    } catch (err) {
    console.error("processBall error:", err);
  } finally {
    match.ballLocked = false;
    match.batNumber = null;
    match.bowlNumber = null;
  
  }
}


/* ================= END INNINGS ================= */

async function endInnings(match) {

  if (!match) return;

  clearTimers(match);
  match.awaitingBat = false;
  match.awaitingBowl = false;

  /* ================= FIRST INNINGS ================= */

  if (match.innings === 1) {

    match.firstInningsScore = match.score;

    match.firstInningsData = {
      ...JSON.parse(JSON.stringify(match)),
      striker: match.striker,
      nonStriker: match.nonStriker
    };

    match.phase = "switch";

   await bot.telegram.sendMessage(
     match.groupId,
     generateScorecard(match)
   );

   return bot.telegram.sendMessage(
     match.groupId,
   `🏁 First Innings Completed

Score: ${match.score}/${match.wickets}
Target: ${match.score + 1}

Host type:
/inningsswitch`
    );
  }


  /* ================= SAVE PLAYER STATS ================= */

  try {

    for (const playerId in match.batterStats) {

      const b = match.batterStats[playerId];

      await updatePlayerStats(playerId, {
        runs: b.runs,
        balls: b.balls,
        inningsBatting: 1
      });

    }

    for (const playerId in match.bowlerStats) {

      const b = match.bowlerStats[playerId];

      await updatePlayerStats(playerId, {
        wickets: b.wickets,
        ballsBowled: b.balls,
        runsConceded: b.runs,
        inningsBowling: 1
      });

    }

    const players = [...match.teamA, ...match.teamB];

    for (const p of players) {
      await updatePlayerStats(p.id, { matches: 1 });
    }

  } catch (err) {
    console.error("Stats update error:", err);
  }
  

  await bot.telegram.sendMessage(
    match.groupId,
    "📊 First Innings Scorecard"
  );

  await bot.telegram.sendMessage(
    match.groupId,
    generateScorecard(match.firstInningsData)
  );

  await bot.telegram.sendMessage(
    match.groupId,
    "📊 Second Innings Scorecard"
  );

  await bot.telegram.sendMessage(
    match.groupId,
    generateScorecard(match)
  );
  /* ================= MATCH RESULT ================= */

  if (match.score > match.firstInningsScore) {
    await endMatchWithWinner(match, match.battingTeam);
  }
  else if (match.score < match.firstInningsScore) {
    await endMatchWithWinner(match, match.bowlingTeam);
  }
  else {
    await endMatchTie(match);
  }

  /* ================= CLEANUP ================= */

  clearActiveMatchPlayers(match);
  matches.delete(match.groupId);
}
/* ================= INNINGS SWITCH ================= */

bot.command("inningsswitch", async (ctx) => {

  const m = getMatch(ctx);

  if (!m || !m.groupId)
    return ctx.reply("⚠️ No active match.");

  if (String(ctx.from.id) !== String(m.host))
    return ctx.reply("❌ Only the match host can switch innings.");

  if (m.innings !== 1)
    return ctx.reply("⚠️ Innings already switched.");

  /* ================= MOVE TO 2ND INNINGS ================= */

  m.innings = 2;

  /* ================= SWAP TEAMS ================= */

  [m.battingTeam, m.bowlingTeam] =
  [m.bowlingTeam, m.battingTeam];

 

  /* ================= RESET MATCH STATE ================= */

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
  m.battingOrder = [];
  m.batterStats = {};
  m.bowlerStats = {};

  m.striker = null;
  m.nonStriker = null;
  m.bowler = null;
  m.lastOverBowler = null;

  m.suspendedBowlers = {};

  m.overHistory = [];
  m.currentOverBalls = [];

  m.awaitingBat = false;
  m.awaitingBowl = false;

  m.phase = "set_striker";

  return ctx.reply(
`🔁 Innings Switched Successfully!

🏏 Now Batting: ${
  m.battingTeam === "A"
    ? m.teamAName
    : m.teamBName
}
🎯 Target: ${m.firstInningsScore + 1}

Set STRIKER:
/batter number`
  );

});
/* ================= MATCH RESULT ================= */

async function endMatchWithWinner(match, winningTeam) {


  const teamName =
    winningTeam === "A"
      ? `${match.teamAName} (A)`
      : `${match.teamBName} (B)`;

  await bot.telegram.sendMessage(
    match.groupId,
`🏆 MATCH RESULT

${teamName} WON THE MATCH!

Final Score:
${match.score}/${match.wickets}`
  );

  clearTimers(match);
  matches.delete(match.groupId);
}

async function endMatchTie(match) {

  await bot.telegram.sendMessage(
    match.groupId,
`🤝 MATCH TIED!

Both teams scored ${match.score}`
  );

  clearTimers(match);
  matches.delete(match.groupId);
}

(async () => {

  await initializeApp();
  await initializeBot();

  registerStartHandler(bot);
  registerStatsHandler(bot);

  await bot.launch();
  console.log("🚀 Bot started successfully");

})();


/* ================= BOT SAFETY ================= */

bot.catch((err, ctx) => {
  console.error("🤖 BOT ERROR:");
  console.error("Update Type:", ctx?.updateType);
  console.error("From:", ctx?.from?.id);
  console.error("Error:", err);
});

bot.use(async (ctx, next) => {
  if (ctx.callbackQuery) {
    try { 
      await ctx.answerCbQuery(); 
    } catch {}
  }
  return next();
});




/* ================= PROCESS HANDLERS ================= */

process.once("SIGINT", () => {
  console.log("🛑 SIGINT received");
  bot.stop("SIGINT");
})                                                                                                                 

process.once("SIGTERM", () => {
  console.log("🛑 SIGTERM received");
  bot.stop("SIGTERM");
});

process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
});