

const User = require("./User"); 
const { Telegraf, Markup } = require("telegraf");
const initializeApp = require("./config/appInit");
const { bot, initializeBot } = require("./config/bot");


const registerStartHandler = require("./handlers/startHandler");
const registerStatsHandler = require("./handlers/statsHandler");
const updatePlayerStats = require("./utils/updateStats");
const PlayerStats = require("./models/PlayerStats");


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



function orderedBattingPlayers(match) {

  if (!match) return [];

  const players = battingPlayers(match) || [];

  const captainId =
    match.battingTeam === "A"
      ? match.captains?.A
      : match.captains?.B;

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
  if (!match || !match.striker || !match.nonStriker) return;

  const t = match.striker;
  match.striker = match.nonStriker;
  match.nonStriker = t;
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
// ✅ Pure flow control
function advanceGame(match) {
  if (!match) return;

  if (match.phase === "switch") return;

  if (match.wickets >= match.maxWickets) {
    endInnings(match);
    return;
  }

  if (match.currentOver >= match.totalOvers) {
    endInnings(match);
    return;
  }

  startBall(match);
}



/* ================= MANUAL ADD PLAYER (USERNAME / ID / REPLY) ================= */

bot.command("add", async (ctx) => {

  const match = getMatch(ctx);
  if (!match || ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can add players.");

  const args = ctx.message.text.trim().split(/\s+/);
  if (args.length < 2)
    return ctx.reply("Usage:\n/add A @username\n/add B userID\nReply + /add A");

  const team = args[1].toUpperCase();

  if (!["A","B"].includes(team))
    return ctx.reply("❌ Team must be A or B.");

  let userId;
  let name;

  /* ========= ✅ REPLY METHOD ========= */

  if (ctx.message.reply_to_message) {

    const repliedUser = ctx.message.reply_to_message.from;

    if (repliedUser.is_bot)
      return ctx.reply("❌ Cannot add a bot as player.");

    userId = repliedUser.id;
    name = repliedUser.username
      ? `@${repliedUser.username}`
      : repliedUser.first_name;

  }

  /* ========= ✅ USERNAME / ID METHOD ========= */
  else {

    if (args.length < 3)
      return ctx.reply("Usage:\n/add A @username\n/add B userID\nReply + /add A");

    let input = args[2].trim();

    if (input.startsWith("@")) {

      const username = input.replace("@", "").toLowerCase();

      const user = await User.findOne({ username });

      if (!user)
        return ctx.reply("❌ User not found. Ask them to start bot in DM.");

      userId = Number(user.telegramId);
      name = `@${username}`;

    } 
    else if (!isNaN(input)) {

      userId = Number(input);
      name = `User_${input}`;

    } 
    else {
      return ctx.reply("❌ Invalid format.");
    }
  }

  /* ========= DUPLICATE CHECK ========= */

  if (
    match.teamA?.some(p => p.id === userId) ||
    match.teamB?.some(p => p.id === userId)
  )
    return ctx.reply("⚠️ Player already added.");

  const player = { id: userId, name };

  if (team === "A") match.teamA.push(player);
  else match.teamB.push(player);

  // 🔥 IMPORTANT FIX
  playerActiveMatch.set(userId, match.groupId);

  ctx.reply(`✅ ${name} added to Team ${team}`);
});


/* ================= REMOVE PLAYER ================= */

bot.command("remove", ctx => {

  const match = getMatch(ctx);
  if (!match)
    return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can remove players.");

  const args = ctx.message.text.trim().split(/\s+/);
  if (args.length < 2)
    return ctx.reply("Usage: /remove A1 or B2");

  const arg = args[1];
  const team = arg[0]?.toUpperCase();
  const num = parseInt(arg.slice(1));

  if (!["A","B"].includes(team) || isNaN(num))
    return ctx.reply("Invalid format. Use A1 or B2");

  const teamArr = team === "A" ? match.teamA : match.teamB;

  if (!teamArr || num < 1 || num > teamArr.length)
    return ctx.reply("Player slot not found.");

  const removed = teamArr.splice(num - 1, 1)[0];

  if (!removed)
    return ctx.reply("Player not found.");

  /* remove captain if removed */
  if (match.captains?.[team] === removed.id)
    match.captains[team] = null;

  /* remove from dismissed / used batters */
  if (Array.isArray(match.usedBatters))
    match.usedBatters = match.usedBatters.filter(id => id !== removed.id);

  /* 🔥 IMPORTANT FIX */
  playerActiveMatch.delete(removed.id);

  ctx.reply(`🚫 ${removed.name} removed from Team ${team}`);
});



/* ================= START ================= */

bot.command("start", async (ctx, next) => {

  if (ctx.chat.type === "private") return next();

  let match = getMatch(ctx);

  if (match && match.phase && match.phase !== "idle") {
    return ctx.reply("⚠️ A match is already running.");
  }

  /* SAVE USER */
  try {
    const { id, username, first_name, last_name } = ctx.from;

    await User.updateOne(
      { telegramId: String(id) },
      {
        $set: {
          telegramId: String(id),
          username: username?.toLowerCase(),
          firstName: first_name,
          lastName: last_name
        }
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("User save error:", err);
  }

  match = resetMatch(ctx.chat.id);

  clearActiveMatchPlayers(match);

  match.groupId = ctx.chat.id;
  match.phase = "host_select";

  ctx.reply(
    "🏏 Match Starting!\nSelect Host:",
    Markup.inlineKeyboard([
      [Markup.button.callback("Become Host", "select_host")]
    ])
  );
});


/* ================= END MATCH ================= */

bot.command("endmatch", async (ctx) => {

  const match = getMatch(ctx);

  if (ctx.chat.type === "private")
    return ctx.reply("❌ Use this in group.");

  if (!match || match.phase === "idle")
    return ctx.reply("⚠️ No active match running.");

  if (ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ This match is not running in this group.");

  const member = await ctx.getChatMember(ctx.from.id);
  const isAdmin = ["administrator", "creator"].includes(member.status);

  if (ctx.from.id !== match.host && !isAdmin)
    return ctx.reply("❌ Only host or group admin can end the match.");

  return ctx.reply(
    "⚠️ Are you sure you want to end the match?",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Yes", "confirm_end"),
        Markup.button.callback("❌ No", "cancel_end")
      ]
    ])
  );
});



/* ================= CONFIRM END ================= */

bot.action("confirm_end", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  const member = await ctx.getChatMember(ctx.from.id);
  const isAdmin = ["administrator", "creator"].includes(member.status);

  if (ctx.from.id !== match.host && !isAdmin)
    return ctx.answerCbQuery("Only host/admin can confirm.");

  await ctx.editMessageReplyMarkup();
  await ctx.reply("🛑 Match Ended Successfully.");

  clearTimers(match);
  clearActiveMatchPlayers(match);

  matches.delete(match.groupId);

});

/* ================= CANCEL END ================= */

bot.action("cancel_end", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (ctx.from.id !== match.host)
    return ctx.answerCbQuery("Only host can cancel.");

  await ctx.editMessageReplyMarkup();
  return ctx.answerCbQuery("Cancelled.");
});


