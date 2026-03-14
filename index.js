const User = require("./User"); 
const { Telegraf, Markup } = require("telegraf");
const initializeApp = require("./config/appInit");
const { bot, initializeBot } = require("./config/bot");

const registerStartHandler = require("./handlers/startHandler");
const registerStatsHandler = require("./handlers/statsHandler");
const updatePlayerStats = require("./utils/updateStats");
const PlayerStats = require("./models/PlayerStats");
const generateScorecard = require("./utils/scorecardGenerator");
const { sendAndPinPlayerList } = require("./commands/captainCommands");

const {
  randomLine,
  randomBowlingPrompt,
  randomBatterPrompt,
  getRandomTeams
} = require("./commentary");


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

function orderedBattingPlayers(match) {
  if (!match) return [];
  const players = battingPlayers(match);
  const captainId = match.battingTeam === "A" ? match.captains.A : match.captains.B;
  return [
    ...players.filter(p => p.id === captainId),
    ...players.filter(p => p.id !== captainId)
  ];
}

function clearActiveMatchPlayers(match) {
  if (!match) return;
  const allPlayers = [...(match.teamA || []), ...(match.teamB || [])];
  for (const player of allPlayers) {
    if (player?.id) playerActiveMatch.delete(player.id);
  }
}

function getPlayerTeam(match, userId) {
  if (!match) return null;
  if ((match.teamA || []).some(p => p.id === userId)) return "A";
  if ((match.teamB || []).some(p => p.id === userId)) return "B";
  return null;
}

function swapStrike(match) {
  if (!match || !match.striker || !match.nonStriker) return;
  const temp = match.striker;
  match.striker = match.nonStriker;
  match.nonStriker = temp;
}

function getDisplayName(user) {
  if (!user) return "Player";
  if (user.username) return `@${user.username}`;
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
  if (user.first_name) return user.first_name;
  return "Player";
}

function getName(match, id) {
  if (!match) return "Player";
  const all = [...(match.teamA || []), ...(match.teamB || [])];
  const p = all.find(x => x.id === id);
  return p ? p.name : "Player";
}

function clearTimers(match) {
  if (!match) return;
  if (match.warning30) { clearTimeout(match.warning30); match.warning30 = null; }
  if (match.warning10) { clearTimeout(match.warning10); match.warning10 = null; }
  if (match.ballTimer)  { clearTimeout(match.ballTimer);  match.ballTimer  = null; }
}

function bowlDMButton() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎯 Send Ball in DM", url: "https://t.me/Benevolent_Cricket_bot" }]
      ]
    }
  };
}

async function advanceGame(match) {
  if (!match) return;
  if (match.phase === "switch") return;
  if (match.wickets >= match.maxWickets) { await endInnings(match); return; }
  if (match.currentOver >= match.totalOvers) { await endInnings(match); return; }
  await startBall(match);
}

async function handleBallCompletion(match) {
  if (match.currentBall >= 6) {
    const overEnded = await checkOverEnd(match);
    return overEnded;
  }
  await advanceGame(match);
  return false;
}

