import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_KEY': JSON.stringify(env.SUPABASE_KEY),
      'process.env.R2_ACCOUNT_ID': JSON.stringify(env.R2_ACCOUNT_ID),
      'process.env.R2_ACCESS_KEY_ID': JSON.stringify(env.R2_ACCESS_KEY_ID),
      'process.env.R2_SECRET_ACCESS_KEY': JSON.stringify(env.R2_SECRET_ACCESS_KEY),
      'process.env.R2_BUCKET_NAME': JSON.stringify(env.R2_BUCKET_NAME),
      'process.env.R2_PUBLIC_DOMAIN': JSON.stringify(env.R2_PUBLIC_DOMAIN)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
