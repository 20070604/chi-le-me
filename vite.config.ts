import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { aiApiPlugin } from './server/viteAiPlugin'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    server: {
      host: '0.0.0.0',
      port: 4173,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
    plugins: [
      react(),
      aiApiPlugin({
        apiKey: env.OPENAI_NEXT_API_KEY,
        baseUrl: env.OPENAI_NEXT_BASE_URL,
        textModel: env.AI_TEXT_MODEL,
        visionModel: env.AI_VISION_MODEL,
        fallbackModel: env.AI_FALLBACK_MODEL,
        chatFastModel: env.AI_CHAT_FAST_MODEL,
        chatBalancedModel: env.AI_CHAT_BALANCED_MODEL,
        chatDeepModel: env.AI_CHAT_DEEP_MODEL,
      }),
    ],
  }
})
