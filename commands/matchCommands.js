const { Markup } = require("telegraf");
const User = require("../User");
const {
  getMatch,
  resetMatch,
  matches,
  deleteMatch
} = require("../matchManager");
const box          = require("../utils/boxMessage");
const archiveMatch = require("../utils/archiveMatch");

module.exports = function (bot, helpers) {

  const { clearTimers, clearActiveMatchPlayers, clearDelayTimers } = helpers;


  /* ================= START ================= */

  bot.command("start", async (ctx, next) => {

    if (ctx.chat.type === "private") return next();

    let match = getMatch(ctx);

    console.log("[START] phase:", match?.phase, "matchEnded:", match?.matchEnded, "host:", match?.host);

    if (match && !match.matchEnded && match.phase !== "idle" && match.phase !== "host_select" && match.phase !== "team_create") {
      console.log("[START] BLOCKED — match still active");
      return ctx.reply("⚠️ A match is already running.");
    }

    try {
      const { id, username, first_name, last_name } = ctx.from;
      await User.updateOne(
        { telegramId: String(id) },
        {
          $set: {
            telegramId:  String(id),
            username:    username?.toLowerCase(),
            firstName:   first_name,
            lastName:    last_name
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
    match.phase   = "host_select";

    console.log("[START] New match created, phase:", match.phase);

    ctx.reply(
"🏏 Match Lobby\n\n<blockquote>A new match is starting!\nFirst player to press becomes host.</blockquote>",
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("👑 Become Host", "select_host")]
        ])
      }
    );
  });


  /* ================= END MATCH ================= */

  bot.command("endmatch", async (ctx) => {

    const match = getMatch(ctx);

    console.log("[ENDMATCH] phase:", match?.phase, "host:", match?.host);

    if (!match || match.phase === "idle")
      return ctx.reply("⚠️ No active match running.");

    let isAdmin = false;
    try {
      const member = await ctx.getChatMember(ctx.from.id);
      isAdmin = ["administrator", "creator"].includes(member.status);
    } catch {}

    console.log("[ENDMATCH] isAdmin:", isAdmin, "from:", ctx.from.id, "match.host:", match.host);

    if (match.host !== null && ctx.from.id !== match.host && !isAdmin)
      return ctx.reply("❌ Only host or admin can end the match.");

    ctx.reply(
"⚠️ End Match?\n\n<blockquote>This cannot be undone.</blockquote>",
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("✅ Confirm", "confirm_end"),
            Markup.button.callback("❌ Cancel",  "cancel_end")
          ]
        ])
      }
    );
  });


  /* ================= CONFIRM END ================= */

  bot.action("confirm_end", async (ctx) => {

    const match = getMatch(ctx);

    console.log("[CONFIRM_END] match exists:", !!match, "phase:", match?.phase, "host:", match?.host);

    if (!match) return;

    let isAdmin = false;
    try {
      const member = await ctx.getChatMember(ctx.from.id);
      isAdmin = ["administrator", "creator"].includes(member.status);
    } catch {}

    if (match.host !== null && ctx.from.id !== match.host && !isAdmin)
      return ctx.answerCbQuery("Only host or admin can confirm.");

    try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch {}

    // ── Save match snapshot to MongoDB + send JSON file ──
    // sendTo: sends the file back to the group itself.
    // Change match.groupId to your personal admin Telegram ID (a number)
    // if you want it sent privately instead, e.g.: 764519233
    await archiveMatch(match, "force_ended", ctx.telegram, match.groupId);

    await ctx.reply(
"🛑 Match Ended\n\n<blockquote>Match data has been saved.\n👉 /start to begin a new match</blockquote>",
      { parse_mode: "HTML" }
    );

    clearTimers(match);
    clearDelayTimers(match);
    clearActiveMatchPlayers(match);
    match.phase      = "idle";
    match.matchEnded = true;
    match.inningsEnded = true;

    console.log("[CONFIRM_END] calling deleteMatch for groupId:", match.groupId);
    deleteMatch(match.groupId);
    console.log("[CONFIRM_END] match deleted. matches.has:", matches.has(match.groupId));
  });


  /* ================= CANCEL END ================= */

  bot.action("cancel_end", async (ctx) => {
    try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch {}
    ctx.answerCbQuery("Cancelled.");
  });

};