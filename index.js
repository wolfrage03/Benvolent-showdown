require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

let match;

function resetMatch() {
  match = {
    phase: "idle",
    host: null,
    groupId: null,

    teamA: [],
    teamB: [],
    captains: { A: null, B: null },

    tossWinner: null,

    battingTeam: null,
    bowlingTeam: null,

    overs: 1,
    currentOver: 1,
    currentBall: 1,

    striker: null,
    nonStriker: null,
    bowler: null,

    score: 0,
    wickets: 0,
    maxWickets: 0,

    innings: 1,
    firstInningsScore: 0,

    awaitingBat: false,
    awaitingBowl: false,
    batNumber: null,
    bowlNumber: null,

    ballTimer: null,
    warning30: null,
    warning10: null
  };
}
resetMatch();

const isHost = id => id === match.host;
const battingPlayers = () =>
  match.battingTeam === "A" ? match.teamA : match.teamB;

function swapStrike() {
  const t = match.striker;
  match.striker = match.nonStriker;
  match.nonStriker = t;
}

function clearTimers() {
  clearTimeout(match.ballTimer);
  clearTimeout(match.warning30);
  clearTimeout(match.warning10);
}

function getName(id) {
  const all = [...match.teamA, ...match.teamB];
  const p = all.find(x => x.id === id);
  return p ? p.first_name : "Player";
}

/* ================= START ================= */

bot.command("start", ctx => {
  if (ctx.chat.type === "private") return;

  resetMatch();
  match.groupId = ctx.chat.id;
  match.phase = "host_select";

  ctx.reply("🏏 Match Starting!\nSelect Host:",
    Markup.inlineKeyboard([
      [Markup.button.callback("Become Host", "select_host")]
    ])
  );
});
 /* ================= END MATCH ================= */

bot.command("endmatch", async (ctx) => {

  // Must be in group
  if (ctx.chat.type === "private")
    return ctx.reply("❌ Use this in group.");

  // Check active match
  if (!match || match.phase === "idle")
    return ctx.reply("⚠️ No active match running.");

  // Check correct group
  if (ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ This match is not running in this group.");

  // Only host allowed
  if (ctx.from.id !== match.host)
    return ctx.reply("❌ Only host can end the match.");

  ctx.reply(
    "⚠️ Are you sure you want to end the match?",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Yes", "confirm_end"),
        Markup.button.callback("❌ No", "cancel_end")
      ]
    ])
  );
});


bot.action("confirm_end", async (ctx) => {

  if (!match || match.phase === "idle")
    return ctx.answerCbQuery("No match running");

  await ctx.editMessageReplyMarkup();

  await ctx.reply("🛑 Match Ended Successfully.");

  resetMatch();
});


bot.action("cancel_end", async (ctx) => {
  await ctx.editMessageReplyMarkup();
  ctx.answerCbQuery("Cancelled");
});

/* ================= HOST ================= */

bot.action("select_host", async ctx => {
  if (match.host)
    return ctx.answerCbQuery("Host already selected");

  match.host = ctx.from.id;
  match.phase = "team_create";

  await ctx.editMessageReplyMarkup();

  ctx.reply(`👑 Host Selected: ${ctx.from.first_name}`);
  ctx.reply("Host use /createteam to create teams.");
});

/* ================= CREATE TEAM ================= */

bot.command("createteam", (ctx) => {
  if (!isHost(ctx.from.id))
    return ctx.reply("❌ Only host can create teams.");

  if (match.phase !== "team_create")
    return ctx.reply("⚠️ Teams already created.");

  match.phase = "join";

  ctx.reply("✅ Teams Created!\n\nPlayers use:\n/joina\n/joinb\n\n⏳ Joining open for 1 minute...");

  setTimeout(() => {
    if (match.phase !== "join") return;

    match.phase = "captain";

    bot.telegram.sendMessage(match.groupId,
`🔒 Joining Closed!

Team A: ${match.teamA.length} players
Team B: ${match.teamB.length} players

Host use /choosecap`
    );

  }, 60000);
});

/* ================= JOIN ================= */

