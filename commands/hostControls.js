const { getMatch, matches } = require("../matchManager");
const { getRandomTeams } = require("../commentary");
const box = require("../utils/boxMessage");

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
`👑 Host Assigned\n\n${ctx.from.first_name}\n\n<blockquote>🔵 ${match.teamAName} 〔Team A〕\n🔴 ${match.teamBName} 〔Team B〕</blockquote>\n\n👉 /createteam to open lobby`,
      { parse_mode: "HTML" }
  );
});


/* ===============================================================
   CHANGEHOST COMMAND
   ---------------------------------------------------------------
   Two cases:
   1. Sender IS the current host
      → Skip voting entirely. Immediately show "Take Host" button
        so any non-playing member can grab the role.

   2. Sender is a match PLAYER (not host)
      → Start a 2-per-team vote. If it passes, show "Take Host".

   3. Anyone else → reject.
   =============================================================== */

bot.command("changehost", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ Use this command in the match group.");

  const userId = ctx.from.id;

  if (match.hostChange?.active)
    return ctx.reply("⚠️ Host change process already active.");

  /* ── CASE 1: Current host initiates directly ── */
  if (userId === match.host) {
    match.hostChange = {
      active: true,
      phase: "selection",   // skip voting, go straight to selection
      teamVotes: { teamA: new Set(), teamB: new Set() },
      messageId: null,
      timeout: null
    };
    return showHostSelection(match, ctx.telegram);
  }

  /* ── CASE 2: A player requests a vote ── */
  const isPlayer =
    match.teamA?.some(p => p.id === userId) ||
    match.teamB?.some(p => p.id === userId);

  if (!isPlayer)
    return ctx.reply("❌ Only the current host or match players can use /changehost.");

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
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Vote for Host Change", callback_data: "vote_host_change" }],
          [{ text: "❌ Cancel",               callback_data: "cancel_host_vote"  }]
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

    await bot.telegram.sendMessage(
      m.groupId,
      "⏱ Voting Expired\n\n<blockquote>No host change made.</blockquote>",
      { parse_mode: "HTML" }
    );

    m.hostChange = null;

  }, 60000);
}


function getVoteText(match) {
  const aVotes = match.hostChange.teamVotes.teamA.size;
  const bVotes = match.hostChange.teamVotes.teamB.size;

  return (
box("🗳 Host Change Vote", `🔵 〔Team A〕 ${match.teamAName}   ${aVotes}/2`, `🔴 〔Team B〕 ${match.teamBName}   ${bVotes}/2`, "───────────", "Need 2 votes from each team", "⏱ Closes in 60s")
  );
}


/* ================= VOTE ================= */

bot.action("vote_host_change", async (ctx) => {

  const match = getMatch(ctx);

  if (!match?.hostChange || match.hostChange.phase !== "voting")
    return ctx.answerCbQuery("Voting not active.");

  const userId = ctx.from.id;

  // Host themselves can cast a vote too (counts for their own override)
  const isPlayer =
    match.teamA?.some(p => p.id === userId) ||
    match.teamB?.some(p => p.id === userId);

  if (!isPlayer)
    return ctx.answerCbQuery("Only match players can vote.");

  const team = getPlayerTeam(match, userId);
  const teamKey = team === "A" ? "teamA" : "teamB";

  if (!team || !match.hostChange.teamVotes[teamKey])
    return ctx.answerCbQuery("Invalid team.");

  if (match.hostChange.teamVotes[teamKey].has(userId))
    return ctx.answerCbQuery("You already voted.");

  if (match.hostChange.teamVotes[teamKey].size >= 2)
    return ctx.answerCbQuery("Your team already has 2 votes.");

  match.hostChange.teamVotes[teamKey].add(userId);
  ctx.answerCbQuery("Vote counted ✅");

  try {
    await bot.telegram.editMessageText(
      match.groupId,
      match.hostChange.messageId,
      null,
      getVoteText(match),
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Vote for Host Change", callback_data: "vote_host_change" }],
            [{ text: "❌ Cancel",               callback_data: "cancel_host_vote"  }]
          ]
        }
      }
    );
  } catch {}

  const requiredA = Math.min(2, match.teamA?.length || 0);
  const requiredB = Math.min(2, match.teamB?.length || 0);

  if (
    match.hostChange.teamVotes.teamA.size >= requiredA &&
    match.hostChange.teamVotes.teamB.size >= requiredB
  ) {
    clearTimeout(match.hostChange.timeout);
    match.hostChange.active = false;

    // Remove voting buttons before showing selection
    try {
      await bot.telegram.editMessageReplyMarkup(
        match.groupId, match.hostChange.messageId, null, { inline_keyboard: [] }
      );
    } catch {}

    return showHostSelection(match, bot.telegram);
  }
});


