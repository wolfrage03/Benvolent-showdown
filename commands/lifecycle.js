const { Markup } = require("telegraf");
const User = require("../models/User");
const { getMatch, resetMatch, clearTimers } = require("../utils/match");

/* ================= REGISTER ================= */

function registerLifecycle(bot) {
  bot.command("start", handleStart);
  bot.command("endmatch", handleEndMatch);

  bot.action("confirm_end", confirmEndMatch);
  bot.action("cancel_end", cancelEndMatch);
}

module.exports = registerLifecycle;

/* ================= HELPERS ================= */

function getActiveMatch(ctx) {
  return getMatch(ctx); // ✅ Correct usage
}

async function saveUser(ctx) {
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
}

async function isHostOrAdmin(ctx, match) {
  if (!match) return false;

  if (ctx.from.id === match.host) return true;

  try {
    const member = await ctx.getChatMember(ctx.from.id);
    return ["administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

function cleanupMatch(match) {
  if (!match) return;

  clearTimers(match);

  // Safety unlock
  match.ballLocked = false;
  match.awaitingBat = false;
  match.awaitingBowl = false;

  // Fully reset
  resetMatch(match.groupId);
}

/* ================= START MATCH ================= */

async function handleStart(ctx) {

  if (ctx.chat.type === "private") return;

  let match = getActiveMatch(ctx);

  if (match && match.phase && match.phase !== "idle") {
    return ctx.reply("⚠️ A match is already running.");
  }

  await saveUser(ctx);

  match = resetMatch(ctx.chat.id);
  match.phase = "host_select";

  return ctx.reply(
    "🏏 Match Starting!\n\nSelect Host:",
    Markup.inlineKeyboard([
      [Markup.button.callback("Become Host", "select_host")]
    ])
  );
}

/* ================= END MATCH ================= */

async function handleEndMatch(ctx) {

  if (ctx.chat.type === "private")
    return ctx.reply("❌ Use this in group.");

  const match = getActiveMatch(ctx);

  if (!match || match.phase === "idle")
    return ctx.reply("⚠️ No active match running.");

  if (ctx.chat.id !== match.groupId)
    return ctx.reply("⚠️ This match is not running in this group.");

  if (match.resultDeclared)
    return ctx.reply("⚠️ Match already completed.");

  const allowed = await isHostOrAdmin(ctx, match);
  if (!allowed)
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
}

/* ================= CONFIRM END ================= */

async function confirmEndMatch(ctx) {

  const match = getActiveMatch(ctx);
  if (!match) return;

  const allowed = await isHostOrAdmin(ctx, match);
  if (!allowed)
    return ctx.answerCbQuery("Only host/admin can confirm.");

  await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply("🛑 Match Ended Successfully.");

  cleanupMatch(match);
}

/* ================= CANCEL END ================= */

async function cancelEndMatch(ctx) {

  const match = getActiveMatch(ctx);
  if (!match) return;

  if (ctx.from.id !== match.host)
    return ctx.answerCbQuery("Only host can cancel.");

  await ctx.editMessageReplyMarkup().catch(() => {});
  return ctx.answerCbQuery("Cancelled.");
}