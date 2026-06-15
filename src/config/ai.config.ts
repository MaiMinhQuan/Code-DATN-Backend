// Config AI (Gemini/Mistral/HuggingFace/OpenRouter)
import { registerAs } from "@nestjs/config";

export default registerAs("ai", () => ({
  // Provider đang dùng — đổi AI_PROVIDER để chuyển model
  provider: process.env.AI_PROVIDER || "OPENROUTER",
  openrouter: {
    apiKey:          process.env.OPENROUTER_API_KEY,
    // Đổi tên model tại đây hoặc qua env OPENROUTER_MODEL
    model:           process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash-lite",
    maxTokens:       Number(process.env.OPENROUTER_MAX_TOKENS || "4096"),
    requestTimeoutMs: Number(process.env.OPENROUTER_REQUEST_TIMEOUT_MS || "120000"),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  mistral: {
    gpuNodeUrl: process.env.MISTRAL_GPU_NODE_URL,
    apiKey: process.env.MISTRAL_API_KEY,
  },
  huggingface: {
    endpointUrl: process.env.HF_ENDPOINT_URL,
    apiToken:    process.env.HF_API_TOKEN,
    modelId:     process.env.HF_MODEL_ID || "MMQuan/ielts-qwen-7b-merged-eng-v3",
    useStructuredOutput: process.env.HF_USE_STRUCTURED_OUTPUT ?? "true",
    maxTokens:           process.env.HF_MAX_TOKENS || "4096",
    requestTimeoutMs:    process.env.HF_REQUEST_TIMEOUT_MS || "120000",
  },
}));
