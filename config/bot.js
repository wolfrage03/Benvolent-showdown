const { Telegraf } = require("telegraf");

if (!process.env.BOT_TOKEN) {
  console.error("BOT_TOKEN missing in .env");
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

(async () => {
  const me = await bot.telegram.getMe();
  console.log("🤖 Bot username:", me.username);
})();

module.exports = bot;