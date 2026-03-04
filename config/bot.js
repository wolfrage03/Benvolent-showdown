const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

let BOT_USERNAME = null;

async function initializeBot() {
  try {
    const me = await bot.telegram.getMe();
    BOT_USERNAME = me.username;
    console.log("🤖 Bot username:", BOT_USERNAME);
  } catch (err) {
    console.error("❌ Failed to fetch bot username:", err);
  }
}

module.exports = {
  bot,
  initializeBot,
  getBotUsername: () => BOT_USERNAME
};