/* ================= HOST SELECT ================= */
bot.action("select_host", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) {
    return ctx.answerCbQuery("Match not found.");
  }

  if (match.phase !== "host_select") {
    return ctx.answerCbQuery("Host already selected");
  }

  await ctx.answerCbQuery("You are now the host 👑"); // ✅ IMPORTANT

  match.host = ctx.from.id;
  match.phase = "team_create";

  const selected = getRandomTeams();
  match.teamAName = selected[0];
  match.teamBName = selected[1];

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  await ctx.reply(`👑 Host Selected: ${ctx.from.first_name}`);
  await ctx.reply("Host use /createteam to create teams.");
});


/* ================= HOST CHANGE ================= */

bot.command("changehost", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("No active match.");

  if (ctx.chat.id !== match.groupId)
    return ctx.reply("Use this command in match group.");

  const userId = ctx.from.id;

  if (match.hostChange?.active)
    return ctx.reply("⚠️ Host change voting already active.");

  if (userId === match.host)
    return showHostSelection(match);

  const isPlayer =
    match.teamA.some(p => p.id === userId) ||
    match.teamB.some(p => p.id === userId);

  if (!isPlayer)
    return ctx.reply("❌ Only playing members can request host change.");

  return startHostVoting(match, ctx);
});


/* ================= HOST VOTING ================= */

