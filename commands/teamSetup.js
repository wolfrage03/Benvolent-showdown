const { Markup } = require("telegraf");
const User = require("../models/User");
const { getMatch, isHost } = require("../engine/matchEngine");

module.exports = function registerTeamSetup(bot) {

  /* ================= ADD PLAYER ================= */

  bot.command("add", async (ctx) => {

    const match = getMatch(ctx.chat.id);
    if (!match || ctx.chat.id !== match.groupId)
      return ctx.reply("⚠️ No active match.");

    if (!isHost(match, ctx.from.id))
      return ctx.reply("❌ Only host can add players.");

    const args = ctx.message.text.trim().split(/\s+/);

    if (args.length < 3)
      return ctx.reply("Usage:\n/add A @username\n/add B userID\nOr reply to user + /add A");

    const team = args[1].toUpperCase();
    if (!["A","B"].includes(team))
      return ctx.reply("❌ Team must be A or B.");

    let userId;
    let name;

    if (ctx.message.reply_to_message) {

      const repliedUser = ctx.message.reply_to_message.from;

      if (repliedUser.is_bot)
        return ctx.reply("❌ Cannot add bot.");

      userId = repliedUser.id;
      name = repliedUser.username
        ? `@${repliedUser.username}`
        : repliedUser.first_name;

    } else {

      const input = args[2];

      if (input.startsWith("@")) {

        const username = input.replace("@","").toLowerCase();
        const user = await User.findOne({ username });

        if (!user)
          return ctx.reply("❌ User not found.");

        userId = Number(user.telegramId);
        name = `@${username}`;

      } else if (!isNaN(input)) {

        userId = Number(input);
        name = `User_${input}`;

      } else {
        return ctx.reply("❌ Invalid format.");
      }
    }

    if (
      match.teamA.some(p => p.id === userId) ||
      match.teamB.some(p => p.id === userId)
    )
      return ctx.reply("⚠️ Player already added.");

    const player = { id: userId, name };

    if (team === "A") match.teamA.push(player);
    else match.teamB.push(player);

    return ctx.reply(`✅ ${name} added to Team ${team}`);
  });

  /* ================= REMOVE PLAYER ================= */

  bot.command("remove", (ctx) => {

    const match = getMatch(ctx.chat.id);
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

    if (num < 1 || num > teamArr.length)
      return ctx.reply("Player slot not found.");

    const removed = teamArr.splice(num - 1, 1)[0];

    if (match.captains?.[team] === removed.id)
      match.captains[team] = null;

    return ctx.reply(`🚫 ${removed.name} removed from Team ${team}`);
  });

};