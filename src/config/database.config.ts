// Config Database (MongoDB)
import { registerAs } from "@nestjs/config";

export default registerAs("database", () => ({
  // MongoDB URI (fallback local nếu không set env)
  uri: process.env.MONGODB_URI || "mongodb://localhost:27017/ielts-writing-db",
}));