/* ================= HOST SELECTION ================= */

async function showHostSelection(match, telegram) {

  match.hostChange.phase = "selection";

  const msg = await telegram.sendMessage(
    match.groupId,
    "✅ Host Change Approved\n\n<blockquote>A non-playing member can now tap below to take host.</blockquote>",
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "👑 Take Host", callback_data: "take_host"       }],
          [{ text: "❌ Cancel",    callback_data: "cancel_host_vote" }]
        ]
      }
    }
  );

  match.hostChange.messageId = msg.message_id;

  // Auto-expire selection after 60s
  match.hostChange.timeout = setTimeout(async () => {
    const m = matches.get(match.groupId);
    if (!m?.hostChange || m.hostChange.phase !== "selection") return;
    try {
      await bot.telegram.editMessageReplyMarkup(
        m.groupId, m.hostChange.messageId, null, { inline_keyboard: [] }
      );
    } catch {}
    await bot.telegram.sendMessage(m.groupId, "⏱ Host selection expired. No change made.");
    m.hostChange = null;
  }, 60000);
}


/* ================= TAKE HOST ================= */

bot.action("take_host", async (ctx) => {

  const match = getMatch(ctx);
  if (!match?.hostChange || match.hostChange.phase !== "selection")
    return ctx.answerCbQuery("Not allowed now.");

  const userId = ctx.from.id;
  const isPlaying =
    match.teamA?.some(p => p.id === userId) ||
    match.teamB?.some(p => p.id === userId);

  if (isPlaying)
    return ctx.answerCbQuery("Only non-playing members can become host.");

  if (ctx.from.is_bot)
    return ctx.answerCbQuery("Bots cannot become host.");

  // Clear selection timer
  if (match.hostChange.timeout) {
    clearTimeout(match.hostChange.timeout);
    match.hostChange.timeout = null;
  }

  match.host = userId;

  try {
    await bot.telegram.editMessageReplyMarkup(
      match.groupId, match.hostChange.messageId, null, { inline_keyboard: [] }
    );
  } catch {}

  match.hostChange = null;

  await bot.telegram.sendMessage(
    match.groupId,
    `👑 New Host\n\n<blockquote>${getDisplayName(ctx.from)}</blockquote>`,
    { parse_mode: "HTML" }
  );

  ctx.answerCbQuery("You are now host 👑");
});


/* ================= CANCEL HOST VOTE ================= */

bot.action("cancel_host_vote", async (ctx) => {

  const match = getMatch(ctx);
  if (!match?.hostChange) return ctx.answerCbQuery("No active process.");

  const userId = ctx.from.id;

  // Only the current host OR anyone if in selection phase (vote already passed)
  if (match.hostChange.phase === "voting" && userId !== match.host) {
    // Players can't cancel a vote they started — only host can cancel
    return ctx.answerCbQuery("Only the host can cancel the vote.");
  }

  if (match.hostChange.timeout) {
    clearTimeout(match.hostChange.timeout);
    match.hostChange.timeout = null;
  }

  try {
    await bot.telegram.editMessageReplyMarkup(
      match.groupId, match.hostChange.messageId, null, { inline_keyboard: [] }
    );
  } catch {}

  await bot.telegram.sendMessage(match.groupId, "✖️ Host Change Cancelled");

  match.hostChange = null;
  ctx.answerCbQuery("Cancelled.");
});


};