async function startHostVoting(match, ctx) {

  match.hostChange = {
    active: true,
    phase: "voting",
    teamVotes: {
      teamA: new Set(),
      teamB: new Set()
    },
    messageId: null,
    timeout: null
  };

  const msg = await ctx.reply(
    getVoteText(match),
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Vote for Host Change", callback_data: "vote_host_change" }],
          [{ text: "❌ Cancel Voting", callback_data: "cancel_host_vote" }]
        ]
      }
    }
  );

  match.hostChange.messageId = msg.message_id;

  match.hostChange.timeout = setTimeout(async () => {

    const m = matches.get(match.groupId);
    if (!m?.hostChange?.active) return;

    await bot.telegram.editMessageReplyMarkup(
      m.groupId,
      m.hostChange.messageId,
      null,
      { inline_keyboard: [] }
    );

    await bot.telegram.sendMessage(
      m.groupId,
      "⏳ Host change voting expired."
    );

    m.hostChange = null;

  }, 60000);
}


function getVoteText(match) {

  const aVotes = match.hostChange.teamVotes.teamA.size;
  const bVotes = match.hostChange.teamVotes.teamB.size;

  return `
🗳 HOST CHANGE VOTING

Team A Votes: ${aVotes}/2
Team B Votes: ${bVotes}/2

Need 2 players from each team.
Voting expires in 60 seconds.
`;
}


/* ================= VOTE ================= */

bot.action("vote_host_change", async (ctx) => {

  const match = getMatch(ctx);
  if (!match?.hostChange?.active)
    return ctx.answerCbQuery("Voting not active.");

  const userId = ctx.from.id;

  const isPlayer =
    match.teamA.some(p => p.id === userId) ||
    match.teamB.some(p => p.id === userId);

  if (!isPlayer)
    return ctx.answerCbQuery("Only match players can vote.");

  const team = getPlayerTeam(match, userId);
  if (!team)
    return ctx.answerCbQuery("Invalid team.");

  if (match.hostChange.teamVotes[team].has(userId))
    return ctx.answerCbQuery("You already voted.");

  if (match.hostChange.teamVotes[team].size >= 2)
    return ctx.answerCbQuery("Your team already has 2 votes.");

  match.hostChange.teamVotes[team].add(userId);

  ctx.answerCbQuery("Vote counted.");

  await bot.telegram.editMessageText(
    match.groupId,
    match.hostChange.messageId,
    null,
    getVoteText(match),
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Vote for Host Change", callback_data: "vote_host_change" }],
          [{ text: "❌ Cancel Voting", callback_data: "cancel_host_vote" }]
        ]
      }
    }
  );

  const requiredA = Math.min(2, match.teamA.length);
  const requiredB = Math.min(2, match.teamB.length);

  if (
    match.hostChange.teamVotes.teamA.size >= requiredA &&
    match.hostChange.teamVotes.teamB.size >= requiredB
  ) {
    clearTimeout(match.hostChange.timeout);
    match.hostChange.active = false;
    return showHostSelection(match);
  }
});


/* ================= HOST SELECTION ================= */

async function showHostSelection(match) {

  match.hostChange.phase = "selection";

  if (match.hostChange?.messageId) {
    await bot.telegram.editMessageReplyMarkup(
      match.groupId,
      match.hostChange.messageId,
      null,
      { inline_keyboard: [] }
    );
  }

  const msg = await bot.telegram.sendMessage(
    match.groupId,
    "⚡ Please take charge as new host.",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "👑 Take Host", callback_data: "take_host" }],
          [{ text: "❌ Cancel", callback_data: "cancel_host_vote" }]
        ]
      }
    }
  );

  match.hostChange.messageId = msg.message_id;
}


