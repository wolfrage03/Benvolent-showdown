require("dotenv").config();
const connectDB = require("./database");

connectDB();
const { Telegraf, Markup } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

let BOT_USERNAME;

bot.telegram.getMe().then(me => {
  BOT_USERNAME = me.username;
});

let userRegistry = {};

bot.on("message", (ctx, next) => {
  if (ctx.from && ctx.from.username) {
    userRegistry[ctx.from.username.toLowerCase()] = ctx.from.id;
  }
  return next();
});

// DM START HANDLER
bot.start(async (ctx, next) => {
  if (ctx.chat.type !== "private") return next();

  await ctx.reply(
    "✅ Bot connected.\n\nWhen you are selected as bowler, send your number (1-6) here."
  );
});

let match;

function resetMatch() {
  match = {
    phase: "idle",
    host: null,
    groupId: null,

    teamA: [],
    teamB: [],
    captains: { A: null, B: null },
    teamAName: null,
    teamBName: null,
    tossWinner: null,
    pendingCaptainChange: null,
    battingTeam: null,
    bowlingTeam: null,
    hostChange: null,
    pendingTeamChange: null,
    pendingCaptainChange: null,
    totalOvers: 0,
    currentOver: 0,
    currentBall: 0,

    striker: null,
    nonStriker: null,
    bowler: null,
    lastBowler: null,

    usedBatters: [],

    score: 0,
    wickets: 0,
    maxWickets: 0,

    innings: 1,
    firstInningsScore: 0,

    awaitingBat: false,
    awaitingBowl: false,
    batNumber: null,
    bowlNumber: null,

    bowlerMissCount: 0,
    batterMissCount: 0,
    warning30: null,
    warning10: null,
    ballTimer: null,
    ballLocked: false,
    batterStats: {},   // { userId: runs }
    bowlerStats: {},   // { userId: { balls:0, runs:0, wickets:0, history: [] } }
    lastCommandTime: 0,
    phaseBeforeSwitch: null,
    lastOverBowler: null,
    suspendedBowlers: {},   // { userId: overNumber }
    currentOverNumber: 0,   // track real over number
    wicketStreak: 0,
    currentOverRuns: 0,
    currentPartnershipRuns: 0,
    currentPartnershipBalls: 0,
    overHistory: [],   // stores completed overs
    currentOverBalls: []  // balls of ongoing over
  };
}
resetMatch();

/* ================= HELPERS ================= */

const isHost = id => id === match.host;

const battingPlayers = () =>
  match.battingTeam === "A" ? match.teamA : match.teamB;

const bowlingPlayers = () =>
  match.bowlingTeam === "A" ? match.teamA : match.teamB;

function orderedBattingPlayers() {
  const players = battingPlayers();
  const captainId =
    match.battingTeam === "A" ? match.captains.A : match.captains.B;

  return [
    ...players.filter(p => p.id === captainId),
    ...players.filter(p => p.id !== captainId)
  ];
}

function getPlayerTeam(userId) {
  if (match.teamA.some(p => p.id === userId)) return "teamA";
  if (match.teamB.some(p => p.id === userId)) return "teamB";
  return null;
}

function swapStrike() {
  const t = match.striker;
  match.striker = match.nonStriker;
  match.nonStriker = t;
}
function getDisplayName(user) {
  if (!user) return "Player";

  if (user.username)
    return `@${user.username}`;

  if (user.first_name && user.last_name)
    return `${user.first_name} ${user.last_name}`;

  if (user.first_name)
    return user.first_name;

  return "Player";
}
function getName(id) {
  const all = [...match.teamA, ...match.teamB];
  const p = all.find(x => x.id === id);
  return p ? p.name : "Player";
}

function clearTimers() {
  if (match.warning30) clearTimeout(match.warning30);
  if (match.warning10) clearTimeout(match.warning10);
  if (match.ballTimer) clearTimeout(match.ballTimer);
}

function bowlDMButton() {
  return Markup.inlineKeyboard([
    [
      Markup.button.url(
        "🎯 Bowl in DM",
        `https://t.me/${BOT_USERNAME}`
      )
    ]
  ]);
}
function getOverHistory() {

  if (!match.overHistory.length)
    return "No overs completed yet.";

  return match.overHistory.map(o => {

    const balls = o.balls.join(",");
    return `Over ${o.over} - ${getName(o.bowler)} = (${balls})`;

  }).join("\n");

}

function advanceGame() {

  if (!match) return;

  if (match.phase === "switch") return;

  if (match.wickets >= match.maxWickets) {
    endInnings();
    return;
  }

  if (match.currentOver >= match.totalOvers) {
    endInnings();
    return;
  }

  startBall();
}
/* ================= COMMENTARY ENGINE ================= */