async function checkOverEnd(match) {
  console.log("checkOverEnd called, ball:", match.currentBall, "over:", match.currentOver);

  if (!match) return false;
  if (match.currentBall < 6) return false;

  match.currentOver++;
  match.currentBall = 0;
  match.currentOverRuns = 0;
  match.wicketStreak = 0;
  match.awaitingBat = false;
  match.awaitingBowl = false;

  console.log("Over ended, new over:", match.currentOver, "totalOvers:", match.totalOvers);

  if (match.currentOver >= match.totalOvers) {
    clearTimers(match);
    await endInnings(match);
    return true;
  }

  try {
    await bot.telegram.sendMessage(match.groupId, generateScorecard(match));
  } catch (e) { console.error("Scorecard failed:", e.message); }

  match.lastOverBowler = match.bowler;
  match.bowler = null;
  swapStrike(match);
  match.phase = "set_bowler";

  const rr = match.currentOver > 0
    ? (match.score / (match.currentOver * 6) * 6).toFixed(2)
    : "0.00";

  try {
    await bot.telegram.sendMessage(
      match.groupId,
`✅ Over \`${match.currentOver}\` complete
──────────────
📊 \`${match.score}/${match.wickets}\`  (\`${match.currentOver}/${match.totalOvers}\` ov)
📈 RR \`${rr}\`
──────────────
👉 /bowler [number] new bowler`
    );
  } catch (e) { console.error("Over message failed:", e.message); }

  return true;
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

  if (isNaN(num)) return ctx.reply("❌ Usage: /batter 2");
  if (num < 1 || num > players.length)
    return ctx.reply(`❌ Choose between \`1\` and \`${players.length}\``);

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
    await sendAndPinPlayerList(match, ctx.telegram);

    return ctx.reply(
`🏏 Striker set
──────────────
${name} · \`${ordinal(orderNumber)}\`
──────────────
👉 /batter [number] set non-striker`
    );
  }

  /* NON STRIKER */
  if (match.phase === "set_non_striker") {

    if (selected.id === match.striker)
      return ctx.reply("⚠️ Choose a different player");

    match.nonStriker = selected.id;
    match.usedBatters.push(selected.id);
    match.maxWickets = battingPlayers(match).length - 1;
    match.phase = "set_bowler";
    await sendAndPinPlayerList(match, ctx.telegram);

    return ctx.reply(
`🏏 Non-striker set
──────────────
${name} · \`${ordinal(orderNumber)}\`
──────────────
👉 /bowler [number] set bowler`
    );
  }

  /* NEW BATTER */
  if (match.phase === "new_batter") {

    if (selected.id === match.nonStriker)
      return ctx.reply("⚠️ Choose a different player");

    match.striker = selected.id;
    match.batterStats[selected.id] = { runs: 0, balls: 0 };
    if (!match.battingOrder.includes(selected.id))
      match.battingOrder.push(selected.id);
    match.usedBatters.push(selected.id);
    await sendAndPinPlayerList(match, ctx.telegram);
    match.phase = "play";

    await ctx.reply(`🏏 ${name} is the new batter · \`${ordinal(orderNumber)}\``);
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
  if (isNaN(num)) return ctx.reply("❌ Usage: /bowler 2");

  const base = bowlingPlayers(match);
  const captainId = match.bowlingTeam === "A" ? match.captains.A : match.captains.B;
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
  match.phase = "play";
  playerActiveMatch.set(player.id, match.groupId);

  await ctx.reply(`🎯 \`${player.name}\` is bowling — ball starting...`);
  await startBall(match);
});


/* ================= LIVE SCORE ================= */

