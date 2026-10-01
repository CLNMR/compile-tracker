import { defineConfig } from 'vitest/config';

// Runs the Firestore security-rules tests against the emulator:
//   npm run test:rules   (firebase emulators:exec wraps this)
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
