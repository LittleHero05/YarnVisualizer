/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { ravelryProxy } from './server/ravelryProxy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // @vercel/blob reads its token from process.env; optional locally (signups return 503 without it).
  if (env.BLOB_READ_WRITE_TOKEN) process.env.BLOB_READ_WRITE_TOKEN = env.BLOB_READ_WRITE_TOKEN;
  return {
    plugins: [react(), ravelryProxy(env.RAVELRY_USERNAME, env.RAVELRY_PASSWORD)],
    test: { environment: 'node' },
  };
});