function getLiveScore(match) {
  if (!match) return "⚠️ No active match.";

  const overs       = `${match.currentOver}.${match.currentBall}`;
  const ballsBowled = (match.currentOver * 6) + match.currentBall;
  const totalBalls  = (match.totalOvers || 0) * 6;
  const ballsLeft   = Math.max(totalBalls - ballsBowled, 0);
  const runRate     = ballsBowled > 0
    ? ((match.score / ballsBowled) * 6).toFixed(2) : "0.00";

  let chaseBlock = "";
  if (match.innings === 2) {
    const runsNeeded = (match.firstInningsScore + 1) - match.score;
    const rrr = (runsNeeded > 0 && ballsLeft > 0)
      ? ((runsNeeded / ballsLeft) * 6).toFixed(2) : "-";
    chaseBlock = runsNeeded > 0
      ? `\n🎯 Need \`${runsNeeded}\` from \`${ballsLeft}\` balls  RRR \`${rrr}\``
      : `\n✅ Target achieved!`;
  }

  const st  = match.batterStats?.[match.striker]    || { runs: 0, balls: 0 };
  const nst = match.batterStats?.[match.nonStriker] || { runs: 0, balls: 0 };
  const stSR  = st.balls  > 0 ? ((st.runs  / st.balls)  * 100).toFixed(0) : "0";
  const nstSR = nst.balls > 0 ? ((nst.runs / nst.balls) * 100).toFixed(0) : "0";

  const bwl   = match.bowlerStats?.[match.bowler] || { balls: 0, runs: 0, wickets: 0, history: [] };
  const bwlOv = `${Math.floor(bwl.balls / 6)}.${bwl.balls % 6}`;
  const econ  = bwl.balls > 0 ? ((bwl.runs / bwl.balls) * 6).toFixed(2) : "0.00";
  const dots  = (bwl.history || []).filter(x => x === 0).length;

  const partRuns  = match.currentPartnershipRuns  || 0;
  const partBalls = match.currentPartnershipBalls || 0;

  const ovHistory = match.overHistory?.length
    ? match.overHistory.map((o, i) => `  ${i + 1}: ${o.balls.join(" ")}`).join("\n")
    : "  Yet to start";

  const strikerName    = getName(match, match.striker);
  const nonStrikerName = getName(match, match.nonStriker);
  const bowlerName     = getName(match, match.bowler);

  const battingTeamName = match.battingTeam === "A" ? match.teamAName : match.teamBName;
  const bowlingTeamName = match.bowlingTeam === "A" ? match.teamAName : match.teamBName;

  return (
`\`\`\`
${battingTeamName} vs ${bowlingTeamName}
──────────────
${match.score}/${match.wickets}  (${overs}/${match.totalOvers} ov)  RR ${runRate}
\`\`\`` +
(chaseBlock ? `\n${chaseBlock}` : "") +
`
──────────────
🏏 Batting
⭐ ${strikerName}  \`${st.runs}(${st.balls})\`  SR \`${stSR}\`
   ${nonStrikerName}  \`${nst.runs}(${nst.balls})\`  SR \`${nstSR}\`
🤝 Partnership \`${partRuns}(${partBalls})\`
──────────────
🎯 ${bowlerName}  \`${bwlOv}-${dots}-${bwl.runs}-${bwl.wickets}\`  Econ \`${econ}\`
──────────────
Over history
${ovHistory}`
  );
}

bot.command("score", async (ctx) => {
  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");
  await ctx.reply(getLiveScore(match));
});


/* ================= BALL TIMEOUT ================= */

async function ballTimeout(match) {

  if (!match || match.phase === "idle") return;
  if (match.phase !== "play") return;
  if (match.ballLocked) return;
  match.ballLocked = true;

  try {
    clearTimers(match);

    /* BOWLER MISSED */
    if (match.awaitingBowl) {

      match.awaitingBowl = false;
      match.bowlerMissCount = (match.bowlerMissCount || 0) + 1;
      match.score += 6;

      await bot.telegram.sendMessage(
        match.groupId,
`⏱ Bowler timed out
\`+6\` runs to batting team · ball doesn't count`
      );

      if (match.bowlerMissCount >= 2) {

        match.bowlerMissCount = 0;
        if (!match.suspendedBowlers) match.suspendedBowlers = {};
        match.suspendedBowlers[match.bowler] = match.currentOver + 1;
        match.phase = "set_bowler";

        await bot.telegram.sendMessage(
          match.groupId,
`🚫 Bowler suspended
──────────────
Consecutive delays · cannot bowl this over or next
──────────────
👉 /bowler [number] new bowler`
        );
        return;
      }

      if (await checkOverEnd(match)) return;
      await advanceGame(match);
      return;
    }

    /* BATTER MISSED */
    if (match.awaitingBat) {

      match.awaitingBat = false;
      match.batterMissCount = (match.batterMissCount || 0) + 1;

      match.currentBall++;
      match.score -= 6;

      if (!match.batterStats[match.striker])
        match.batterStats[match.striker] = { runs: 0, balls: 0 };

      match.batterStats[match.striker].runs -= 6;
      match.batterStats[match.striker].balls++;
      match.currentPartnershipRuns -= 6;
      match.currentPartnershipBalls++;

      await bot.telegram.sendMessage(
        match.groupId,
`⏱ Batter timed out
\`-6\` run penalty · ball counted`
      );

      if (match.batterMissCount >= 2) {

        match.batterMissCount = 0;
        match.wickets++;

        await bot.telegram.sendMessage(
          match.groupId, `💥 Batter dismissed — consecutive delays`
        );

        if (match.wickets >= match.maxWickets) {
          await endInnings(match);
          return;
        }

        match.phase = "new_batter";
        await bot.telegram.sendMessage(
          match.groupId,
`💥 Wicket!
──────────────
👉 /batter [number] new batter`
        );
        return;
      }

      if (await checkOverEnd(match)) return;
      await advanceGame(match);
      return;
    }

  } catch (err) {
    console.error("ballTimeout error:", err);
  } finally {
    match.ballLocked = false;
    match.batNumber = null;
    match.bowlNumber = null;
  }
}


