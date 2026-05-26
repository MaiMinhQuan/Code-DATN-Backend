/**
 * Migration: remove legacy targetBand from sampleessays collection.
 *
 * Usage (from backend/):
 *   node scripts/migrate-sample-essay-remove-target-band.js
 *
 * Requires MONGODB_URI in .env or environment.
 */
require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const collection = db.collection("sampleessays");

  const withTargetBand = await collection.countDocuments({ targetBand: { $exists: true } });
  console.log(`Documents with targetBand: ${withTargetBand}`);

  const missingScore = await collection.countDocuments({
    $or: [
      { overallBandScore: { $exists: false } },
      { overallBandScore: null },
    ],
  });
  console.log(`Documents missing overallBandScore: ${missingScore}`);

  if (missingScore > 0) {
    console.warn(
      "Warning: some documents have no overallBandScore. Set manually before dropping targetBand.",
    );
  }

  const result = await collection.updateMany(
    { targetBand: { $exists: true } },
    { $unset: { targetBand: "" } },
  );

  console.log(`Unset targetBand on ${result.modifiedCount} document(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
