import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({
  path: '.env.test.local',
});

export default defineConfig({
  testDir: './tests/e2e',

  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'on-first-retry',
  },

  reporter: 'list',
});