bot.command("joina", ctx => {
  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining is not open.");

  if (ctx.from.id === match.host)
    return ctx.reply("❌ Host cannot join any team.");

  if (match.teamA.find(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ You are already in Team A.");

  if (match.teamB.find(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ You are already in Team B.");

  match.teamA.push(ctx.from);

  ctx.reply(`✅ ${ctx.from.first_name} joined Team A`);
});


bot.command("joinb", ctx => {
  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining is not open.");

  if (ctx.from.id === match.host)
    return ctx.reply("❌ Host cannot join any team.");

  if (match.teamB.find(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ You are already in Team B.");

  if (match.teamA.find(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ You are already in Team A.");

  match.teamB.push(ctx.from);

  ctx.reply(`✅ ${ctx.from.first_name} joined Team B`);
});
/* ================= CAPTAIN ================= */

bot.command("choosecap", ctx => {
  if (!isHost(ctx.from.id))
    return ctx.reply("❌ Only host can start captain selection.");

  match.phase = "captain";

  ctx.reply("🏏 Captain Selection:",
    Markup.inlineKeyboard([
      [Markup.button.callback("👑 Choose Captain - Team A", "cap_A")],
      [Markup.button.callback("👑 Choose Captain - Team B", "cap_B")]
    ])
  );
});


bot.action("cap_A", async ctx => {
  if (match.captains.A)
    return ctx.answerCbQuery("Captain A already selected");

  if (!match.teamA.find(p => p.id === ctx.from.id))
    return ctx.answerCbQuery("Only Team A players allowed");

  match.captains.A = ctx.from.id;

  await ctx.answerCbQuery("Captain A Selected");

  ctx.reply(`👑 ${ctx.from.first_name} is Captain of Team A`);

  updateCaptainButtons(ctx);
});


bot.action("cap_B", async ctx => {
  if (match.captains.B)
    return ctx.answerCbQuery("Captain B already selected");

  if (!match.teamB.find(p => p.id === ctx.from.id))
    return ctx.answerCbQuery("Only Team B players allowed");

  match.captains.B = ctx.from.id;

  await ctx.answerCbQuery("Captain B Selected");

  ctx.reply(`👑 ${ctx.from.first_name} is Captain of Team B`);

  updateCaptainButtons(ctx);
});


function updateCaptainButtons(ctx) {
  const buttons = [];

  if (!match.captains.A)
    buttons.push([Markup.button.callback("👑 Choose Captain - Team A", "cap_A")]);

  if (!match.captains.B)
    buttons.push([Markup.button.callback("👑 Choose Captain - Team B", "cap_B")]);

  if (buttons.length === 0) {
    ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    match.phase = "toss";
    ctx.reply("🎲 Both Captains Selected!\nStarting Toss...");
    startToss();
  } else {
    ctx.editMessageReplyMarkup({ inline_keyboard: buttons });
  }
}
/* ================= PLAYERS LIST ================= */

bot.command("players", (ctx) => {

  if (!match || ctx.chat.id !== match.groupId) {
    return ctx.reply("⚠️ No active match in this group.");
  }

  function formatTeam(teamArray, captainId) {
    if (!teamArray.length) return "No players";

    let list = [];

    // If captain exists, put captain first
    if (captainId) {
      const captain = teamArray.find(p => p.id === captainId);
      if (captain) {
        list.push(`1. 👑 ${captain.first_name} (Captain)`);
      }
    }

    // Add remaining players (excluding captain)
    const others = teamArray.filter(p => p.id !== captainId);

    others.forEach((p, index) => {
      list.push(`${list.length + 1}. ${p.first_name}`);
    });

    return list.join("\n");
  }

  const teamAList = formatTeam(match.teamA, match.captains.A);
  const teamBList = formatTeam(match.teamB, match.captains.B);

  ctx.reply(
`👥 PLAYERS LIST

🔵 Team A:
${teamAList}

🔴 Team B:
${teamBList}`
  );
});
/* ================= TOSS ================= */

function startToss() {

  match.phase = "toss";

  bot.telegram.sendMessage(
    match.groupId,
    "🎲 Toss Time!\nCaptain choose Odd or Even:",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Odd", "toss_odd"),
        Markup.button.callback("Even", "toss_even")
      ]
    ])
  );
}
bot.action(["toss_odd", "toss_even"], async ctx => {

  if (match.phase !== "toss") return;

  const choice = ctx.match[0] === "toss_odd" ? "odd" : "even";

  const tossNumber = Math.floor(Math.random() * 6) + 1;
  const result = tossNumber % 2 === 0 ? "even" : "odd";

  const captainA = match.captains.A;
  const captainB = match.captains.B;

  // The captain who clicked
  const chooser = ctx.from.id;

  // Determine winner
  const tossWinner =
    choice === result
      ? chooser
      : chooser === captainA
        ? captainB
        : captainA;

  match.tossWinner = tossWinner;
  match.phase = "batbowl";

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  const winnerTeam =
    tossWinner === captainA ? "A" : "B";

  bot.telegram.sendMessage(
    match.groupId,
`🎲 Toss Number: ${tossNumber} (${result})

🏆 Toss Winner: Team ${winnerTeam}

Choose Bat or Bowl:`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("🏏 Bat", "decision_bat"),
        Markup.button.callback("🎯 Bowl", "decision_bowl")
      ]
    ])
  );
});
bot.action(["decision_bat", "decision_bowl"], async ctx => {

  if (match.phase !== "batbowl") return;

  if (ctx.from.id !== match.tossWinner)
    return ctx.answerCbQuery("Only toss winner decides");

  const winnerTeam =
    ctx.from.id === match.captains.A ? "A" : "B";

  const otherTeam = winnerTeam === "A" ? "B" : "A";

  const decision = ctx.match[0] === "decision_bat" ? "bat" : "bowl";

  if (decision === "bat") {
    match.battingTeam = winnerTeam;
    match.bowlingTeam = otherTeam;
  } else {
    match.bowlingTeam = winnerTeam;
    match.battingTeam = otherTeam;
  }

  match.innings = 1;
  match.score = 0;
  match.wickets = 0;
  match.currentOver = 1;
  match.currentBall = 1;

  match.phase = "setovers";

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  bot.telegram.sendMessage(
    match.groupId,
`📢 Toss Decision Confirmed

🏏 Team ${match.battingTeam} Batting First
🎯 Team ${match.bowlingTeam} Bowling First

Host set overs:
/setovers 2`
  );
});

/* ================= SET OVERS ================= */

bot.command("setovers", ctx => {
  if (!isHost(ctx.from.id)) return;
  const num = parseInt(ctx.message.text.split(" ")[1]);
  if (!num || num < 1) return;

  match.overs = num;
  match.phase = "set_striker";

  ctx.reply("Overs set.\nHost set striker:\n/setstriker @user");
});
/* ================= SET BATTER BY NUMBER ================= */

bot.command("batter", ctx => {
  if (!isHost(ctx.from.id)) return ctx.reply("❌ Only host can set batter.");
  if (match.phase !== "set_striker" && match.phase !== "play")
    return ctx.reply("⚠️ Cannot set batter now.");

  const num = parseInt(ctx.message.text.split(" ")[1]);
  if (!num) return ctx.reply("Usage: /batter 1");

  const players = battingPlayers();

  if (num < 1 || num > players.length)
    return ctx.reply("❌ Invalid player number.");

  const selected = players[num - 1];

  if (match.striker && selected.id === match.striker)
    return ctx.reply("⚠️ Already striker.");

  match.striker = selected.id;

  const remaining = players.filter(p => p.id !== selected.id);
  match.nonStriker = remaining.length ? remaining[0].id : null;

  match.maxWickets = players.length - 1;

  if (match.phase === "set_striker")
    match.phase = "set_bowler";

  ctx.reply(`🏏 Striker Set: ${selected.first_name}

Now set bowler:
/bowler 1`);
});


/* ================= SET BOWLER BY NUMBER ================= */

bot.command("bowler", ctx => {
  if (!isHost(ctx.from.id)) return ctx.reply("❌ Only host can set bowler.");
  if (match.phase !== "set_bowler" && match.phase !== "play")
    return ctx.reply("⚠️ Cannot set bowler now.");

  const num = parseInt(ctx.message.text.split(" ")[1]);
  if (!num) return ctx.reply("Usage: /bowler 1");

  const bowlingTeamPlayers =
    match.bowlingTeam === "A" ? match.teamA : match.teamB;

  if (num < 1 || num > bowlingTeamPlayers.length)
    return ctx.reply("❌ Invalid player number.");

  const selected = bowlingTeamPlayers[num - 1];

  match.bowler = selected.id;

  if (match.phase === "set_bowler")
    match.phase = "play";

  ctx.reply(`🎯 Bowler Set: ${selected.first_name}

Ball Starting...`);

  startBall();
});

/* ================= START BALL ================= */

function startBall() {
  clearTimers();

  match.awaitingBat = true;
  match.awaitingBowl = true;
  match.batNumber = null;
  match.bowlNumber = null;

  bot.telegram.sendMessage(match.groupId,
`📍 Over ${match.currentOver}.${match.currentBall}
👤 Striker: ${getName(match.striker)}
⏳ 60 seconds to respond.`);

  bot.telegram.sendMessage(match.bowler,
`🎯 Bowl Now
Ball ${match.currentOver}.${match.currentBall}
Send number (1-6)`);

  match.warning30 = setTimeout(() => {
    bot.telegram.sendMessage(match.groupId,"⚠️ 30 seconds left!");
  }, 30000);

  match.warning10 = setTimeout(() => {
    bot.telegram.sendMessage(match.groupId,"⏳ 10 seconds left!");
  }, 50000);

  match.ballTimer = setTimeout(() => {
    bot.telegram.sendMessage(match.groupId,"⌛ Time Up! Ball skipped.");
    nextBall();
  }, 60000);
}

/* ================= HANDLE INPUT ================= */

bot.on("text", ctx => {
  if (match.phase !== "play") return;

  const num = parseInt(ctx.message.text);
  if (isNaN(num)) return;

  if (ctx.chat.id === match.groupId &&
      ctx.from.id === match.striker &&
      match.awaitingBat) {

    if (num < 0 || num > 6) return;
    match.batNumber = num;
    match.awaitingBat = false;
  }

  if (ctx.chat.type === "private" &&
      ctx.from.id === match.bowler &&
      match.awaitingBowl) {

    if (num < 1 || num > 6) return;
    match.bowlNumber = num;
    match.awaitingBowl = false;
  }

  if (!match.awaitingBat && !match.awaitingBowl) {
    clearTimers();
    processBall();
  }
});

/* ================= PROCESS BALL ================= */

function processBall() {
  const bat = match.batNumber;
  const bowl = match.bowlNumber;

  if (bat === bowl) {
    match.wickets++;

    bot.telegram.sendMessage(match.groupId,
`❌ OUT!
Score: ${match.score}/${match.wickets}`);

    if (match.wickets >= match.maxWickets)
      return endInnings();

    return;
  }

  match.score += bat;

  if (bat % 2 !== 0) swapStrike();

  bot.telegram.sendMessage(match.groupId,
`🏏 ${bat} Runs!
Score: ${match.score}/${match.wickets}`);

  if (match.innings === 2 &&
      match.score > match.firstInningsScore)
    return endMatchWithWinner(match.battingTeam);

  nextBall();
}

/* ================= NEXT BALL ================= */

function nextBall() {
  match.currentBall++;

  if (match.currentBall > 6) {
    match.currentBall = 1;
    match.currentOver++;
    swapStrike();

    if (match.currentOver > match.overs)
      return endInnings();

    bot.telegram.sendMessage(match.groupId,
`🔄 Over Completed
Host set new bowler:
/setbowler (reply to user)`);

    return;
  }

  startBall();
}

/* ================= END INNINGS ================= */

function endInnings() {
  bot.telegram.sendMessage(match.groupId,
`🏁 Innings ${match.innings} Finished
Score: ${match.score}/${match.wickets}`);

  if (match.innings === 1) {

    match.firstInningsScore = match.score;
    match.innings = 2;

    match.score = 0;
    match.wickets = 0;
    match.currentOver = 1;
    match.currentBall = 1;

    const temp = match.battingTeam;
    match.battingTeam = match.bowlingTeam;
    match.bowlingTeam = temp;

    match.maxWickets = battingPlayers().length - 1;

    bot.telegram.sendMessage(match.groupId,
`🎯 Target: ${match.firstInningsScore + 1}
Second Innings Starting

Host set striker:
/setstriker (reply to user)`);

    return;
  }

  if (match.score > match.firstInningsScore)
    endMatchWithWinner(match.battingTeam);
  else if (match.score < match.firstInningsScore)
    endMatchWithWinner(match.bowlingTeam);
  else {
    bot.telegram.sendMessage(match.groupId,"🤝 Match Tied!");
    resetMatch();
  }
}

/* ================= DECLARE WINNER ================= */

function endMatchWithWinner(team) {
  bot.telegram.sendMessage(match.groupId,
`🏆 Team ${team} Wins!

Final Score:
Innings 1: ${match.firstInningsScore}
Innings 2: ${match.score}`);

  resetMatch();
}

bot.launch();
console.log("🏏 FULL HAND CRICKET BOT RUNNING...");