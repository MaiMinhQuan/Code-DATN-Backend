import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  provider: process.env.AI_PROVIDER || 'GEMINI',
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  mistral: {
    gpuNodeUrl: process.env.MISTRAL_GPU_NODE_URL,
    apiKey: process.env.MISTRAL_API_KEY,
  },
}));
