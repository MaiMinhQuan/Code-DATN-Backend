const mongoose = require("mongoose");

const MONGODB_URI = "mongodb://localhost:27017/ielts-writing-db";

async function clear() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);

  const collections = await mongoose.connection.db.listCollections().toArray();
  const names = collections.map((c) => c.name);

  for (const name of names) {
    await mongoose.connection.db.collection(name).deleteMany({});
    console.log(`🗑️  Cleared: ${name}`);
  }

  console.log("\n✅ All collections cleared");
  await mongoose.disconnect();
  process.exit(0);
}

clear().catch((err) => {
  console.error("❌ Error:", err);
  mongoose.disconnect();
  process.exit(1);
});
