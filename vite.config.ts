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
        apiKey: env.ADVISOR_API_KEY,
        baseUrl: env.ADVISOR_BASE_URL,
        model: env.ADVISOR_MODEL,
      }),
    ],
  }
})