const commentary = {

  0: [
    "Tight as a drum! No run.",
    "Beaten! Nothing off that delivery.",
    "Solid defence — straight to the fielder.",
    "Pressure building… dot ball!",
    "Right on the money, no scoring opportunity."
  ],

  1: [
    "Just a gentle push for one.",
    "Quick single taken!",
    "Soft hands, easy run.",
    "Rotating the strike nicely.",
    "Smart cricket — keeps the scoreboard ticking."
  ],

  2: [
    "Placed beautifully — they’ll come back for two!",
    "Good running between the wickets.",
    "In the gap! Comfortable couple.",
    "Excellent awareness — two more added.",
    "They hustle back for the second!"
  ],

  3: [
    "Into the deep — they’ll get three!",
    "Superb running, that’s three all the way.",
    "Chased hard… but three runs taken.",
    "Great placement and even better running!",
    "Turning ones into threes — brilliant effort."
  ],

  4: [
    "Cracked away! That’s four!",
    "Beautifully timed — races to the boundary!",
    "No stopping that — FOUR!",
    "Threaded the gap perfectly!",
    "Pure class — boundary!"
  ],

  5: [
    "Overthrows! That’s five runs gifted!",
    "Misfield and they’ll get five!",
    "Chaos in the field — five runs taken!",
    "That’s costly — five to the total!",
    "Extra runs courtesy of an overthrow!"
  ],

  6: [
    "That’s massive! SIX!",
    "High and handsome — out of the park!",
    "Clears the ropes with ease!",
    "What a strike! Maximum!",
    "That’s gone into the stands!"
  ],

  wicket: [
    "Cleaned him up!",
    "Gone! Big breakthrough!",
    "Straight to the fielder — taken!",
    "What a delivery — timber!",
    "That’s a huge wicket at this stage!"
  ],

  hattrick: [
    "Three in three! Unbelievable!",
    "That’s a hattrick! Magical spell!",
    "History made — three consecutive wickets!",
    "What a moment — hattrick hero!",
    "Hattrick ball… and he’s done it!"
  ],

  maiden: [
    "Maiden over! Absolute control.",
    "Six balls, no runs — brilliant bowling.",
    "Pressure cooker stuff — maiden!",
    "Tidy and disciplined — no scoring.",
    "Dot after dot — that’s a maiden!"
  ]
};

function randomLine(type) {
  const list = commentary[type];
  return list[Math.floor(Math.random() * list.length)];
}

const bowlingPrompts = [
  "🎯 Bowl now!\nType a number between 1 and 6.",
  "🚀 It’s your delivery!\nSend your bowling number quickly (1–6).",
  "⏳ Waiting for your ball…\nReply with a number from 1 to 6.",
  "🔥 Time to strike!\nEnter your bowling number (1–6).",
  "💣 Drop a deadly delivery!\nSend your number (1–6).",
  "👀 Batter is ready… can you outsmart them?\nType your bowling number now!",
  "🧠 Mind game starts here!\nChoose a number (1–6) and send it fast.",
  "🎯 Aim for the wicket!\nSend your secret bowling number.",
  "😈 Try to trap the batter!\nEnter your number (1–6).",
  "🧩 Strategic Move Required\nChoose your bowling number.",
  "🎲 Roll the magic number!\nSend 1–6.",
  "💥 Boom or Bust?\nChoose your bowling number!",
  "🪄 Cast your bowling spell!\nSend a number (1–6).",
  "🧨 Let’s see if you can explode the stumps!\nEnter your number."
];

function randomBowlingPrompt() {
  return bowlingPrompts[
    Math.floor(Math.random() * bowlingPrompts.length)
  ];
}

const batterPrompts = [
  "🏏 Batter’s Turn!\nSend your number (0–6) now!",
  "🎯 Face the delivery!\nChoose a number between 0 and 6.",
  "🚀 Play your shot!\nEnter your number (0–6).",
  "🔥 Time to score!\nBatter, send your number!",
  "⏳ Waiting for the batter…\nPick a number (0–6).",
  "💥 Can you smash this one?\nSend your number (0–6)!",
  "👀 Bowler is ready…\nBatter, what’s your move? (0–6)",
  "🧠 Mind game ON!\nChoose wisely between 0–6.",
  "🎯 Boundary or wicket?\nBatter, enter your number!",
  "😈 Pressure is building!\nSend your shot (0–6).",
  "🏃 Quick shot needed!\nEnter 0–6 immediately!",
  "🔔 Ball delivered!\nBatter, respond with 0–6!",
  "🧩 Strategic Play Required\nChoose your number now!",
  "⚔️ Battle in progress!\nBatter, send 0–6."
];

function randomBatterPrompt() {
  return batterPrompts[
    Math.floor(Math.random() * batterPrompts.length)
  ];
}

const teams = [
  "Mumbai Indians",
  "Chennai Super Kings",
  "Royal Challengers Bengaluru",
  "Kolkata Knight Riders",
  "Rajasthan Royals",
  "Delhi Capitals",
  "Sunrisers Hyderabad",
  "Gujarat Titans",
  "Sydney Sixers",
  "Perth Scorchers",
  "Melbourne Stars",
  "Brisbane Heat",
  "Oval Invincibles",
  "Southern Brave",
  "Manchester Originals",
  "London Spirit",
  "Paarl Royals",
  "Guyana Amazon Warriors",
  "Barbados Royals",
  "Seattle Orcas",
  "San Francisco Unicorns",
  "Cursed Spirits",
  "Gojo Infinity",
  "Straw Hat Raiders",
  "Red Hair Pirates",
  "Hidden Leaf Legends",
  "Akatsuki Storm",
  "Demon Slayers XI",
  "Hashira Hurricanes",
  "Saiyan Warriors",
  "Z Fighters XI",
  "Blade Breakers",
  "Dragon Emperor XI",
  "Phantom Troupe",
  "Nen Masters",
  "State Alchemists",
  "Elric Brothers XI",
  "Titan Shifters",
  "Survey Corps Strikers",
  "Soul Reapers XI",
  "Gotei 13 Warriors",
  "Hero Academia United",
  "Plus Ultra Strikers",
  "Blue Lock Strikers",
  "Egoist XI",
  "Hero Association",
  "Kira Dominion",
  "Shinigami Reign",
  "Karasuno Crows",
  "Nekoma Cats"
];

function getRandomTeams() {
  const shuffled = teams.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 2);
}


/* ================= MANUAL ADD PLAYER (USERNAME / ID / REPLY) ================= */

