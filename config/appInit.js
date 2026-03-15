const connectDB = require("../database");

async function initializeApp() {
  try {
    await connectDB();
    console.log("✅ Database connected");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
}

module.exports = initializeApp;