/* ================= TAKE HOST ================= */

bot.action("take_host", async (ctx) => {

  const match = getMatch(ctx);
  if (!match?.hostChange || match.hostChange.phase !== "selection")
    return ctx.answerCbQuery("Not allowed.");

  const userId = ctx.from.id;

  const isPlaying =
    match.teamA.some(p => p.id === userId) ||
    match.teamB.some(p => p.id === userId);

  if (isPlaying)
    return ctx.answerCbQuery("Only non-playing members can become host.");

  if (ctx.from.is_bot)
    return ctx.answerCbQuery("Bots cannot become host.");

  match.host = userId;

  await bot.telegram.editMessageReplyMarkup(
    match.groupId,
    match.hostChange.messageId,
    null,
    { inline_keyboard: [] }
  );

  match.hostChange = null;

  await bot.telegram.sendMessage(
    match.groupId,
    `👑 ${getDisplayName(ctx.from)} is now the new host!`
  );

  ctx.answerCbQuery("You are now host.");
});


/* ================= CANCEL HOST VOTE ================= */

bot.action("cancel_host_vote", async (ctx) => {

  const match = getMatch(ctx);
  if (!match?.hostChange)
    return ctx.answerCbQuery("No active process.");

  const userId = ctx.from.id;

  if (match.hostChange.phase !== "selection" && userId !== match.host)
    return ctx.answerCbQuery("Only host can cancel.");

  clearTimeout(match.hostChange.timeout);

  try {
    await bot.telegram.editMessageReplyMarkup(
      match.groupId,
      match.hostChange.messageId,
      null,
      { inline_keyboard: [] }
    );
  } catch {}

  await bot.telegram.sendMessage(match.groupId, "❌ Host change cancelled.");

  match.hostChange = null;
  ctx.answerCbQuery("Cancelled.");
});



/* ================= CREATE TEAM ================= */

bot.command("createteam", (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can create teams.");

  if (match.phase === "join")
    return ctx.reply("⚠️ Joining already in progress.");

  if (!["team_create", "captain", "join"].includes(match.phase))
    return ctx.reply("⚠️ Cannot create teams at this stage.");

  if (!match.teamA) match.teamA = [];
  if (!match.teamB) match.teamB = [];
  if (!match.captains) match.captains = { A: null, B: null };

  match.phase = "join";

  ctx.reply(
`🏏 Teams Selected!

🔵 ${match.teamAName} (A)
🔴 ${match.teamBName} (B)

✅ Joining Open!

Players join using:
👉 /joina
👉 /joinb

⏳ Joining open for 1 minute`
  );

  setTimeout(() => {

    const m = matches.get(match.groupId);
    if (!m || m.phase !== "join") return;

    m.phase = "captain";

    bot.telegram.sendMessage(m.groupId,
`🔒 Joining Closed!

Team A: ${m.teamA.length}
Team B: ${m.teamB.length}

Host use /choosecap`
    );

  }, 60000);
});


/* ================= JOIN TEAM A ================= */

