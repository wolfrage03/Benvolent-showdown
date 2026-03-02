// commands/host.js

const { Markup } = require("telegraf");
const { getMatch } = require("../engine/matchEngine");
const { getRandomTeams, getPlayerTeam, getDisplayName } =
  require("../utils/helpers");

function registerHost(bot) {

  /* ================= SELECT HOST ================= */

  bot.action("select_host", (ctx) => selectHost(ctx));
  bot.command("changehost", (ctx) => changeHost(ctx));

  bot.action("vote_host_change", (ctx) => voteHostChange(ctx));
  bot.action("take_host", (ctx) => takeHost(ctx));
  bot.action("cancel_host_vote", (ctx) => cancelHostVote(ctx));
}

module.exports = registerHost;


/* ================= SELECT HOST ================= */

async function selectHost(ctx) {

  const match = getMatch(ctx.chat.id);
  if (!match) return;

  if (match.phase !== "host_select") {
    await ctx.answerCbQuery("Host already selected");
    return;
  }

  // 🔒 Lock immediately
  match.phase = "host_locked";

  match.host = ctx.from.id;
  match.phase = "team_create";

  const selected = getRandomTeams();
  match.teamAName = selected[0];
  match.teamBName = selected[1];

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
  await ctx.answerCbQuery();

  await ctx.reply(`👑 Host Selected: ${ctx.from.first_name}`);
  await ctx.reply("Host use /createteam to create teams.");
}


/* ================= CHANGE HOST ================= */

async function changeHost(ctx) {

  const match = getMatch(ctx.chat.id);
  if (!match) return ctx.reply("No active match.");

  if (!["team_create", "pre_match"].includes(match.phase))
    return ctx.reply("⚠️ Host cannot be changed during active gameplay.");

  if (match.hostChange?.active)
    return ctx.reply("⚠️ Host change voting already active.");

  const userId = ctx.from.id;

  if (userId === match.host)
    return showHostSelection(ctx, match);

  const isPlayer =
    match.teamA.some(p => p.id === userId) ||
    match.teamB.some(p => p.id === userId);

  if (!isPlayer)
    return ctx.reply("❌ Only playing members can request host change.");

  return startHostVoting(ctx, match);
}


/* ================= START HOST VOTING ================= */

async function startHostVoting(ctx, match) {

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

  const msg = await ctx.reply(getVoteText(match), {
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Vote for Host Change", callback_data: "vote_host_change" }],
        [{ text: "❌ Cancel Voting", callback_data: "cancel_host_vote" }]
      ]
    }
  });

  match.hostChange.messageId = msg.message_id;

  match.hostChange.timeout = setTimeout(async () => {

    const m = matches.get(match.groupId);
    if (!m?.hostChange?.active) return;

    try {
      await ctx.telegram.editMessageReplyMarkup(
        m.groupId,
        m.hostChange.messageId,
        null,
        { inline_keyboard: [] }
      );

      await ctx.telegram.sendMessage(
        m.groupId,
        "⏳ Host change voting expired."
      );
    } catch {}

    m.hostChange = null;

  }, 60000);
}


/* ================= VOTE ================= */

async function voteHostChange(ctx) {

  const match = getMatch(ctx.chat.id);

  if (!match?.hostChange?.active) {
    await ctx.answerCbQuery("Voting not active.");
    return;
  }

  const userId = ctx.from.id;
  const team = getPlayerTeam(match, userId);

  if (!team) {
    await ctx.answerCbQuery("Only match players can vote.");
    return;
  }

  if (match.hostChange.teamVotes[team].has(userId)) {
    await ctx.answerCbQuery("You already voted.");
    return;
  }

  match.hostChange.teamVotes[team].add(userId);

  await ctx.answerCbQuery("Vote counted.");

  const requiredA = Math.min(2, match.teamA.length);
  const requiredB = Math.min(2, match.teamB.length);

  if (
    match.hostChange.teamVotes.teamA.size >= requiredA &&
    match.hostChange.teamVotes.teamB.size >= requiredB
  ) {
    clearTimeout(match.hostChange.timeout);
    match.hostChange.active = false;
    return showHostSelection(ctx, match);
  }

  await ctx.editMessageText(getVoteText(match), {
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Vote for Host Change", callback_data: "vote_host_change" }],
        [{ text: "❌ Cancel Voting", callback_data: "cancel_host_vote" }]
      ]
    }
  }).catch(() => {});
}


/* ================= SHOW HOST SELECTION ================= */

async function showHostSelection(ctx, match) {

  if (!match.hostChange) return;

  match.hostChange.phase = "selection";

  if (match.hostChange.messageId) {
    await ctx.telegram.editMessageReplyMarkup(
      match.groupId,
      match.hostChange.messageId,
      null,
      { inline_keyboard: [] }
    ).catch(() => {});
  }

  const msg = await ctx.telegram.sendMessage(
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

async function takeHost(ctx) {

  const match = getMatch(ctx.chat.id);

  if (!match?.hostChange || match.hostChange.phase !== "selection") {
    await ctx.answerCbQuery("Not allowed.");
    return;
  }

  const userId = ctx.from.id;

  const isPlaying =
    match.teamA.some(p => p.id === userId) ||
    match.teamB.some(p => p.id === userId);

  if (isPlaying) {
    await ctx.answerCbQuery("Only non-playing members can become host.");
    return;
  }

  if (ctx.from.is_bot) {
    await ctx.answerCbQuery("Bots cannot become host.");
    return;
  }

  match.host = userId;
  match.hostChange = null;

  await ctx.answerCbQuery("You are now host.");
  await ctx.reply(`👑 ${getDisplayName(ctx.from)} is now the new host!`);
}


/* ================= CANCEL HOST VOTE ================= */

async function cancelHostVote(ctx) {

  const match = getMatch(ctx.chat.id);

  if (!match?.hostChange) {
    await ctx.answerCbQuery("No active process.");
    return;
  }

  const userId = ctx.from.id;

  if (match.hostChange.phase !== "selection" && userId !== match.host) {
    await ctx.answerCbQuery("Only host can cancel.");
    return;
  }

  clearTimeout(match.hostChange.timeout);

  try {
    await ctx.telegram.editMessageReplyMarkup(
      match.groupId,
      match.hostChange.messageId,
      null,
      { inline_keyboard: [] }
    );
  } catch {}

  await ctx.telegram.sendMessage(
    match.groupId,
    "❌ Host change cancelled."
  );

  match.hostChange = null;
  await ctx.answerCbQuery("Cancelled.");
}