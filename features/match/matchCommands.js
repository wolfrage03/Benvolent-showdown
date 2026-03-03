const store = require("../../state/inMemoryStore");

module.exports = (bot) => {

  
/* ================= START ================= */

bot.command("start", async (ctx) => {

  if (ctx.chat.type === "private") return;

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

  match = resetMatch(ctx.chat.id); // ✅ important

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
  if (!match) return;

  if (match.phase !== "host_select")
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

});