bot.command("joina", ctx => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (playerActiveMatch.has(ctx.from.id))
    return ctx.reply("❌ You are already playing another match.");

  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining is not open.");

  if (ctx.from.id === match.host)
    return ctx.reply("❌ Host cannot join any team.");

  if (match.teamA.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ You are already in Team A.");

  if (match.teamB.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ You are already in Team B.");

  const player = {
    id: ctx.from.id,
    name: ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "Player"
  };

  match.teamA.push(player);
  playerActiveMatch.set(ctx.from.id, match.groupId);

  ctx.reply(`✅ ${player.name} joined Team A`);
});


/* ================= JOIN TEAM B ================= */

bot.command("joinb", ctx => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (playerActiveMatch.has(ctx.from.id))
    return ctx.reply("❌ You are already playing another match.");

  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining is not open.");

  if (ctx.from.id === match.host)
    return ctx.reply("❌ Host cannot join any team.");

  if (match.teamB.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ You are already in Team B.");

  if (match.teamA.some(p => p.id === ctx.from.id))
    return ctx.reply("⚠️ You are already in Team A.");

  const player = {
    id: ctx.from.id,
    name: ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "Player"
  };

  match.teamB.push(player);
  playerActiveMatch.set(ctx.from.id, match.groupId);

  ctx.reply(`✅ ${player.name} joined Team B`);
});


/* ================= CHANGE TEAM ================= */

bot.command("changeteam", (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can change teams.");

  if (match.phase === "play" || match.striker !== null)
    return ctx.reply("❌ Cannot change teams after match started.");

  const args = ctx.message.text.trim().split(/\s+/);
  if (args.length !== 3)
    return ctx.reply("Usage: /changeteam A 1");

  const sourceTeam = args[1].toUpperCase();
  const playerNumber = parseInt(args[2]);

  if (!["A", "B"].includes(sourceTeam))
    return ctx.reply("Team must be A or B.");

  const fromTeam = sourceTeam === "A" ? match.teamA : match.teamB;
  const toTeam   = sourceTeam === "A" ? match.teamB : match.teamA;
  const targetTeam = sourceTeam === "A" ? "B" : "A";

  if (playerNumber < 1 || playerNumber > fromTeam.length)
    return ctx.reply("Invalid player number.");

  const player = fromTeam[playerNumber - 1];

  if (player.id === match.captains.A || player.id === match.captains.B)
    return ctx.reply("❌ Captain cannot be moved.");

  match.pendingTeamChange = {
    player,
    fromTeam,
    toTeam,
    targetTeam
  };

  return ctx.reply(
    `⚠️ Confirm move ${player.name} from Team ${sourceTeam} → Team ${targetTeam}?`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Confirm", "confirm_team_change"),
        Markup.button.callback("❌ Cancel", "cancel_team_change")
      ]
    ])
  );
});


/* ================= SHOW PLAYERS ================= */

function showPlayersList(match) {

  function formatTeam(teamArray, captainId) {
    if (!teamArray.length) return "No players";

    let list = [];

    if (captainId) {
      const captain = teamArray.find(p => p.id === captainId);
      if (captain) list.push(`1. 👑 ${captain.name} (Captain)`);
    }

    const others = teamArray.filter(p => p.id !== captainId);
    others.forEach(p => list.push(`${list.length + 1}. ${p.name}`));

    return list.join("\n");
  }

  const teamAList = formatTeam(match.teamA, match.captains.A);
  const teamBList = formatTeam(match.teamB, match.captains.B);

  bot.telegram.sendMessage(
    match.groupId,
`👥 UPDATED PLAYERS LIST

🔵 ${match.teamAName} (A):
${teamAList}

🔴 ${match.teamBName} (B):
${teamBList}`
  );
}


/* ================= CONFIRM TEAM CHANGE ================= */

bot.action("confirm_team_change", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (!isHost(match, ctx.from.id))
    return ctx.answerCbQuery("Only host can confirm.");

  if (!match.pendingTeamChange)
    return ctx.answerCbQuery("No pending change.");

  const { player, fromTeam, toTeam, targetTeam } =
    match.pendingTeamChange;

  const index = fromTeam.findIndex(p => p.id === player.id);
  if (index !== -1) fromTeam.splice(index, 1);

  toTeam.push(player);
  match.pendingTeamChange = null;

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  await ctx.reply(`✅ ${player.name} moved to Team ${targetTeam}`);

  showPlayersList(match);
});


/* ================= CANCEL TEAM CHANGE ================= */

bot.action("cancel_team_change", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (!isHost(match, ctx.from.id))
    return ctx.answerCbQuery("Only host can cancel.");

  match.pendingTeamChange = null;

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  ctx.answerCbQuery("Cancelled.");
});


/* ================= CAPTAIN ================= */

bot.command("choosecap", ctx => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!match.captains)
    match.captains = { A: null, B: null };

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can start captain selection.");

  match.phase = "captain";

  ctx.reply(
    "🏏 Captain Selection:",
    Markup.inlineKeyboard([
      [Markup.button.callback("👑 Choose Captain - Team A", "cap_A")],
      [Markup.button.callback("👑 Choose Captain - Team B", "cap_B")]
    ])
  );
});