/* ================= ANNOUNCE BALL ================= */

// FIX 1 — Remove startTurnTimer from inside announceBall (let startBall own the timer)
async function announceBall(match) {
  if (!match || !match.bowler || !match.striker) return;
  if (match.phase === "switch") return;

  clearTimers(match);

  match.batNumber = null;
  match.bowlNumber = null;
  match.ballLocked = false;
  match.processingBall = false;
  match.awaitingBowl = true;
  match.awaitingBat = false;

  const bowlerName = getName(match, match.bowler);

  await bot.telegram.sendMessage(
    match.groupId,
    `[🎯 ${bowlerName}](tg://user?id=${match.bowler})`,
    { parse_mode: "Markdown" }
  );

  await bot.telegram.sendMessage(
    match.groupId,
    randomBowlingPrompt(),
    bowlDMButton()
  );

  try {
    await bot.telegram.sendMessage(
      match.bowler,
`🎯 Your turn
──────────────
Send your number \`1 – 6\``
    );
  } catch (e) {
    console.log("Bowler DM failed:", e.message);
  }
  // ✅ REMOVED startTurnTimer from here — startBall handles it
}

/* ================= TIMER CONTROLLER ================= */

function startTurnTimer(match, type) {

  match.warning30 = setTimeout(() => {
    if ((type === "bowl" && match.awaitingBowl) ||
        (type === "bat"  && match.awaitingBat)) {
      bot.telegram.sendMessage(
        match.groupId,
        `⏳ ${type === "bowl" ? "Bowler" : "Batter"} — \`30s\` left`
      );
    }
  }, 30000);

  match.warning10 = setTimeout(() => {
    if ((type === "bowl" && match.awaitingBowl) ||
        (type === "bat"  && match.awaitingBat)) {
      bot.telegram.sendMessage(
        match.groupId,
        `🚨 ${type === "bowl" ? "Bowler" : "Batter"} — \`10s\` left`
      );
    }
  }, 50000);

  match.ballTimer = setTimeout(() => ballTimeout(match), 60000);
}


/* ================= START BALL ================= */

async function startBall(match) {
  if (!match) return;
  if (match.phase === "switch") return;
  if (match.phase === "set_bowler") return;
  if (match.phase === "new_batter") return;
  if (match.currentOver >= match.totalOvers) return;
  if (match.wickets >= match.maxWickets) return;

  if (!match.overHistory) match.overHistory = [];
  if (match.bowler) {
    const lastEntry = match.overHistory[match.overHistory.length - 1];
    if (!lastEntry || lastEntry.over !== match.currentOver + 1) {
      match.overHistory.push({ over: match.currentOver + 1, bowler: match.bowler, balls: [] });
    }
  }

  clearTimers(match);
  match.phase = "play";
  match.awaitingBowl = true;
  match.awaitingBat = false;
  await announceBall(match);
  startTurnTimer(match, "bowl");
}


/* ================= HANDLE INPUT ================= */

