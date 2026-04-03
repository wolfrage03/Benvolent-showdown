const mongoose = require("mongoose");

module.exports = async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize:               50,
      minPoolSize:               10,
      socketTimeoutMS:        45000,
      serverSelectionTimeoutMS: 5000,
    });

    // Fix: suppress findOneAndUpdate/findOneAndReplace deprecation warnings
    mongoose.set("returnOriginal", false);

    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err);
    process.exit(1);
  }
};