bot.action("cap_A", async ctx => {

  const match = getMatch(ctx);
  if (!match) return;

  if (match.phase !== "captain")
    return ctx.answerCbQuery("Not allowed now.");

  if (match.captains.A)
    return ctx.answerCbQuery("Captain A already selected");

  if (!match.teamA.some(p => p.id === ctx.from.id))
    return ctx.answerCbQuery("Only Team A players allowed");

  match.captains.A = ctx.from.id;

  await ctx.answerCbQuery("Captain A Selected");
  await ctx.reply(`👑 ${getDisplayName(ctx.from)} is Captain of Team A`);

  updateCaptainButtons(match, ctx);
});


bot.action("cap_B", async ctx => {

  const match = getMatch(ctx);
  if (!match) return;

  if (match.phase !== "captain")
    return ctx.answerCbQuery("Not allowed now.");

  if (match.captains.B)
    return ctx.answerCbQuery("Captain B already selected");

  if (!match.teamB.some(p => p.id === ctx.from.id))
    return ctx.answerCbQuery("Only Team B players allowed");

  match.captains.B = ctx.from.id;

  await ctx.answerCbQuery("Captain B Selected");
  await ctx.reply(`👑 ${getDisplayName(ctx.from)} is Captain of Team B`);

  updateCaptainButtons(match, ctx);
});


function updateCaptainButtons(match, ctx) {

  const buttons = [];

  if (!match.captains.A)
    buttons.push([Markup.button.callback("👑 Choose Captain - Team A", "cap_A")]);

  if (!match.captains.B)
    buttons.push([Markup.button.callback("👑 Choose Captain - Team B", "cap_B")]);

  if (buttons.length === 0) {

    ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    match.phase = "toss";

    ctx.reply("🎲 Both Captains Selected!\nStarting Toss...");
    startToss(match);

  } else {
    ctx.editMessageReplyMarkup({ inline_keyboard: buttons });
  }
}


/* ================= PLAYERS LIST ================= */

bot.command("players", (ctx) => {

  const match = getMatch(ctx);
  if (!match || ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ No active match in this group.");

  function formatTeam(teamArray, captainId) {
    if (!teamArray.length) return "No players";

    let list = [];

    if (captainId) {
      const captain = teamArray.find(p => p.id === captainId);
      if (captain) list.push(`1. 👑 ${captain.name} (Captain)`);
    }

    const others = teamArray.filter(p => p.id !== captainId);
    others.forEach(p => list.push(`${list.length + 1}. ${p.name}`));

    return list.join("\n");
  }

  const teamAList = formatTeam(match.teamA, match.captains.A);
  const teamBList = formatTeam(match.teamB, match.captains.B);

  ctx.reply(
`👥 PLAYERS LIST

🔵 ${match.teamAName} (A):
${teamAList}

🔴 ${match.teamBName} (B):
${teamBList}`
  );
});


/* ================= CAPTAIN CHANGE ================= */

bot.command("capchange", async (ctx) => {

  const match = getMatch(ctx);
  if (!match || match.phase === "idle")
    return ctx.reply("❌ No active match.");

  if (ctx.from.id !== match.host)
    return ctx.reply("❌ Only host can change captain.");

  const args = ctx.message.text.trim().split(/\s+/);
  if (args.length !== 3)
    return ctx.reply("Usage:\n/capchange A 2");

  const teamLetter = args[1].toUpperCase();
  const number = parseInt(args[2]);

  if (!["A", "B"].includes(teamLetter))
    return ctx.reply("❌ Use A or B.");

  const team = teamLetter === "A" ? match.teamA : match.teamB;

  if (!number || number < 1 || number > team.length)
    return ctx.reply("❌ Invalid player number.");

  const newCaptainId = team[number - 1].id;

  if (teamLetter === "A" && match.captains.A === newCaptainId)
    return ctx.reply("⚠️ Already captain.");

  if (teamLetter === "B" && match.captains.B === newCaptainId)
    return ctx.reply("⚠️ Already captain.");

  match.pendingCaptainChange = {
    team: teamLetter,
    playerId: newCaptainId
  };

  const name = getName(match, newCaptainId);

  await ctx.reply(
`⚠️ Confirm Captain Change?

Team ${teamLetter}
New Captain: ${name}`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Confirm", "confirm_cap_change"),
        Markup.button.callback("❌ Cancel", "cancel_cap_change")
      ]
    ])
  );
});


