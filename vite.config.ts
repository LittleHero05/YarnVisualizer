/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { ravelryProxy } from './server/ravelryProxy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), ravelryProxy(env.RAVELRY_USERNAME, env.RAVELRY_PASSWORD)],
    test: { environment: 'node' },
  };
});
