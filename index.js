require("dotenv").config();

const User = require("./User"); 
const { Telegraf, Markup } = require("telegraf");
const initializeApp = require("./config/appInit");
const { bot, initializeBot } = require("./config/bot");

const registerStartHandler = require("./handlers/startHandler");
const registerStatsHandler = require("./handlers/statsHandler");
const updatePlayerStats = require("./utils/updateStats");
const PlayerStats = require("./models/PlayerStats");
const generateScorecard = require("./utils/scorecardGenerator");
const matchResult       = require("./utils/matchResult");
const box               = require("./utils/boxMessage");
const ballHandler       = require("./utils/ballHandler");
const { sendAndPinPlayerList } = require("./commands/captainCommands");

const {
  randomLine,
  randomGif,
  getBowlingCall,
  getBattingCall,
  getCountdownCall,
  getRandomTeams,
  randomMilestoneLine
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

/* ================= DELAY TIMER SYSTEM ================= */

const POOL_MS  = 5 * 60 * 1000;  // 5 min pool per innings per team
const EXTRA_MS = 5 * 60 * 1000;  // 5 min extra per team per match
const EVENT_MS = 5 * 60 * 1000;  // 5 min per-event (over/wicket)

function msToMin(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

function initTimerState(match) {
  // reset pool for new innings — extraUsed carries across innings (per team per match)
  clearDelayTimers(match);
  match.poolRemaining   = POOL_MS;
  match.poolTimerStart  = null;
  match.poolTimerActive = false;
  match.eventTimer      = null;
  match.poolTimer       = null;
  match.extraTimer      = null;
}

function clearDelayTimers(match) {
  if (!match) return;
  if (match.eventTimer) { clearTimeout(match.eventTimer); match.eventTimer = null; }
  if (match.poolTimer)  { clearTimeout(match.poolTimer);  match.poolTimer  = null; }
  if (match.extraTimer) { clearTimeout(match.extraTimer); match.extraTimer = null; }
  // if pool was running, save consumed ms
  if (match.poolTimerActive && match.poolTimerStart) {
    const consumed = Date.now() - match.poolTimerStart;
    match.poolRemaining = Math.max(0, (match.poolRemaining || POOL_MS) - consumed);
    match.poolTimerStart  = null;
    match.poolTimerActive = false;
  }
}

async function startDelayTimer(match, type) {
  clearDelayTimers(match);

  const delayedTeam = type === "bowler" ? match.bowlingTeam : match.battingTeam;

  // ── Per-event 5 min ──
  match.eventTimer = setTimeout(async () => {
    match.eventTimer = null;
    const phase = type === "bowler" ? "set_bowler" : "new_batter";
    if (match.phase !== phase || match.inningsEnded) return;

    const poolLeft = match.poolRemaining || POOL_MS;
    await bot.telegram.sendMessage(match.groupId,
`⚠️ 5 min event time up — no ${type} set!
⏳ Team innings pool starting: ${msToMin(poolLeft)} remaining.
👉 /${type === "bowler" ? "bowler [number]" : "batter [number]"}`
    );

    if (poolLeft <= 0) {
      // pool already empty — go straight to extra or forfeit
      await handlePoolExhausted(match, type, delayedTeam);
      return;
    }

    // ── Pool timer ──
    match.poolTimerStart  = Date.now();
    match.poolTimerActive = true;

    match.poolTimer = setTimeout(async () => {
      match.poolTimer       = null;
      match.poolTimerActive = false;
      if (match.phase !== phase || match.inningsEnded) return;
      match.poolRemaining = 0;
      await handlePoolExhausted(match, type, delayedTeam);
    }, poolLeft);

  }, EVENT_MS);
}

async function handlePoolExhausted(match, type, delayedTeam) {
  const phase = type === "bowler" ? "set_bowler" : "new_batter";
  if (match.phase !== phase || match.inningsEnded) return;

  if (!match.extraUsed) match.extraUsed = { A: false, B: false };

  if (!match.extraUsed[delayedTeam]) {
    // Grant one-time 5 min extra for this team
    match.extraUsed[delayedTeam] = true;
    await bot.telegram.sendMessage(match.groupId,
`🚨 Team pool exhausted!
⚠️ One-time 5 min extra granted to 〔Team ${delayedTeam}〕
⛔ This is the FINAL chance — opposition wins if time runs out!
👉 /${type === "bowler" ? "bowler [number]" : "batter [number]"}`
    );

    match.extraTimer = setTimeout(async () => {
      match.extraTimer = null;
      if (match.phase !== phase || match.inningsEnded) return;
      await declareTimeout(match, delayedTeam);
    }, EXTRA_MS);

  } else {
    // Extra already used — opposition wins immediately
    await declareTimeout(match, delayedTeam);
  }
}

async function declareTimeout(match, timedOutTeam) {
  if (match.inningsEnded || match.matchEnded) return;
  match.matchEnded = true;

  const winningTeam = timedOutTeam === "A" ? "B" : "A";
  const winningName = winningTeam === "A" ? match.teamAName : match.teamBName;
  const losingName  = timedOutTeam === "A" ? match.teamAName : match.teamBName;

  clearDelayTimers(match);
  clearTimers(match);

  await bot.telegram.sendMessage(
    match.groupId,
`⏱ Time Out!\n\n<blockquote>〔Team ${timedOutTeam}〕 ${losingName} failed to respond in time.</blockquote>\n\n<blockquote>🏆 〔Team ${winningTeam}〕 ${winningName} wins!</blockquote>`,
      { parse_mode: "HTML" }
  );

  clearActiveMatchPlayers(match);
  matches.delete(match.groupId);
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


// ── Send a GIF/video + text message together ──
// BAAC = video (0x04), CgAC = animation/document (0x0a)
async function sendWithGif(groupId, gifType, text) {
  const fileId = randomGif(gifType);
  if (fileId) {
    try {
      if (fileId.startsWith("BAAC")) {
        await bot.telegram.sendVideo(groupId, fileId, { caption: text, parse_mode: "Markdown" });
      } else {
        await bot.telegram.sendAnimation(groupId, fileId, { caption: text, parse_mode: "Markdown" });
      }
      return;
    } catch (e) {
      console.error("sendWithGif failed:", e.message);
      await bot.telegram.sendMessage(groupId, text, { parse_mode: "Markdown" });
    }
  } else {
    await bot.telegram.sendMessage(groupId, text, { parse_mode: "Markdown" });
  }
}
async function advanceGame(match) {
  if (!match) return;
  if (match.phase === "switch") return;
  if (match.inningsEnded) return;
  if (match.wickets >= match.maxWickets) { await matchResult.endInnings(match); return; }
  if (match.currentOver >= match.totalOvers) { await matchResult.endInnings(match); return; }
  await ballHandler.startBall(match);
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
  if (!match) return false;
  if (match.currentBall < 6) return false;
  if (match.inningsEnded) return true;

  match.currentOver++;
  match.currentBall = 0;
  match.currentOverRuns = 0;
  match.wicketStreak = 0;
  match.awaitingBat = false;
  match.awaitingBowl = false;

  if (match.currentOver >= match.totalOvers) {
    clearTimers(match);
    await matchResult.endInnings(match);
    return true;
  }

  try {
    await bot.telegram.sendMessage(match.groupId, generateScorecard(match, getName), { parse_mode: "HTML" });
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
`✅ Over ${match.currentOver} Complete\n\n<blockquote>📊 ${match.score}/${match.wickets}   ⚙️ ${match.currentOver}/${match.totalOvers} ov   📈 ${rr}</blockquote>\n\n👉 /bowler [number] new bowler`,
      { parse_mode: "HTML" }
    );
  } catch (e) { console.error("Over message failed:", e.message); }

  // ── Start 5 min event timer for bowler selection ──
  await startDelayTimer(match, "bowler");

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

matchResult.init({ bot, getName, clearTimers, clearActiveMatchPlayers, initTimerState, getCountdownCall });
ballHandler.init({
  bot, getName, clearTimers, swapStrike, sendWithGif,
  battingPlayers, checkOverEnd, advanceGame,
  endInnings: (m) => matchResult.endInnings(m),
  bowlDMButton, startDelayTimer
});

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
    return ctx.reply(`❌ Choose between 1 and ${players.length}`);

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

    if (match.maxWickets == null) {
      match.maxWickets =
        (match.battingTeam === "A" ? match.teamA.length : match.teamB.length) - 1;
    }

    match.striker = selected.id;
    match.batterStats[selected.id] = { runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0 };

    if (!match.battingOrder.includes(selected.id))
      match.battingOrder.push(selected.id);

    match.usedBatters.push(selected.id);
    match.phase = "set_non_striker";

    await sendAndPinPlayerList(match, ctx.telegram);

    return ctx.reply(
`🏏 Striker Set\n\n<blockquote>🏏 ${name}   ${ordinal(orderNumber)} batter</blockquote>\n\n👉 /batter [number] set non-striker`,
      { parse_mode: "HTML" }
    );
  }

  /* NON STRIKER */
  if (match.phase === "set_non_striker") {

    if (selected.id === match.striker)
      return ctx.reply("⚠️ Choose a different player");

    match.nonStriker = selected.id;
    match.usedBatters.push(selected.id);
    match.phase = "set_bowler";
    await sendAndPinPlayerList(match, ctx.telegram);

    return ctx.reply(
`🪄 Non-Striker Set\n\n<blockquote>🪄 ${name}   ${ordinal(orderNumber)} batter</blockquote>\n\n👉 /bowler [number] set bowler`,
      { parse_mode: "HTML" }
    );
  }

  /* NEW BATTER */
  if (match.phase === "new_batter") {

    if (selected.id === match.nonStriker)
      return ctx.reply("⚠️ Choose a different player");

    match.striker = selected.id;
    match.batterStats[selected.id] = { runs: 0, balls: 0, fours: 0, fives: 0, sixes: 0 };
    if (!match.battingOrder.includes(selected.id))
      match.battingOrder.push(selected.id);
    match.usedBatters.push(selected.id);
    await sendAndPinPlayerList(match, ctx.telegram);
    match.phase = "play";

    // ── Clear delay timers, save pool remaining ──
    clearDelayTimers(match);

    await ctx.reply(
`🏏 New Batter\n\n<blockquote>🏏 ${name}   ${ordinal(orderNumber)} batter</blockquote>`,
      { parse_mode: "HTML" }
    );
    return ballHandler.startBall(match);
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

  // ── Clear delay timers, save pool remaining ──
  clearDelayTimers(match);

  await ctx.reply(
`🏐 Bowler Set\n\n<blockquote>🏐 ${player.name} is bowling</blockquote>`,
      { parse_mode: "HTML" }
  );
  await ballHandler.startBall(match);
});


/* ================= LIVE SCORE ================= */

function getLiveScore(match) {
  if (!match) return "⚠️ No active match.";

  const ballsBowled = (match.currentOver * 6) + match.currentBall;
  const totalBalls  = (match.totalOvers || 0) * 6;
  const ballsLeft   = Math.max(totalBalls - ballsBowled, 0);
  const runRate     = ballsBowled > 0
    ? ((match.score / ballsBowled) * 6).toFixed(2) : "0.00";

  const battingTeamLetter = match.battingTeam;
  const bowlingTeamLetter = match.bowlingTeam;
  const battingTeamName = battingTeamLetter === "A" ? match.teamAName : match.teamBName;
  const bowlingTeamName = bowlingTeamLetter === "A" ? match.teamAName : match.teamBName;

  const st  = match.batterStats?.[match.striker]    || { runs: 0, balls: 0 };
  const nst = match.batterStats?.[match.nonStriker] || { runs: 0, balls: 0 };
  const stSR  = st.balls  > 0 ? ((st.runs  / st.balls)  * 100).toFixed(0) : "0";
  const nstSR = nst.balls > 0 ? ((nst.runs / nst.balls) * 100).toFixed(0) : "0";

  const bwl  = match.bowlerStats?.[match.bowler] || { balls: 0, runs: 0, wickets: 0 };
  const bwlOv = `${Math.floor(bwl.balls / 6)}.${bwl.balls % 6}`;
  const econ  = bwl.balls > 0 ? ((bwl.runs / bwl.balls) * 6).toFixed(2) : "0.00";

  const partRuns  = match.currentPartnershipRuns  || 0;
  const partBalls = match.currentPartnershipBalls || 0;

  const strikerName    = getName(match, match.striker);
  const nonStrikerName = getName(match, match.nonStriker);
  const bowlerName     = getName(match, match.bowler);

  function short(name) {
    return name.length > 10 ? name.substring(0, 9) + "…" : name;
  }

  const currentOverHistory = (match.overHistory || []).find(
    o => o.bowler === match.bowler && o.over === match.currentOver + 1
  );
  const overBalls = currentOverHistory
    ? currentOverHistory.balls.map(x => x === "W" ? "W" : String(x)).join(" ")
    : "-";

  const lines = [
    `📊 Live Score`,
    ``,
    `🏏 ${battingTeamName} (Team ${battingTeamLetter})  batting`,
    `🎯 ${bowlingTeamName} (Team ${bowlingTeamLetter})  bowling`,
    ``,
    `📊 ${match.score}/${match.wickets}   ⚙️ ${match.currentOver}.${match.currentBall}/${match.totalOvers}   📈 ${runRate}`,
  ];

  if (match.innings === 2) {
    const runsNeeded = (match.firstInningsScore + 1) - match.score;
    if (runsNeeded > 0) {
      const rrr = ballsLeft > 0 ? ((runsNeeded / ballsLeft) * 6).toFixed(2) : "-";
      lines.push(`🏹 Need ${runsNeeded} from ${ballsLeft} balls   RRR: ${rrr}`);
    } else {
      lines.push(`✅ Target achieved!`);
    }
  }

  lines.push(
    ``,
    `─── 🏏 Batting ───`,
    `🏏 ${short(strikerName)}  ${st.runs}(${st.balls})  SR:${stSR}`,
    `🪄 ${short(nonStrikerName)}  ${nst.runs}(${nst.balls})  SR:${nstSR}`,
    `🤝 Partnership: ${partRuns}(${partBalls})`,
    ``,
    `─── 🎾 Bowling ───`,
    `🎾 ${short(bowlerName)}  ${bwlOv}ov  ${bwl.runs}r  ${bwl.wickets}w  econ:${econ}`,
    `This over: ${overBalls}`
  );

  return lines.join("\n");
}

bot.command("score", async (ctx) => {
  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");
  try {
    await ctx.reply(getLiveScore(match));
  } catch (e) {
    console.error("Score command failed:", e.message);
    await ctx.reply("⚠️ Score error: " + e.message);
  }
});




/* ================= HANDLE INPUT ================= */

bot.on("text", async (ctx, next) => {

  if (ctx.message.text.startsWith("/")) return next();

  const match = getMatch(ctx);
  if (!match) return next();

  const text = ctx.message.text.trim();

 /* GROUP BATTER INPUT */
  if (ctx.chat.type !== "private") {

    const ballInProgress = match.awaitingBowl || match.awaitingBat;
    if (!ballInProgress) return;

    if (ctx.from.id !== match.striker) return;

    if (!/^[0-6]$/.test(text))
      return ctx.reply("❌ Send a number between 0–6.");

    // ✅ BLOCK early batting input
    if (!match.awaitingBat) {
      return ctx.reply("⏳ Wait for bowler to send the ball first.");
    }

    if (match.ballLocked) {
      return ctx.reply("⏳ Processing previous ball — please wait");
    }

    match.batNumber = Number(text);
    match.awaitingBat = false;

    if (match.bowlNumber === null) return;

    match.ballLocked = true;
    clearTimers(match);
    return ballHandler.processBall(match);
  }

  /* PRIVATE BOWLER INPUT */
  if (match.phase !== "play")
    return ctx.reply("⚠️ No active ball.");

  if (!match.awaitingBowl)
    return ctx.reply("⏳ Not accepting bowl now.");

  if (ctx.from.id !== match.bowler)
    return ctx.reply("❌ You are not the current bowler.");

  if (!/^[1-6]$/.test(text))
    return ctx.reply("❌ Send a number between 1–6.");

  clearTimers(match);

  match.bowlNumber = Number(text);
  match.awaitingBowl = false;

  if (match.batNumber !== null) {
    match.awaitingBat = false;
    match.ballLocked = true;
    clearTimers(match);
    await ctx.reply(`✅ Submitted`);
    return ballHandler.processBall(match);
  }

  match.awaitingBat = true;
  match.ballLocked = false;

  await ctx.reply(`✅ Submitted — waiting for batter`);

  const ballNumber = `${match.currentOver}.${match.currentBall + 1}`;

  const battingCall   = getBattingCall();
  const strikerPing   = `<a href="tg://user?id=${match.striker}">&#8203;</a>`;
  const batCaption    = `${strikerPing}🏏  🎱 Ball: ${ballNumber}\n${battingCall.text}`;

  if (battingCall.gif) {
    let gifSent = false;
    try {
      if (battingCall.gif.startsWith("BAAC")) {
        await bot.telegram.sendVideo(match.groupId, battingCall.gif, { caption: batCaption, parse_mode: "HTML" });
      } else {
        await bot.telegram.sendAnimation(match.groupId, battingCall.gif, { caption: batCaption, parse_mode: "HTML" });
      }
      gifSent = true;
    } catch (e) {
      console.error("Batting gif failed:", e.message);
    }
    if (!gifSent) {
      try {
        await bot.telegram.sendMessage(match.groupId, batCaption, { parse_mode: "HTML" });
      } catch (e2) {
        console.error("Batting fallback failed:", e2.message);
      }
    }
  } else {
    try {
      await bot.telegram.sendMessage(match.groupId, batCaption, { parse_mode: "HTML" });
    } catch (e) {
      console.error("Batting text failed:", e.message);
    }
  }
  ballHandler.startTurnTimer(match, "bat");
});






// TEMP: file ID logger — remove after collecting IDs
bot.on(["animation", "video", "document"], async (ctx) => {
  if (ctx.chat.type !== "private") return;
  const msg = ctx.message;
  const fileId =
    msg.animation?.file_id ||
    msg.video?.file_id ||
    msg.document?.file_id;
  const type =
    msg.animation ? "animation" :
    msg.video     ? "video"     : "document";
  console.log(`[GIF LOG] type=${type} file_id=${fileId}`);
  await ctx.reply(`\`${type}\n${fileId}\``, { parse_mode: "Markdown" });
});




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

registerStartHandler(bot);
registerStatsHandler(bot);

(async () => {
  await initializeApp();
  await initializeBot();
  await bot.launch();
  console.log("🚀 Bot started successfully");
})();

process.once("SIGINT",  () => { console.log("🛑 SIGINT received");  bot.stop("SIGINT");  });
process.once("SIGTERM", () => { console.log("🛑 SIGTERM received"); bot.stop("SIGTERM"); });
process.on("unhandledRejection", (err) => { console.error("❌ UNHANDLED REJECTION:", err); });
process.on("uncaughtException",  (err) => { console.error("❌ UNCAUGHT EXCEPTION:",  err); });