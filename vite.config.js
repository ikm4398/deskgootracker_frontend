import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return defineConfig({
    plugins: [react()],
    server: {
      host: env.VITE_HOST,                // 0.0.0.0 allows LAN access
      port: Number(env.VITE_PORT),        
      strictPort: true,                   // fail if port is take
      allowedHosts: env.VITE_ALLOWED_HOST 
        ? [env.VITE_ALLOWED_HOST]         // use hostname from .env
        : 'all',                          // fallback: allow any host
    },
  })
}
