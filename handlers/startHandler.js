const User = require("../User");

function registerStartHandler(bot) {

  bot.start(async (ctx, next) => {

    if (ctx.chat.type !== "private") return next();

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

      console.log("✅ DM user saved:", username?.toLowerCase(), "| telegramId:", id);

    } catch (err) {
      console.error("❌ DM user save error:", err);
    }

    await ctx.reply(
`[ BOT CONNECTED ]

When selected as bowler, send your number (1–6) here in DM.`
    );

  });

}

module.exports = registerStartHandler;