bot.command("add", (ctx) => {

  if (!match || ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ No active match.");

  if (!isHost(ctx.from.id))
    return ctx.reply("❌ Only host can add players.");

  const args = ctx.message.text.split(" ");
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

    userId = repliedUser.id;
    name = repliedUser.username
      ? `@${repliedUser.username}`
      : repliedUser.first_name;

  }

  /* ========= ✅ USERNAME / ID METHOD ========= */

  else {

    if (args.length < 3)
      return ctx.reply("Usage:\n/add A @username\n/add B userID\nReply + /add A");

    let input = args[2];

    if (input.startsWith("@")) {

      input = input.replace("@","");
      userId = userRegistry[input];

      if (!userId)
        return ctx.reply("❌ User has not interacted with bot yet.");

      name = `@${input}`;
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

  if (match.teamA.find(p => p.id === userId) ||
      match.teamB.find(p => p.id === userId))
    return ctx.reply("⚠️ Player already added.");

  const player = { id: userId, name };

  if (team === "A") match.teamA.push(player);
  else match.teamB.push(player);

  ctx.reply(`✅ ${name} added to Team ${team}`);
});
/* ================= REMOVE PLAYER ================= */

bot.command("remove", ctx => {

if (!isHost(ctx.from.id))
return ctx.reply("❌ Only host can remove players.");

const arg = ctx.message.text.split(" ")[1];
if (!arg) return ctx.reply("Usage: /remove A1 or B2");

const team = arg[0].toUpperCase();
const num = parseInt(arg.slice(1));

if (!["A","B"].includes(team) || isNaN(num))
return ctx.reply("Invalid format. Use A1 or B2");

const teamArr = team === "A" ? match.teamA : match.teamB;

if (num < 1 || num > teamArr.length)
return ctx.reply("Player slot not found.");

const removed = teamArr.splice(num - 1, 1)[0];

// remove captain if removed
if (match.captains[team] === removed.id)
  match.captains[team] = null;

// remove from dismissed list
match.usedBatters = match.usedBatters.filter(id => id !== removed.id);

ctx.reply(`🚫 ${removed.name} removed from Team ${team}`);
});

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
 //* ================= END MATCH ================= */

bot.command("endmatch", async (ctx) => {

  if (ctx.chat.type === "private")
    return ctx.reply("❌ Use this in group.");

  if (!match || match.phase === "idle")
    return ctx.reply("⚠️ No active match running.");

  if (ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ This match is not running in this group.");

  // ✅ Check if user is group admin
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


// ================= CONFIRM END =================
bot.action("confirm_end", async (ctx) => {

  if (!match || match.phase === "idle")
    return ctx.answerCbQuery("No match running.");

  // ✅ Restrict button press also
  const member = await ctx.getChatMember(ctx.from.id);
  const isAdmin = ["administrator", "creator"].includes(member.status);

  if (ctx.from.id !== match.host && !isAdmin)
    return ctx.answerCbQuery("Only host/admin can confirm.");

  await ctx.editMessageReplyMarkup();
  await ctx.reply("🛑 Match Ended Successfully.");

  clearTimers();   // 🔥 important
  resetMatch();
});


// ================= CANCEL =================
bot.action("cancel_end", async (ctx) => {

  if (ctx.from.id !== match.host)
    return ctx.answerCbQuery("Only host can cancel.");

  await ctx.editMessageReplyMarkup();
  return ctx.answerCbQuery("Cancelled.");
});
/* ================= HOST ================= */

bot.action("select_host", async ctx => {
  if (match.host)
    return ctx.answerCbQuery("Host already selected");

  match.host = ctx.from.id;
  match.phase = "team_create";

  const selected = getRandomTeams();
  match.teamAName = selected[0];
  match.teamBName = selected[1];


  await ctx.editMessageReplyMarkup();

  ctx.reply(`👑 Host Selected: ${ctx.from.first_name}`);
  ctx.reply("Host use /createteam to create teams.");
});

// ================= HOSTCHANGE =================

bot.command("changehost", async (ctx) => {

  if (!match) return ctx.reply("No active match.");

  if (ctx.chat.id !== match.groupId)
    return ctx.reply("Use this command in match group.");

  const userId = ctx.from.id;

  if (match.hostChange?.active)
    return ctx.reply("⚠️ Host change voting already active.");

  // ✅ Host direct command → instant selection
  if (userId === match.host) {
    return showHostSelection();
  }

  // ✅ Only playing members can start voting
  const isPlayer =
    match.teamA.some(p => p.id === userId) ||
    match.teamB.some(p => p.id === userId);

  if (!isPlayer)
    return ctx.reply("❌ Only playing members can request host change.");

  return startHostVoting(ctx);
});


async function startHostVoting(ctx) {

  match.hostChange = {
    active: true,
    teamVotes: {
      teamA: new Set(),
      teamB: new Set()
    },
    messageId: null,
    timeout: null
  };

  const msg = await ctx.reply(
    getVoteText(),
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

  // ⏳ AUTO EXPIRE (60s)
  match.hostChange.timeout = setTimeout(async () => {

    if (!match.hostChange?.active) return;

    await bot.telegram.editMessageReplyMarkup(
      match.groupId,
      match.hostChange.messageId,
      null,
      { inline_keyboard: [] }
    );

    await bot.telegram.sendMessage(
      match.groupId,
      "⏳ Host change voting expired."
    );

    match.hostChange = null;

  }, 60000);
}

function getVoteText() {

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

bot.action("vote_host_change", async (ctx) => {

  if (!match.hostChange?.active)
    return ctx.answerCbQuery("Voting not active.");

  const userId = ctx.from.id;

  // Only match players
  const isPlayer =
    match.teamA.some(p => p.id === userId) ||
    match.teamB.some(p => p.id === userId);

  if (!isPlayer)
    return ctx.answerCbQuery("Only match players can vote.");

  const team = getPlayerTeam(userId);

  if (!team)
    return ctx.answerCbQuery("Invalid team.");

  // Already voted?
  if (match.hostChange.teamVotes[team].has(userId))
    return ctx.answerCbQuery("You already voted.");

  // Max 2 per team
  if (match.hostChange.teamVotes[team].size >= 2)
    return ctx.answerCbQuery("Your team already has 2 votes.");

  match.hostChange.teamVotes[team].add(userId);

  ctx.answerCbQuery("Vote counted.");

  const aVotes = match.hostChange.teamVotes.teamA.size;
  const bVotes = match.hostChange.teamVotes.teamB.size;

  // 🔄 LIVE UPDATE MESSAGE
  await bot.telegram.editMessageText(
    match.groupId,
    match.hostChange.messageId,
    null,
    getVoteText(),
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Vote for Host Change", callback_data: "vote_host_change" }],
          [{ text: "❌ Cancel Voting", callback_data: "cancel_host_vote" }]
        ]
      }
    }
  );

  // ✅ SUCCESS CONDITION
  const requiredA = Math.min(2, match.teamA.length);
  const requiredB = Math.min(2, match.teamB.length);

  if (aVotes >= requiredA && bVotes >= requiredB) {

    clearTimeout(match.hostChange.timeout);
    match.hostChange.active = false;
    return showHostSelection();
}
  }
});

async function showHostSelection() {

  // Remove voting buttons
  if (match.hostChange?.messageId) {
    await bot.telegram.editMessageReplyMarkup(
      match.groupId,
      match.hostChange.messageId,
      null,
      { inline_keyboard: [] }
    );
  }
   if (match.hostChange)
     match.hostChange.active = false;

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

bot.action("take_host", async (ctx) => {

  if (!match?.hostChange)
    return ctx.answerCbQuery("Not allowed.");

  const userId = ctx.from.id;

  // Correct playing check
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

bot.action("cancel_host_vote", async (ctx) => {

  if (!match?.hostChange)
    return ctx.answerCbQuery("No active voting.");

  const userId = ctx.from.id;

  // Allow only current host
  if (userId !== match.host)
    return ctx.answerCbQuery("Only current host can cancel.");

  clearTimeout(match.hostChange.timeout);

  try {
    await bot.telegram.editMessageReplyMarkup(
      match.groupId,
      match.hostChange.messageId,
      null,
      { inline_keyboard: [] }
    );
  } catch (e) {}

  await bot.telegram.sendMessage(
    match.groupId,
    "❌ Host change cancelled."
  );

  match.hostChange = null;

  ctx.answerCbQuery("Cancelled.");
});

/* ================= CREATE TEAM ================= */

bot.command("createteam", (ctx) => {

  if (!isHost(ctx.from.id))
    return ctx.reply("❌ Only host can create teams.");

  if (match.phase === "join")
    return ctx.reply("⚠️ Joining already in progress.");

  if (match.phase !== "team_create" &&
      match.phase !== "captain" &&
      match.phase !== "join")
    return ctx.reply("⚠️ Cannot create teams at this stage.");

  // ✅ DO NOT RESET if already exists
  if (!match.teamA) match.teamA = [];
  if (!match.teamB) match.teamB = [];
  if (!match.captains) match.captains = { A: null, B: null };

  // Just reopen joining
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

    if (match.phase !== "join") return;

    match.phase = "captain";

    bot.telegram.sendMessage(match.groupId,
`🔒 Joining Closed!

Team A: ${match.teamA.length}
Team B: ${match.teamB.length}

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

  const player = {
    id: ctx.from.id,
    name: ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "Player"
  };

  match.teamA.push(player);

  ctx.reply(`✅ ${player.name} joined Team A`);
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

  const player = {
    id: ctx.from.id,
    name: ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "Player"
  };

  match.teamB.push(player);

  ctx.reply(`✅ ${player.name} joined Team B`);
});


// ================= CHANGETEAM =================


bot.command("changeteam", async (ctx) => {

  if (!isHost(ctx.from.id))
    return ctx.reply("❌ Only host can change teams.");

  // ❌ Block after gameplay starts
  if (match.phase === "play" || match.striker !== null)
    return ctx.reply("❌ Cannot change teams after match has started.");

  // Optional extra safety
  if (match.innings > 1 || match.currentOver > 0)
    return ctx.reply("❌ Cannot change teams during match.");


  const args = ctx.message.text.split(" ");

  if (args.length !== 3)
    return ctx.reply("Usage: /changeteam A 2");

  const targetTeam = args[1].toUpperCase();
  const playerNumber = parseInt(args[2]);

  if (!["A", "B"].includes(targetTeam))
    return ctx.reply("Team must be A or B.");

 const fromTeam = targetTeam === "A" ? match.teamB : match.teamA;
];
  const toTeam = targetTeam === "A" ? match.teamA : match.teamB;

  if (playerNumber < 1 || playerNumber > fromTeam.length)
    return ctx.reply("Invalid player number.");

  const player = fromTeam[playerNumber - 1];

  // ❌ Captain cannot be moved
  if (player.id === match.captains.A || player.id === match.captains.B)
    return ctx.reply("❌ Captain cannot be moved.");

  // Save pending change
  match.pendingTeamChange = {
    player,
    fromTeam,
    toTeam,
    targetTeam
  };

  return ctx.reply(
    `⚠️ Confirm move ${player.name} to Team ${targetTeam}?`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Confirm", "confirm_team_change"),
        Markup.button.callback("❌ Cancel", "cancel_team_change")
      ]
    ])
  );
});
function showPlayersList() {

  function formatTeam(teamArray, captainId) {
    if (!teamArray.length) return "No players";

    let list = [];

    if (captainId) {
      const captain = teamArray.find(p => p.id === captainId);
      if (captain) {
        list.push(`1. 👑 ${captain.name} (Captain)`);
      }
    }

    const others = teamArray.filter(p => p.id !== captainId);

    others.forEach(p => {
      list.push(`${list.length + 1}. ${p.name}`);
    });

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


bot.action("confirm_team_change", async (ctx) => {

  if (!isHost(ctx.from.id))
    return ctx.answerCbQuery("Only host can confirm.");

  if (!match.pendingTeamChange)
    return ctx.answerCbQuery("No pending change.");

  const { player, targetTeam } = match.pendingTeamChange;

  const realFromTeam =
    targetTeam === "A" ? match.teamB : match.teamA;

  const realToTeam =
    targetTeam === "A" ? match.teamA : match.teamB;

  const index = realFromTeam.findIndex(p => p.id === player.id);
  if (index !== -1) realFromTeam.splice(index, 1);

  realToTeam.push(player);

  match.pendingTeamChange = null;

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  await ctx.reply(`✅ ${player.name} moved to Team ${targetTeam}`);

  // ✅ AUTO SHOW UPDATED PLAYER LIST
  showPlayersList();
});


bot.action("cancel_team_change", async (ctx) => {
    
  if (!isHost(ctx.from.id))
    return ctx.answerCbQuery("Only host can cancel.");
  match.pendingTeamChange = null;

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  ctx.answerCbQuery("Cancelled.");
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

  ctx.reply(`👑 ${getDisplayName(ctx.from)} is Captain of Team A`);

  updateCaptainButtons(ctx);
});


bot.action("cap_B", async ctx => {
  if (match.captains.B)
    return ctx.answerCbQuery("Captain B already selected");

  if (!match.teamB.find(p => p.id === ctx.from.id))
    return ctx.answerCbQuery("Only Team B players allowed");

  match.captains.B = ctx.from.id;

  await ctx.answerCbQuery("Captain B Selected");

  ctx.reply(`👑 ${getDisplayName(ctx.from)} is Captain of Team B`);

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

    if (captainId) {
      const captain = teamArray.find(p => p.id === captainId);
      if (captain) {
        list.push(`1. 👑 ${captain.name} (Captain)`);
      }
    }

    const others = teamArray.filter(p => p.id !== captainId);

    others.forEach(p => {
      list.push(`${list.length + 1}. ${p.name}`);
    });

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

// ================= CAPCHANGE =================

bot.command("capchange", async (ctx) => {

  if (ctx.chat.type === "private") return;

  if (match.phase === "idle")
    return ctx.reply("❌ No active match.");

  if (ctx.from.id !== match.host)
    return ctx.reply("❌ Only host can change captain.");

  const args = ctx.message.text.split(" ");

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
    index: number - 1,
    playerId: newCaptainId
  };

  const name = getName(newCaptainId);

  await ctx.reply(
    `⚠️ Confirm Captain Change?

Team ${teamLetter}
New Captain: ${name}`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Confirm", callback_data: "confirm_cap_change" },
            { text: "❌ Cancel", callback_data: "cancel_cap_change" }
          ]
        ]
      }
    }
  );
});

bot.action("confirm_cap_change", async (ctx) => {

  if (!match.pendingCaptainChange)
    return ctx.answerCbQuery("Expired.");

  if (ctx.from.id !== match.host)
    return ctx.answerCbQuery("Only host can confirm.");

  const { team, playerId } = match.pendingCaptainChange;

  if (team === "A")
    match.captains.A = playerId;
  else
    match.captains.B = playerId;

  match.pendingCaptainChange = null;

  const mention = `<a href="tg://user?id=${playerId}">${getName(playerId)}</a>`;

  await ctx.editMessageText(
    `👑 Captain Updated Successfully!\n\n` +
    `${mention} is now the new Captain of Team ${team}!`,
    { parse_mode: "HTML" }
  );
});


bot.action("cancel_cap_change", async (ctx) => {

  if (ctx.from.id !== match.host)
    return ctx.answerCbQuery("Only host can cancel.");

  match.pendingCaptainChange = null;

  await ctx.editMessageText("❌ Captain change cancelled.");
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

bot.command("setovers", ctx => {

  if (!isHost(ctx.from.id)) return;

  const args = ctx.message.text.split(" ");
  const overs = parseInt(args[1]);

  if (isNaN(overs) || overs <= 0)
    return ctx.reply("Enter valid overs.");

  match.totalOvers = overs;
  match.currentOver = 0;
  match.currentBall = 0;
  match.score = 0;
  match.wickets = 0;
  match.usedBatters = [];

  match.phase = "set_striker";

  ctx.reply(
  `Overs set: ${overs}

  Send STRIKER in group:
  /batter 1`
  ); 
  
})
/* ================= SET BATTER ================= */

bot.command("batter", ctx => {

  if (!isHost(ctx.from.id)) return;

  if (ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ Send batter number in GROUP only.");

  const num = parseInt(ctx.message.text.split(" ")[1]);
  if (!num) return ctx.reply("❌ Provide batter number");

  const players = orderedBattingPlayers(); // ✅ USE ORDERED

  if (num < 1 || num > players.length)
    return ctx.reply("❌ Invalid number");

  const selected = players[num - 1];

  if (!selected)
    return ctx.reply("⚠️ Player not found");

  if (match.usedBatters.includes(selected.id))
    return ctx.reply("⚠️ Player already batted / dismissed");

  const name = selected.name;
  const orderNumber = match.usedBatters.length + 1;

  const ordinal = n => {
    const s = ["th","st","nd","rd"];
    const v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  };

  // STRIKER
  if (match.phase === "set_striker") {

    match.striker = selected.id;
    if (!match.batterStats[selected.id]) {
      match.batterStats[selected.id] = { runs: 0, balls: 0 };
    }
    match.usedBatters.push(selected.id);
    match.phase = "set_non_striker";

    return ctx.reply(
`🏏 ${name} is ${ordinal(orderNumber)} batter at STRIKER end

Now send NON-STRIKER:
/batter number`);
  }

  // NON STRIKER
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

  // NEW BATTER
  if (match.phase === "new_batter") {

    if (selected.id === match.nonStriker)
      return ctx.reply("⚠️ Choose different player");

    match.striker = selected.id;
    if (!match.batterStats[selected.id]) {
      match.batterStats[selected.id] = { runs: 0, balls: 0 };
    }
    match.usedBatters.push(selected.id);
    match.phase = "play";

    ctx.reply(`🏏 ${name} is ${ordinal(orderNumber)} batter`);

    return startBall();
  }

});
/* ================= SET BOWLER ================= */

bot.command("bowler", async (ctx) => {

  if (match.phase !== "set_bowler")
    return ctx.reply("⚠️ You can set bowler only when bot asks.");

  if (ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ This match is not running here.");

  if (!isHost(ctx.from.id))
    return ctx.reply("❌ Only host can set bowler.");

  const text = ctx.message.text.split(" ");
  if (text.length < 2)
    return ctx.reply("⚠️ Use: /bowler <number>");

  const num = parseInt(text[1]);
  if (!num) return ctx.reply("Invalid number");

  // ✅ ORDERED BOWLING PLAYERS
  const players = (() => {
    const base = bowlingPlayers();
    const captainId =
      match.bowlingTeam === "A"
        ? match.captains.A
        : match.captains.B;

    return [
      ...base.filter(p => p.id === captainId),
      ...base.filter(p => p.id !== captainId)
    ];
  })();

  if (num < 1 || num > players.length)
    return ctx.reply("⚠️ Invalid player number.");

  const player = players[num - 1];

  if (match.lastOverBowler === player.id)
    return ctx.reply("⚠️ Same bowler cannot bowl consecutive overs.");

  // Suspended bowler restriction
  if (match.suspendedBowlers[player.id] &&
    match.suspendedBowlers[player.id] >= match.currentOver)
   return ctx.reply("⚠️ This bowler is suspended for this over.");

  match.bowler = player.id;

  match.overHistory.push({
    over: match.currentOver + 1,
    bowler: match.bowler,
    balls: []
  });
  match.phase = "play";

  match.awaitingBat = false;
  match.awaitingBowl = true;

  const botInfo = await bot.telegram.getMe();

  await ctx.reply(
`🎯 Bowler Selected: ${player.name}

📩 Bowler open DM and send number`,
    Markup.inlineKeyboard([
      Markup.button.url(
        "📨 Open Bot DM",
        `https://t.me/${BOT_USERNAME}`
      )
    ])
  );

  advanceGame();
});


// ================= OVER COMPLETION =================

function handleOverCompletion() {

  if (match.currentBall < 6) return false;

  if (match.currentOverRuns === 0) {
    bot.telegram.sendMessage(
      match.groupId,
      `🎯 ${getName(match.bowler)}\n${randomLine("maiden")}`
    );
  }

  match.currentOver++;
  match.currentBall = 0;
  match.currentOverRuns = 0;
  match.wicketStreak = 0;

  // 🔥 Over limit check
  if (match.currentOver >= match.totalOvers) {
    endInnings();
    return true;   // VERY IMPORTANT
}
  match.lastOverBowler = match.bowler;
  swapStrike();

  setPhase("set_bowler");

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

function getLiveScore() {

  if (!match) return "⚠️ No active match.";

  const overs = `${match.currentOver}.${match.currentBall}`;
  const ballsBowled = (match.currentOver * 6) + match.currentBall;
  const totalBalls = (match.totalOvers || 0) * 6;
  const ballsLeft = totalBalls - ballsBowled;

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
    match.bowlerStats?.[match.bowler]?.history?.filter(x => x === 0).length || 0;

  const overHistoryFormatted = match.overHistory
    .map((o, index) => `${index + 1}: ${o.balls.join(" ")}`)
    .join(" | ");

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
⭐ ${getName(match.striker)}*  ${strikerStats.runs}(${strikerStats.balls})  SR:${strikerSR}
   ${getName(match.nonStriker)}  ${nonStrikerStats.runs}(${nonStrikerStats.balls})  SR:${nonStrikerSR}

🎯 Bowler
${getName(match.bowler)}
${bowlerOvers}-${dots}-${bowlerStats.runs}-${bowlerStats.wickets}  Econ:${economy}

🤝 Partnership: ${match.currentPartnershipRuns} (${match.currentPartnershipBalls})

📜 Overs: ${overHistoryFormatted || "Yet to start"}
`;
}
bot.command("score", (ctx) => {
  if (!match || !match.groupId)
    return ctx.reply("⚠️ No active match.");

  ctx.reply(getLiveScore());
});


 /* ================= BALL TIMEOUT ================= */

function ballTimeout() {

  clearTimers();

  /* ================= BOWLER MISSED ================= */

  if (match.awaitingBowl) {

    match.awaitingBowl = false;
    match.bowlerMissCount++;

    match.score += 6;

    bot.telegram.sendMessage(
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

      return bot.telegram.sendMessage(
        match.groupId,
`🚫 Bowler removed due to consecutive delays.
Cannot bowl this over and next over.

Host select new bowler:
/bowler number`
      );
    }
    if (handleOverCompletion()) return;
    return advanceGame();
  }

  /* ================= BATTER MISSED ================= */
  if (match.awaitingBat) {

    match.awaitingBat = false;
    match.batterMissCount++;

    match.currentBall++;
    match.score -= 6;

    if (!match.batterStats[match.striker])
      match.batterStats[match.striker] = { runs: 0, balls: 0 };

    match.batterStats[match.striker].runs -= 6;
    match.batterStats[match.striker].balls++;

    bot.telegram.sendMessage(
      match.groupId,
`⚠️ Batter missed!
-6 runs penalty (Ball counted)`
    );

    if (match.batterMissCount >= 2) {

      match.batterMissCount = 0;
      match.wickets++;

      bot.telegram.sendMessage(
        match.groupId,
        "❌ Batter OUT due to consecutive delay!"
      );

      if (match.wickets >= match.maxWickets)
        return endInnings();

      match.phase = "new_batter";

      return bot.telegram.sendMessage(
        match.groupId,
        "📢 Send new batter:\n/batter number"
      );
    }

    if (handleOverCompletion()) return;

    return advanceGame();
  }
}


// ================= ANNOUNCE BALL =================


   async function announceBall() {

     if (!match.bowler || !match.striker) return;

     match.ballLocked = false;
     match.batNumber = null;
     match.bowlNumber = null;

  // 🔥 FORCE PING (works even without username)
     const bowlerPing = `[🎯 ${getName(match.bowler)}](tg://user?id=${match.bowler})`;

     await bot.telegram.sendMessage(
       match.groupId,
       `${bowlerPing}\n\n${randomBowlingPrompt()}`,
       {
         parse_mode: "Markdown",
         ...bowlDMButton()
       }
     );
      // 🔥 Extra DM reminder to bowler (every ball)
     await bot.telegram.sendMessage(
       match.bowler,
       "Send number 1-6 in bot DM."
     ).catch(() => {});
}


// ================= TIMER CONTROLLER =================

function startTurnTimer(type) {

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

  match.ballTimer = setTimeout(ballTimeout, 60000);
}



// ================= SAFE PHASE SETTER =================

function setPhase(newPhase) {
  console.log(`PHASE: ${match.phase} → ${newPhase}`);
  match.phase = newPhase;
}

/* ================= START BALL ================= */

async function startBall() {

  if (match.phase === "switch") return;   // 🔥 HARD STOP
  if (match.currentOver >= match.totalOvers) return;
  if (match.wickets >= match.maxWickets) return;

  clearTimers();

  match.awaitingBowl = true;
  match.awaitingBat = false;

  await announceBall();
  startTurnTimer("bowl");
}
  
/* ================= HANDLE INPUT ================= */

bot.on("text", async (ctx, next) => {

  // 🔥 Let commands pass through
  if (ctx.message.text.startsWith("/")) {
    return next();
  }


  /* ================= GROUP BATTER INPUT ================= */

  if (ctx.chat.type !== "private") {

    if (!match) return;

    if (match.phase !== "play") return;

    if (!match.awaitingBat) return;

    if (ctx.from.id !== match.striker)
      return ctx.reply("❌ You are not the striker.");

    const text = ctx.message.text.trim();

    if (!/^[0-6]$/.test(text))
      return ctx.reply("❌ Send number between 0-6.");

    if (match.ballLocked)
      return ctx.reply("⚠️ Already submitted.");

    match.ballLocked = true;

    match.batNumber = Number(text);
    match.awaitingBat = false;

    clearTimers();

    return processBall();
  }

  /* ================= PRIVATE BOWLER INPUT ================= */

  if (!match) return;

  if (match.phase !== "play") 
    return ctx.reply("⚠️ No active ball.");

  if (!match.awaitingBowl)
    return ctx.reply("⏳ Not accepting bowl now.");

  if (ctx.from.id !== match.bowler)
    return ctx.reply("❌ You are not the current bowler.");

  const text = ctx.message.text.trim();

  if (!/^[1-6]$/.test(text))
    return ctx.reply("❌ Send number between 1-6.");

  if (match.ballLocked)
    return ctx.reply("⚠️ Already submitted for this ball.");



  match.bowlNumber = Number(text);
  match.awaitingBowl = false;
  match.awaitingBat = true;

  clearTimers();

  await ctx.reply("✅ Ball submitted!");

  const batterPing = `[🏏 ${getName(match.striker)}](tg://user?id=${match.striker})`;

  const ballNumber = `${match.currentOver}.${match.currentBall + 1}`;

  await bot.telegram.sendMessage(
    match.groupId,
    `${batterPing}\n\n${randomBatterPrompt()}\n\n🎱 Ball: ${ballNumber}`,
    {
      parse_mode: "Markdown"
    }
);

  startTurnTimer("bat");
});




/* ================= PROCESS BALL ================= */


async function processBall() {

  match.bowlerMissCount = 0;
  match.batterMissCount = 0;
  clearTimers();

  const bat = match.batNumber;
  const bowl = match.bowlNumber;

  // 🔥 Prevent 0 on hattrick ball
  if (match.wicketStreak === 2 && bat === 0) {

    await bot.telegram.sendMessage(
      match.groupId,
      "🔥 HATTRICK BALL! Batter cannot play 0!"
    );

    match.awaitingBat = true;
    startTurnTimer("bat");
    return;
  }

  if (!match.batterStats[match.striker]) {
    match.batterStats[match.striker] = { runs: 0, balls: 0 };
  }

  match.batterStats[match.striker].balls++;

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
    match.overHistory[match.overHistory.length - 1]
      ?.balls.push("W");

    match.currentPartnershipBalls++;

    let line = (match.wicketStreak === 3)
      ? randomLine("hattrick")
      : randomLine("wicket");

    // ✅ Commentary FIRST
    await bot.telegram.sendMessage(
      match.groupId,
      `${line}`
    );

    // 🤝 Partnership broken
    await bot.telegram.sendMessage(
      match.groupId,
      `🤝 Partnership Broken!
Runs: ${match.currentPartnershipRuns}
Balls: ${match.currentPartnershipBalls}`
    );

    match.currentPartnershipRuns = 0;
    match.currentPartnershipBalls = 0;

    if (match.wickets >= match.maxWickets) {
      return endInnings();
    }

    if (handleOverCompletion()) return;

    match.phase = "new_batter";

    return bot.telegram.sendMessage(
      match.groupId,
      "📢 Send new batter:\n/batter number"
    );
  }

  /* ================= RUNS ================= */

  match.score += bat;
  match.currentOverRuns += bat;

  match.currentPartnershipRuns += bat;
  match.currentPartnershipBalls++;

  match.batterStats[match.striker].runs += bat;
  match.bowlerStats[match.bowler].runs += bat;

  match.currentBall++;
  match.overHistory[match.overHistory.length - 1]
    ?.balls.push(bat);

  match.wicketStreak = 0;

  if (match.currentPartnershipRuns === 50) {
    await bot.telegram.sendMessage(match.groupId, "🔥 50 Run Partnership!");
  }

  if (match.currentPartnershipRuns === 100) {
    await bot.telegram.sendMessage(match.groupId, "💯 100 Run Partnership!");
  }

  // ✅ Commentary FIRST
  await bot.telegram.sendMessage(
    match.groupId,
    `${randomLine(bat)}`
  );

  // ✅ Rotate strike BEFORE next ball alert
  if ([1,3,5].includes(bat))
    swapStrike();

  // 🏁 Chase check
  if (
    match.innings === 2 &&
    match.score > match.firstInningsScore
  ) {
    return endMatchWithWinner(match.battingTeam);
  }

  // 🔄 Over completion check
  if (handleOverCompletion()) return;

  advanceGame();

  /* ================= TARGET CHECK ================= */

  if (
    match.innings === 2 &&
    match.score > match.firstInningsScore
  ) {
    return endMatchWithWinner(match.battingTeam);
  }


   if (handleOverCompletion()) return;

   

  advanceGame();
}
/* ================= END INNINGS ================= */

function endInnings() {

  clearTimers();

  // 🥇 FIRST INNINGS
  if (match.innings === 1) {

    match.firstInningsScore = match.score;

    // Lock state properly
    match.phase = "switch";
    match.awaitingBat = false;
    match.awaitingBowl = false;

    return bot.telegram.sendMessage(
      match.groupId,
`🏁 First Innings Completed

Score: ${match.score}/${match.wickets}

Host type:
/inningsswitch`
    );
  }

  // 🥈 SECOND INNINGS RESULT

  if (match.score > match.firstInningsScore) {
    return endMatchWithWinner(match.battingTeam);
  }

  if (match.score < match.firstInningsScore) {
    return endMatchWithWinner(match.bowlingTeam);
  }

  bot.telegram.sendMessage(match.groupId, "🤝 Match Tied!");
  return resetMatch();
}
/* ================= INNINGS SWITCH ================= */

bot.command("inningsswitch", async (ctx) => {

  // 🔎 Match exists?
  if (!match || !match.groupId) {
    return ctx.reply("⚠️ No active match.");
  }

  // 🔐 Host check (using match.host)
  if (String(ctx.from.id) !== String(match.host)) {
    return ctx.reply("❌ Only the match host can switch innings.");
  }

  // 🔄 Phase check
  if (match.phase !== "switch") {
    return ctx.reply(
      `⚠️ Cannot switch innings now.\nCurrent phase: ${match.phase}`
    );
  }

  // 🏏 Move to 2nd innings
  match.innings = 2;

  // 🔁 Swap teams
  const tempTeam = match.battingTeam;
  match.battingTeam = match.bowlingTeam;
  match.bowlingTeam = tempTeam;

  // 🔁 Reset innings stats
  match.score = 0;
  match.wickets = 0;
  match.currentOver = 0;
  match.currentBall = 0;
  match.currentOverNumber = 0;
  match.currentPartnershipRuns = 0;
  match.currentPartnershipBalls = 0;
  match.currentOverRuns = 0;
  match.wicketStreak = 0;
  match.bowlerMissCount = 0;
  match.batterMissCount = 0;

  match.usedBatters = [];
  match.striker = null;
  match.nonStriker = null;
  match.bowler = null;
  match.lastBowler = null;
  match.suspendedBowlers = {};
  match.overHistory = [];
  match.currentOverBalls = [];
  match.awaitingBat = false;
  match.awaitingBowl = false;

  // 🟢 Start second innings properly
  match.phase = "set_striker";

  return ctx.reply(
`🔁 Innings Switched Successfully!

🏏 Now Batting: ${match.battingTeam}
🎯 Target: ${match.firstInningsScore + 1}

Set STRIKER:
/batter number`
  );
});

/* ================= DECLARE WINNER ================= */

function endMatchWithWinner(team) {
  const winnerName =
    team === "A"
      ? match.teamAName
      : match.teamBName;

  bot.telegram.sendMessage(
    match.groupId,
    `🏆 ${winnerName} Wins!

📊 Final Score:
Innings 1: ${match.firstInningsScore}
Innings 2: ${match.score}`
  );

  resetMatch();
}
bot.catch(err => {
  console.error("BOT ERROR:", err);
});

bot.launch();
console.log("🏏 FULL HAND CRICKET BOT RUNNING...");
