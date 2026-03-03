const store = require("../../state/inMemoryStore");

function joinTeam(match, user, teamKey) {
  if (!match) return { error: "No match" };

  if (match.teamA.some(p => p.id === user.id) ||
      match.teamB.some(p => p.id === user.id))
    return { error: "Already in team" };

  const player = {
    id: user.id,
    name: user.username
      ? `@${user.username}`
      : user.first_name || "Player"
  };

  if (teamKey === "A") match.teamA.push(player);
  else match.teamB.push(player);

  return { success: true, player };
}


function chooseCaptain(chatId, userId, team) {
  const match = store.getMatch(chatId);
  if (!match) return "No active match.";

  const teamArr = team === "A" ? match.teamA : match.teamB;
  const playerIndex = teamArr.findIndex(p => p.id === userId);

  if (playerIndex === -1) return "Player not in team.";

  const [player] = teamArr.splice(playerIndex, 1);

  // 🔥 Insert at position 1 (NOT 0)
  teamArr.splice(0, 0, player);

  if (team === "A") match.captainA = userId;
  else match.captainB = userId;

  return "Captain updated.";
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

  /* remove captain if removed */
  if (match.captains?.[team] === removed.id)
    match.captains[team] = null;

  /* remove from dismissed / used batters */
  if (Array.isArray(match.usedBatters))
    match.usedBatters = match.usedBatters.filter(id => id !== removed.id);

  ctx.reply(`🚫 ${removed.name} removed from Team ${team}`);
});



module.exports = {
  joinTeam,
  chooseCaptain
};