bot.on("text", async (ctx) => {

  if (ctx.message.text.startsWith("/")) return;

  const match = getMatch(ctx);
  if (!match) return;

  const text = ctx.message.text.trim();

  /* GROUP BATTER INPUT */
  if (ctx.chat.type !== "private") {

    // Accept during bowl wait OR bat wait — batter can send early
    const ballInProgress = match.awaitingBowl || match.awaitingBat;
    if (!ballInProgress) return;

    if (ctx.from.id !== match.striker)
      return ctx.reply("❌ You are not the striker.");

    if (!/^[0-6]$/.test(text))
      return ctx.reply("❌ Send a number between `0–6`.");

    // Ignore duplicate submissions
    if (match.batNumber !== null || match.ballLocked) return;

    match.batNumber = Number(text);
    match.awaitingBat = false;

    // Bowler hasn't sent yet — store and wait, bowler side will call processBall
    if (match.bowlNumber === null) {
      await ctx.reply("✅ Shot queued — waiting for bowler");
      return;
    }

    // Both numbers ready — batter sent after bowler
    // Both numbers ready — batter sent after bowler
    if (match.ballLocked) {
      await ctx.reply("⏳ Processing previous ball — please wait");
      return;
    }
    match.ballLocked = true;

    clearTimers(match);
    return processBall(match);
  }

  /* PRIVATE BOWLER INPUT */
  if (match.phase !== "play")
    return ctx.reply("⚠️ No active ball.");

  if (!match.awaitingBowl)
    return ctx.reply("⏳ Not accepting bowl now.");

  if (ctx.from.id !== match.bowler)
    return ctx.reply("❌ You are not the current bowler.");

  if (!/^[1-6]$/.test(text))
    return ctx.reply("❌ Send a number between `1–6`.");

  clearTimers(match);

  match.bowlNumber = Number(text);
  match.awaitingBowl = false;

  // Batter already submitted before bowler — process immediately
  if (match.batNumber !== null) {
    match.awaitingBat = false;
    match.ballLocked = true;  // force lock regardless of previous state
    clearTimers(match);
    await ctx.reply(`✅ Submitted`);
    return processBall(match);
  }

  // Normal flow — wait for batter
  match.awaitingBat = true;
  match.ballLocked = false;

  await ctx.reply(`✅ Submitted — waiting for batter`);

  const ballNumber = `${match.currentOver}.${match.currentBall + 1}`;

  await bot.telegram.sendMessage(
    match.groupId,
    `[🏏 ${getName(match, match.striker)}](tg://user?id=${match.striker})  🎱 Ball: \`${ballNumber}\``,
    { parse_mode: "Markdown" }
  );

  await bot.telegram.sendMessage(match.groupId, randomBatterPrompt());
  startTurnTimer(match, "bat");
});


/* ================= PROCESS BALL ================= */