bot.action("confirm_cap_change", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (!match.pendingCaptainChange)
    return ctx.answerCbQuery("Expired.");

  if (ctx.from.id !== match.host)
    return ctx.answerCbQuery("Only host can confirm.");

  const { team, playerId } = match.pendingCaptainChange;

  if (team === "A") match.captains.A = playerId;
  else match.captains.B = playerId;

  match.pendingCaptainChange = null;

  const mention = `<a href="tg://user?id=${playerId}">${getName(match, playerId)}</a>`;

  await ctx.editMessageText(
    `👑 Captain Updated Successfully!\n\n${mention} is now the new Captain of Team ${team}!`,
    { parse_mode: "HTML" }
  );
});


bot.action("cancel_cap_change", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (ctx.from.id !== match.host)
    return ctx.answerCbQuery("Only host can cancel.");

  match.pendingCaptainChange = null;

  await ctx.editMessageText("❌ Captain change cancelled.");
});



/* ================= TOSS ================= */

function startToss(match) {

  if (!match) return;

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

bot.action(["toss_odd", "toss_even"], async (ctx) => {

  const match = getMatch(ctx);
  if (!match || match.phase !== "toss") return;

  const captainA = match.captains.A;
  const captainB = match.captains.B;

  if (![captainA, captainB].includes(ctx.from.id))
    return ctx.answerCbQuery("Only captains can choose");

  const choice = ctx.match[0] === "toss_odd" ? "odd" : "even";

  const tossNumber = Math.floor(Math.random() * 6) + 1;
  const result = tossNumber % 2 === 0 ? "even" : "odd";

  const chooser = ctx.from.id;

  const tossWinner =
    choice === result
      ? chooser
      : chooser === captainA
        ? captainB
        : captainA;

  match.tossWinner = tossWinner;
  match.phase = "batbowl";

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  const winnerTeam = tossWinner === captainA ? "A" : "B";

  bot.telegram.sendMessage(
    match.groupId,
`🎲 Toss Number: ${tossNumber} (${result})

🏆 Toss Winner: ${
  winnerTeam === "A"
    ? `${match.teamAName} (A)`
    : `${match.teamBName} (B)`
}

Choose Bat or Bowl:`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("🏏 Bat", "decision_bat"),
        Markup.button.callback("🎯 Bowl", "decision_bowl")
      ]
    ])
  );
});

bot.action(["decision_bat", "decision_bowl"], async (ctx) => {

  const match = getMatch(ctx);
  if (!match || match.phase !== "batbowl") return;

  if (ctx.from.id !== match.tossWinner)
    return ctx.answerCbQuery("Only toss winner decides");

  const winnerTeam =
    ctx.from.id === match.captains.A ? "A" : "B";

  const otherTeam = winnerTeam === "A" ? "B" : "A";

  const decision =
    ctx.match[0] === "decision_bat" ? "bat" : "bowl";

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
  match.currentOver = 0;
  match.currentBall = 0;

  match.phase = "setovers";

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  bot.telegram.sendMessage(
    match.groupId,
`📢 Toss Decision Confirmed

🏏 ${
  match.battingTeam === "A"
    ? `${match.teamAName} (A)`
    : `${match.teamBName} (B)`
} Batting First

🎯 ${
  match.bowlingTeam === "A"
    ? `${match.teamAName} (A)`
    : `${match.teamBName} (B)`
} Bowling First

Host set overs:
/setovers 1-25`
  );
});

/* ================= SET OVERS ================= */

