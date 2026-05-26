/**
 * Xóa toàn bộ DB và chỉ tạo 3 tài khoản (giống src/seed.ts).
 *
 * Chạy trên VPS (sau khi MongoDB container đang chạy):
 *   MONGODB_URI=mongodb://127.0.0.1:27017/ielts-writing-db node scripts/seed-users-only.js
 *
 * Local:
 *   node scripts/seed-users-only.js
 */

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://localhost:27017/ielts-writing-db";
const SALT_ROUNDS = 10;

const UserRole = { STUDENT: "STUDENT", ADMIN: "ADMIN" };

const UserModel = mongoose.model(
  "User",
  new mongoose.Schema({}, { strict: false, timestamps: true }),
);

const USERS = [
  {
    email: "admin@ielts.dev",
    password: "123456",
    fullName: "Admin Hệ thống",
    role: UserRole.ADMIN,
  },
  {
    email: "minh@student.dev",
    password: "123456",
    fullName: "Nguyễn Văn Minh",
    role: UserRole.STUDENT,
  },
  {
    email: "lan@student.dev",
    password: "123456",
    fullName: "Trần Thị Lan",
    role: UserRole.STUDENT,
  },
];

async function seedUsersOnly() {
  console.log("🔌 Connecting to MongoDB...");
  console.log("   ", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  const dbName = mongoose.connection.db.databaseName;
  console.log(`🗑️  Dropping database "${dbName}" (xóa mọi dữ liệu cũ)...`);
  await mongoose.connection.db.dropDatabase();

  console.log("👤 Creating 3 users...");
  const docs = [];
  for (const u of USERS) {
    docs.push({
      email: u.email,
      passwordHash: await bcrypt.hash(u.password, SALT_ROUNDS),
      fullName: u.fullName,
      role: u.role,
      isActive: true,
    });
  }
  await UserModel.insertMany(docs);

  console.log("\n✨ Done — chỉ còn 3 user trong DB.\n");
  console.log("🔑 Đăng nhập:");
  console.log("   admin@ielts.dev   / 123456  (ADMIN)");
  console.log("   minh@student.dev  / 123456  (STUDENT)");
  console.log("   lan@student.dev   / 123456  (STUDENT)");
  console.log("");

  await mongoose.disconnect();
  process.exit(0);
}

seedUsersOnly().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  mongoose.disconnect().finally(() => process.exit(1));
});