async function processBall(match) {
  if (!match) return;
  if (match.batNumber === null || match.bowlNumber === null) return;

  clearTimers(match);



  try {
    const bat  = parseInt(match.batNumber);
    const bowl = parseInt(match.bowlNumber);

    /* HATTRICK BLOCK */
    if (match.wicketStreak === 2 && bat === 0) {
      await bot.telegram.sendMessage(
        match.groupId,
`⚠️ Hattrick ball — cannot play \`0\`
Two wickets in a row!`
      );
      } finally {
    match.batNumber = null;
    if (!match.awaitingBat) match.bowlNumber = null; 
    match.ballLocked = false;
    match.processingBall = false;
  }

    match.bowlerMissCount = 0;
    match.batterMissCount = 0;

    if (!match.batterStats[match.striker])
      match.batterStats[match.striker] = { runs: 0, balls: 0 };
    match.batterStats[match.striker].balls++;

    if (!match.bowlerStats[match.bowler])
      match.bowlerStats[match.bowler] = { balls: 0, runs: 0, wickets: 0, history: [] };
    match.bowlerStats[match.bowler].balls++;
    match.bowlerStats[match.bowler].history.push(bat);

    /* WICKET */
    if (bat === bowl) {

      match.wickets++;
      match.wicketStreak++;
      match.currentBall++;
      match.currentPartnershipBalls++;
      match.bowlerStats[match.bowler].wickets++;

      const lastOver = match.overHistory[match.overHistory.length - 1];
      if (lastOver) lastOver.balls.push("W");

      match.currentPartnershipRuns = 0;
      match.currentPartnershipBalls = 0;

      await bot.telegram.sendMessage(match.groupId, randomLine("wicket"));

      if (match.wickets >= match.maxWickets) {
        await endInnings(match);
        return;
      }

      if (match.currentBall >= 6) {
        const overEnded = await checkOverEnd(match);
        if (overEnded) return;
      }

      match.phase = "new_batter";
      match.awaitingBowl = false;
      match.awaitingBat = false;

      await bot.telegram.sendMessage(
        match.groupId,
`💥 Wicket!
──────────────
👉 /batter [number] new batter`
      );
      return;
    }

    /* RUNS */
    match.score += bat;
    match.currentOverRuns += bat;
    match.currentPartnershipRuns += bat;
    match.currentPartnershipBalls++;
    match.batterStats[match.striker].runs += bat;
    match.bowlerStats[match.bowler].runs += bat;
    match.currentBall++;

    const lastOver = match.overHistory[match.overHistory.length - 1];
    if (lastOver) lastOver.balls.push(bat);

    match.wicketStreak = 0;

    if (match.currentPartnershipRuns === 50)
      await bot.telegram.sendMessage(match.groupId, `🔥 \`50\`-run partnership!`);
    else if (match.currentPartnershipRuns === 100)
      await bot.telegram.sendMessage(match.groupId, `💯 \`100\`-run partnership!`);

    await bot.telegram.sendMessage(match.groupId, randomLine(bat));

    if ([1, 3, 5].includes(bat)) swapStrike(match);

    if (match.innings === 2 && match.score >= match.firstInningsScore + 1) {
      await endInnings(match);
      return;
    }

    const overEnded = await handleBallCompletion(match);
    if (overEnded) return;

  } catch (err) {
    console.error("processBall error:", err);

  } finally {
    match.batNumber = null;
    match.bowlNumber = null;
    match.ballLocked = false;
    match.processingBall = false;
  }
}


/* ================= END INNINGS ================= */

