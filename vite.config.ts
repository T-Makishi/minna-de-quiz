import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

declare const process: {
  env: Record<string, string | undefined>;
};

const githubPagesBase = process.env.GITHUB_PAGES === 'true' ? '/minna-de-quiz/' : '/';

export default defineConfig({
  base: githubPagesBase,
  plugins: [react()],
});
