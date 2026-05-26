// Config AI (Gemini/Mistral/HuggingFace)
import { registerAs } from "@nestjs/config";

export default registerAs("ai", () => ({
  // Provider đang dùng (default: GEMINI)
  provider: process.env.AI_PROVIDER || "GEMINI",
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
    // "false" tắt structured_outputs (chỉ dùng prompt JSON)
    useStructuredOutput: process.env.HF_USE_STRUCTURED_OUTPUT ?? "true",
    maxTokens:           process.env.HF_MAX_TOKENS || "4096",
    requestTimeoutMs:    process.env.HF_REQUEST_TIMEOUT_MS || "120000",
  },
}));