async function endInnings(match) {

  if (!match) return;
  if (match.inningsEnded) return;
  match.inningsEnded = true;

  clearTimers(match);
  match.awaitingBat = false;
  match.awaitingBowl = false;

  /* FIRST INNINGS */
  if (match.innings === 1) {

    match.firstInningsScore = match.score;
    match.firstInningsData = JSON.parse(JSON.stringify(match));

    await bot.telegram.sendMessage(match.groupId, generateScorecard(match));

    await bot.telegram.sendMessage(
      match.groupId,
`✅ Innings 1 complete
──────────────
📊 \`${match.score}/${match.wickets}\`
🎯 Target \`${match.score + 1}\`
⚙️ \`${match.currentOver}/${match.totalOvers}\` overs
──────────────
🔄 Switching innings...`
    );

    // ✅ Auto switch — no manual command needed
    match.innings = 2;
    match.target = match.firstInningsScore + 1;
    match.ballLocked = false;

    [match.battingTeam, match.bowlingTeam] = [match.bowlingTeam, match.battingTeam];

    match.score = 0; match.wickets = 0; match.inningsEnded = false;
    match.maxWickets = battingPlayers(match).length - 1;
    match.currentOver = 0; match.currentBall = 0; match.currentOverNumber = 0;
    match.currentPartnershipRuns = 0; match.currentPartnershipBalls = 0;
    match.currentOverRuns = 0; match.wicketStreak = 0;
    match.bowlerMissCount = 0; match.batterMissCount = 0;
    match.usedBatters = []; match.battingOrder = [];
    match.batterStats = {}; match.bowlerStats = {};
    match.striker = null; match.nonStriker = null;
    match.bowler = null; match.lastOverBowler = null;
    match.suspendedBowlers = {};
    match.overHistory = []; match.currentOverBalls = [];
    match.awaitingBat = false; match.awaitingBowl = false;
    match.phase = "set_striker";

    await sendAndPinPlayerList(match, bot.telegram);

    return bot.telegram.sendMessage(
      match.groupId,
`🏏 Innings 2
──────────────
🏏 Batting  \`${match.battingTeam === "A" ? match.teamAName : match.teamBName}\`
🎯 Target  \`${match.firstInningsScore + 1}\`
──────────────
👉 /batter [number] set opener`
    );
  }

  /* SAVE PLAYER STATS */
  try {
    for (const playerId in match.batterStats) {
      const b = match.batterStats[playerId];
      await updatePlayerStats(playerId, { runs: b.runs, balls: b.balls, inningsBatting: 1 });
    }
    for (const playerId in match.bowlerStats) {
      const b = match.bowlerStats[playerId];
      await updatePlayerStats(playerId, {
        wickets: b.wickets, ballsBowled: b.balls, runsConceded: b.runs, inningsBowling: 1
      });
    }
    for (const p of [...match.teamA, ...match.teamB])
      await updatePlayerStats(p.id, { matches: 1 });
  } catch (err) {
    console.error("Stats update error:", err);
  }

  await bot.telegram.sendMessage(match.groupId, generateScorecard(match.firstInningsData));
  await bot.telegram.sendMessage(match.groupId, generateScorecard(match));

  if (match.score > match.firstInningsScore) {
    await endMatchWithWinner(match, match.battingTeam);
  } else if (match.score < match.firstInningsScore) {
    await endMatchWithWinner(match, match.bowlingTeam);
  } else {
    await endMatchTie(match);
  }

  clearActiveMatchPlayers(match);
  matches.delete(match.groupId);
}


/* ================= MATCH RESULT ================= */

async function endMatchWithWinner(match, winningTeam) {
  const teamName = winningTeam === "A" ? match.teamAName : match.teamBName;

  let margin = "";
  if (match.innings === 2 && winningTeam === match.battingTeam) {
    const w = match.maxWickets - match.wickets;
    margin = `by \`${w}\` wicket${w !== 1 ? "s" : ""}`;
  } else {
    const r = Math.abs(match.firstInningsScore - match.score);
    margin = `by \`${r}\` run${r !== 1 ? "s" : ""}`;
  }

  await bot.telegram.sendMessage(
    match.groupId,
`🏆 \`${teamName}\` won ${margin}
──────────────
1st innings  \`${match.firstInningsScore}\`
2nd innings  \`${match.score}/${match.wickets}\``
  );

  clearTimers(match);
}

async function endMatchTie(match) {
  await bot.telegram.sendMessage(
    match.groupId,
`🤝 Match tied — both teams scored \`${match.score}\``
  );
  clearTimers(match);
}


/* ================= BOT SAFETY ================= */

bot.catch((err, ctx) => {
  console.error("🤖 BOT ERROR:");
  console.error("Update Type:", ctx?.updateType);
  console.error("From:", ctx?.from?.id);
  console.error("Error:", err);
});

bot.use(async (ctx, next) => {
  if (ctx.callbackQuery) {
    try { await ctx.answerCbQuery(); } catch {}
  }
  return next();
});

(async () => {
  await initializeApp();
  await initializeBot();
  registerStartHandler(bot);
  registerStatsHandler(bot);
  await bot.launch();
  console.log("🚀 Bot started successfully");
})();

process.once("SIGINT",  () => { console.log("🛑 SIGINT received");  bot.stop("SIGINT");  });
process.once("SIGTERM", () => { console.log("🛑 SIGTERM received"); bot.stop("SIGTERM"); });
process.on("unhandledRejection", (err) => { console.error("❌ UNHANDLED REJECTION:", err); });
process.on("uncaughtException",  (err) => { console.error("❌ UNCAUGHT EXCEPTION:",  err); });