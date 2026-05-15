// Config Redis (BullMQ)
import { registerAs } from "@nestjs/config";

export default registerAs("redis", () => ({
  // Host Redis
  host: process.env.REDIS_HOST || "localhost",
  // Port Redis
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  // Password Redis (optional)
  password: process.env.REDIS_PASSWORD || undefined,
}));
