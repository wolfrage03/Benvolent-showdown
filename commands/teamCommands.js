```javascript
const { Markup } = require("telegraf");
const { getMatch, matches, playerActiveMatch } = require("../matchManager");

module.exports = function (bot, helpers) {

const { isHost } = helpers;

/* ================= CREATE TEAM ================= */

bot.command("createteam", (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!isHost(match, ctx.from.id))
    return ctx.reply("❌ Only host can create teams.");

  match.teamA = [];
  match.teamB = [];
  match.captains = { A:null, B:null };

  match.phase = "join";

  ctx.reply(
    "🏏 Teams Created!\n\n" +
    "🔵 " + match.teamAName + " (A)\n" +
    "🔴 " + match.teamBName + " (B)\n\n" +
    "Players join using:\n" +
    "/joina\n" +
    "/joinb\n\n" +
    "Host can also add players:\n" +
    "/add A @user\n" +
    "/add B userID\n\n" +
    "⏳ Joining open"
  );

});


/* ================= JOIN TEAM A ================= */

bot.command("joina",(ctx)=>{

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining closed.");

  if (playerActiveMatch.has(ctx.from.id))
    return ctx.reply("❌ You already joined another match.");

  if (ctx.from.id === match.host)
    return ctx.reply("❌ Host cannot join.");

  if (match.teamA.some(p=>p.id===ctx.from.id))
    return ctx.reply("⚠️ Already in Team A.");

  const name = ctx.from.first_name || "Player";

  const player = {
    id: ctx.from.id,
    name: name,
    mention: '<a href="tg://user?id='+ctx.from.id+'">'+name+'</a>'
  };

  match.teamA.push(player);
  playerActiveMatch.set(ctx.from.id, match.groupId);

  ctx.reply(
    "✅ "+player.mention+" joined 🔵 "+match.teamAName+"\n\n"+
    "Team A: "+match.teamA.length+"\n"+
    "Team B: "+match.teamB.length,
    { parse_mode:"HTML" }
  );

});


/* ================= JOIN TEAM B ================= */

bot.command("joinb",(ctx)=>{

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (match.phase !== "join")
    return ctx.reply("⚠️ Joining closed.");

  if (playerActiveMatch.has(ctx.from.id))
    return ctx.reply("❌ You already joined another match.");

  if (ctx.from.id === match.host)
    return ctx.reply("❌ Host cannot join.");

  if (match.teamB.some(p=>p.id===ctx.from.id))
    return ctx.reply("⚠️ Already in Team B.");

  const name = ctx.from.first_name || "Player";

  const player = {
    id: ctx.from.id,
    name: name,
    mention: '<a href="tg://user?id='+ctx.from.id+'">'+name+'</a>'
  };

  match.teamB.push(player);
  playerActiveMatch.set(ctx.from.id, match.groupId);

  ctx.reply(
    "✅ "+player.mention+" joined 🔴 "+match.teamBName+"\n\n"+
    "Team A: "+match.teamA.length+"\n"+
    "Team B: "+match.teamB.length,
    { parse_mode:"HTML" }
  );

});


/* ================= MANUAL ADD PLAYER ================= */

bot.command("add", async (ctx) => {

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

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

  if (ctx.message.reply_to_message) {

    const u = ctx.message.reply_to_message.from;

    if (u.is_bot)
      return ctx.reply("❌ Cannot add bot.");

    userId = u.id;
    name = u.first_name || "Player";

  } else {

    if (args.length < 3)
      return ctx.reply("Usage:\n/add A @username\n/add B userID");

    const input = args[2];

    if (!isNaN(input)) {
      userId = Number(input);
      name = "User_"+input;
    } else {
      return ctx.reply("❌ Invalid format.");
    }
  }

  if (
    match.teamA.some(p=>p.id===userId) ||
    match.teamB.some(p=>p.id===userId)
  )
    return ctx.reply("⚠️ Player already added.");

  const player = {
    id:userId,
    name:name,
    mention:'<a href="tg://user?id='+userId+'">'+name+'</a>'
  };

  if(team==="A") match.teamA.push(player);
  else match.teamB.push(player);

  ctx.reply("✅ "+player.mention+" added to Team "+team,{parse_mode:"HTML"});

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
  const team = arg[0].toUpperCase();
  const num = parseInt(arg.slice(1));

  if (!["A","B"].includes(team) || isNaN(num))
    return ctx.reply("Invalid format. Use A1 or B2");

  const arr = team==="A"?match.teamA:match.teamB;

  if(num<1 || num>arr.length)
    return ctx.reply("Player slot not found.");

  const removed = arr.splice(num-1,1)[0];

  if(match.captains?.[team]===removed.id)
    match.captains[team]=null;

  ctx.reply("🚫 "+removed.name+" removed from Team "+team);

});


/* ================= CHANGE TEAM ================= */

bot.command("changeteam",(ctx)=>{

  const match = getMatch(ctx);
  if (!match) return ctx.reply("⚠️ No active match.");

  if (!isHost(match,ctx.from.id))
    return ctx.reply("❌ Only host can change teams.");

  if (match.phase !== "join")
    return ctx.reply("❌ Can only change during joining.");

  const args = ctx.message.text.split(" ");

  if (args.length !== 3)
    return ctx.reply("Usage:\n/changeteam A 1");

  const team = args[1].toUpperCase();
  const number = parseInt(args[2]);

  if (!["A","B"].includes(team))
    return ctx.reply("Team must be A or B.");

  const fromTeam = team==="A"?match.teamA:match.teamB;
  const toTeam = team==="A"?match.teamB:match.teamA;
  const target = team==="A"?"B":"A";

  if (number < 1 || number > fromTeam.length)
    return ctx.reply("Invalid player number.");

  const player = fromTeam[number-1];

  match.pendingTeamChange={player,fromTeam,toTeam,target};

  ctx.reply(
    "⚠️ Move "+player.mention+"\n\nTeam "+team+" → Team "+target+"?",
    {
      parse_mode:"HTML",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Confirm","confirm_team_change"),
          Markup.button.callback("❌ Cancel","cancel_team_change")
        ]
      ])
    }
  );

});


/* ================= CONFIRM TEAM CHANGE ================= */

bot.action("confirm_team_change", async(ctx)=>{

  const match = getMatch(ctx);
  if (!match) return;

  const change = match.pendingTeamChange;
  if (!change) return;

  const {player,fromTeam,toTeam,target}=change;

  const index = fromTeam.findIndex(p=>p.id===player.id);
  if(index!==-1) fromTeam.splice(index,1);

  toTeam.push(player);

  match.pendingTeamChange=null;

  await ctx.editMessageReplyMarkup({inline_keyboard:[]});

  await ctx.reply(
    "✅ "+player.mention+" moved to Team "+target,
    {parse_mode:"HTML"}
  );

});


/* ================= CANCEL TEAM CHANGE ================= */

bot.action("cancel_team_change",async(ctx)=>{

  const match = getMatch(ctx);
  if(!match) return;

  match.pendingTeamChange=null;

  await ctx.editMessageReplyMarkup({inline_keyboard:[]});
  ctx.answerCbQuery("Cancelled");

});

};
```
