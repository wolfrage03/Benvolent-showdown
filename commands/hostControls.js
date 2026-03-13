const { getMatch, matches } = require("../matchManager");
const { getRandomTeams } = require("../commentary");

module.exports = function (bot, helpers) {

const { getDisplayName, getPlayerTeam } = helpers;


/* ================= HOST SELECT ================= */

bot.action("select_host", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.answerCbQuery("Match not found.");

  if (match.phase !== "host_select")
    return ctx.answerCbQuery("Host already selected.");

  await ctx.answerCbQuery("You are now the host 👑");

  match.host = ctx.from.id;
  match.phase = "team_create";

  const selected = getRandomTeams();
  match.teamAName = selected[0];
  match.teamBName = selected[1];

  try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch {}

  await ctx.reply(
`[ 👑 HOST ]  ${ctx.from.first_name}

Teams assigned:
🔵  ${match.teamAName}
🔴  ${match.teamBName}

Host: /createteam to open lobby`
  );
});


/* ================= HOST CHANGE ================= */

bot.command("changehost", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ Use this command in the match group.");

  const userId = ctx.from.id;

  if (match.hostChange?.active)
    return ctx.reply("⚠️ Host change voting already active.");

  if (userId === match.host)
    return showHostSelection(match);

  const isPlayer =
    match.teamA?.some(p => p.id === userId) ||
    match.teamB?.some(p => p.id === userId);

  if (!isPlayer)
    return ctx.reply("❌ Only match players can request a host change.");

  return startHostVoting(match, ctx);
});


/* ================= HOST VOTING ================= */

async function startHostVoting(match, ctx) {

  match.hostChange = {
    active: true,
    phase: "voting",
    teamVotes: { teamA: new Set(), teamB: new Set() },
    messageId: null,
    timeout: null
  };

  const msg = await ctx.reply(
    getVoteText(match),
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅  Vote for Host Change", callback_data: "vote_host_change" }],
          [{ text: "❌  Cancel",               callback_data: "cancel_host_vote"  }]
        ]
      }
    }
  );

  match.hostChange.messageId = msg.message_id;

  match.hostChange.timeout = setTimeout(async () => {

    const m = matches.get(match.groupId);
    if (!m?.hostChange?.active) return;

    try {
      await bot.telegram.editMessageReplyMarkup(
        m.groupId, m.hostChange.messageId, null, { inline_keyboard: [] }
      );
    } catch {}

    await bot.telegram.sendMessage(m.groupId, "[ HOST CHANGE ]\n\nVoting expired.");
    m.hostChange = null;

  }, 60000);
}


function getVoteText(match) {
  const aVotes = match.hostChange.teamVotes.teamA.size;
  const bVotes = match.hostChange.teamVotes.teamB.size;

  return `[ HOST CHANGE VOTE ]

Team A  —  ${aVotes} / 2 votes
Team B  —  ${bVotes} / 2 votes

Need 2 votes from each team.
Voting closes in 60 seconds.`;
}


/* ================= VOTE ================= */

bot.action("vote_host_change", async (ctx) => {

  const match = getMatch(ctx);

  if (!match?.hostChange || match.hostChange.phase !== "voting")
    return ctx.answerCbQuery("Voting not active.");

  const userId = ctx.from.id;
  const isPlayer =
    match.teamA?.some(p => p.id === userId) ||
    match.teamB?.some(p => p.id === userId);

  if (!isPlayer)
    return ctx.answerCbQuery("Only match players can vote.");

  const team = getPlayerTeam(match, userId);
  if (!team || !match.hostChange.teamVotes[team])
    return ctx.answerCbQuery("Invalid team.");

  if (match.hostChange.teamVotes[team].has(userId))
    return ctx.answerCbQuery("You already voted.");

  if (match.hostChange.teamVotes[team].size >= 2)
    return ctx.answerCbQuery("Your team already has 2 votes.");

  match.hostChange.teamVotes[team].add(userId);
  ctx.answerCbQuery("Vote counted.");

  try {
    await bot.telegram.editMessageText(
      match.groupId,
      match.hostChange.messageId,
      null,
      getVoteText(match),
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅  Vote for Host Change", callback_data: "vote_host_change" }],
            [{ text: "❌  Cancel",               callback_data: "cancel_host_vote"  }]
          ]
        }
      }
    );
  } catch {}

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

  if (!match.hostChange) return;

  match.hostChange.phase = "selection";

  if (match.hostChange?.messageId) {
    try {
      await bot.telegram.editMessageReplyMarkup(
        match.groupId, match.hostChange.messageId, null, { inline_keyboard: [] }
      );
    } catch {}
  }

  const msg = await bot.telegram.sendMessage(
    match.groupId,
`[ HOST SELECTION ]

Voting passed.
A non-playing member can now take host.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "👑  Take Host", callback_data: "take_host"        }],
          [{ text: "❌  Cancel",    callback_data: "cancel_host_vote"  }]
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
    match.teamA?.some(p => p.id === userId) ||
    match.teamB?.some(p => p.id === userId);

  if (isPlaying)
    return ctx.answerCbQuery("Only non-playing members can become host.");

  if (ctx.from.is_bot)
    return ctx.answerCbQuery("Bots cannot become host.");

  match.host = userId;

  try {
    await bot.telegram.editMessageReplyMarkup(
      match.groupId, match.hostChange.messageId, null, { inline_keyboard: [] }
    );
  } catch {}

  match.hostChange = null;

  await bot.telegram.sendMessage(
    match.groupId,
    `[ 👑 NEW HOST ]  ${getDisplayName(ctx.from)}`
  );

  ctx.answerCbQuery("You are now host.");
});


/* ================= CANCEL HOST VOTE ================= */

bot.action("cancel_host_vote", async (ctx) => {

  const match = getMatch(ctx);
  if (!match?.hostChange) return ctx.answerCbQuery("No active process.");

  const userId = ctx.from.id;
  if (match.hostChange.phase !== "selection" && userId !== match.host)
    return ctx.answerCbQuery("Only host can cancel.");

  clearTimeout(match.hostChange.timeout);

  try {
    await bot.telegram.editMessageReplyMarkup(
      match.groupId, match.hostChange.messageId, null, { inline_keyboard: [] }
    );
  } catch {}

  await bot.telegram.sendMessage(match.groupId, "[ ✗ ]  Host change cancelled.");
  match.hostChange = null;
  ctx.answerCbQuery("Cancelled.");
});


};