```javascript
const { Markup } = require("telegraf")
const User = require("../models/User")

const {
  getMatch,
  resetMatch,
  matches
} = require("../matchManager")

module.exports = function(bot, helpers){

const { clearTimers, clearActiveMatchPlayers } = helpers


/* ================= START ================= */

bot.command("start", async (ctx, next) => {

  if (ctx.chat.type === "private") return next()

  let match = getMatch(ctx)

  if (match && match.phase !== "idle")
    return ctx.reply("⚠️ A match is already running.")

  try {

    const { id, username, first_name, last_name } = ctx.from

    await User.updateOne(
      { telegramId: String(id) },
      {
        $set:{
          telegramId:String(id),
          username:username?.toLowerCase(),
          firstName:first_name,
          lastName:last_name
        }
      },
      { upsert:true }
    )

  } catch(err){
    console.error("User save error:",err)
  }

  match = resetMatch(ctx.chat.id)

  clearActiveMatchPlayers(match)

  match.groupId = ctx.chat.id
  match.phase = "host_select"

  ctx.reply(
    "🏏 Match Starting!\nSelect Host:",
    Markup.inlineKeyboard([
      [Markup.button.callback("Become Host","select_host")]
    ])
  )

})


/* ================= END MATCH ================= */

bot.command("endmatch", async (ctx) => {

  const match = getMatch(ctx)

  if (!match || match.phase === "idle")
    return ctx.reply("⚠️ No active match running.")

  let isAdmin = false

  try {
    const member = await ctx.getChatMember(ctx.from.id)
    isAdmin = ["administrator","creator"].includes(member.status)
  } catch {}

  if (ctx.from.id !== match.host && !isAdmin)
    return ctx.reply("❌ Only host/admin can end match.")

  ctx.reply(
    "⚠️ End the match?",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Yes","confirm_end"),
        Markup.button.callback("❌ No","cancel_end")
      ]
    ])
  )

})


/* ================= CONFIRM END ================= */

bot.action("confirm_end", async (ctx)=>{

  const match = getMatch(ctx)
  if (!match) return

  let isAdmin = false

  try {
    const member = await ctx.getChatMember(ctx.from.id)
    isAdmin = ["administrator","creator"].includes(member.status)
  } catch {}

  if (ctx.from.id !== match.host && !isAdmin)
    return ctx.answerCbQuery("Only host/admin can confirm.")

  try {
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] })
  } catch {}

  await ctx.reply("🛑 Match Ended Successfully.")

  clearTimers(match)
  clearActiveMatchPlayers(match)

  matches.delete(match.groupId)

})


/* ================= CANCEL END ================= */

bot.action("cancel_end", async (ctx)=>{

  try {
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] })
  } catch {}

  ctx.answerCbQuery("Cancelled")

})

}
```
