// Config AI (Gemini/Mistral)
import { registerAs } from "@nestjs/config";

export default registerAs("ai", () => ({
  // Provider đang dùng (default: GEMINI)
  provider: process.env.AI_PROVIDER || "GEMINI",
  gemini: {
    // API key Gemini
    apiKey: process.env.GEMINI_API_KEY,
  },
  mistral: {
    // URL node GPU self-host cho Mistral
    gpuNodeUrl: process.env.MISTRAL_GPU_NODE_URL,
    apiKey: process.env.MISTRAL_API_KEY,
  },
}));