bot.command("setovers", (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can set overs.");

  const args = ctx.message.text.split(" ");
  const overs = parseInt(args[1]);

  if (isNaN(overs) || overs < 1 || overs > 25)
    return ctx.reply("⚠️ Overs must be between 1 and 25.");

  match.totalOvers = overs;
  match.maxWickets =
    (match.battingTeam === "A" ? match.teamA.length : match.teamB.length) - 1;

  match.phase = "set_striker";

  ctx.reply(
`✅ Overs set to ${overs}

Set STRIKER:
/batter number`
  );
});

/* ================= SET BATTER ================= */

bot.command("batter", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return;

  if (!isHost(match, ctx.from.id)) return;

  if (ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ Send batter number in GROUP only.");

  const num = parseInt(ctx.message.text.split(" ")[1]);
  if (!num) return ctx.reply("❌ Provide batter number");

  const players = orderedBattingPlayers(match);

  if (num < 1 || num > players.length)
    return ctx.reply("❌ Invalid number");

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
    match.maxWickets = players.length - 1;

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

function handleOverCompletion(match) {

  if (!match) return false;

  if (match.currentBall < 6) return false;

  if (match.currentOverRuns === 0) {
    bot.telegram.sendMessage(
      match.groupId,
      `🎯 ${getName(match, match.bowler)}\n${randomLine("maiden")}`
    );
  }

  match.currentOver++;
  match.currentBall = 0;
  match.currentOverRuns = 0;
  match.wicketStreak = 0;

  // 🔥 Over limit check
  if (match.currentOver >= match.totalOvers) {
    clearTimers(match);
    endInnings(match);
    return true;
  }

  match.lastOverBowler = match.bowler;

  swapStrike(match);

  match.phase = "set_bowler";

  bot.telegram.sendMessage(
    match.groupId,
`🔄 Over Completed!
Score: ${match.score}/${match.wickets}

🎯 Send new bowler:
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
          match.currentOver + 1;

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

      if (handleOverCompletion(match)) return;

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

      if (handleOverCompletion(match)) return;

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

  match.bowlNumber = Number(text);
  match.awaitingBowl = false;
  match.awaitingBat = true;

  clearTimers(match);

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
  match.ballLocked = true;

  try {

    clearTimers(match);

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

      match.overHistory.at(-1)?.balls.push("W");
      match.currentPartnershipBalls++;

      const line =
        match.wicketStreak === 3
          ? randomLine("hattrick")
          : randomLine("wicket");

      await bot.telegram.sendMessage(match.groupId, line);

      await bot.telegram.sendMessage(
        match.groupId,
        `🤝 Partnership Broken!
Runs: ${match.currentPartnershipRuns}
Balls: ${match.currentPartnershipBalls}`
      );

      match.currentPartnershipRuns = 0;
      match.currentPartnershipBalls = 0;

      if (match.wickets >= match.maxWickets) {
        await endInnings(match);
        return;
      }

      if (handleOverCompletion(match)) return;

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
    match.overHistory.at(-1)?.balls.push(bat);

    match.wicketStreak = 0;

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
      match.score > match.firstInningsScore
    ) {
      await endInnings(match);
      return;
    }

    /* ================= OVER COMPLETION ================= */

    if (handleOverCompletion(match)) return;

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

  /* ================= SAVE PLAYER STATS ================= */

  try {

    const players = [
      match.playerA,
      match.playerB
    ];

    for (const id of players) {

      let stats = await PlayerStats.findOne({ userId: String(id) });

      if (!stats) {
        stats = new PlayerStats({ userId: String(id) });
      }

      stats.matches += 1;

      await stats.save();
    }

  } catch (err) {
    console.error("Stats update error:", err);
  }

  /* ================= MATCH RESULT ================= */

  // 🏆 Batting team wins
  if (match.score > match.firstInningsScore) {
    return endMatchWithWinner(match, match.battingTeam);
  }

  // 🏆 Bowling team wins
  if (match.score < match.firstInningsScore) {
    return endMatchWithWinner(match, match.bowlingTeam);
  }

  // 🤝 Tie
  return endMatchTie(match);
  
  clearActiveMatchPlayers(match);
  matches.delete(match.groupId);
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
});

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