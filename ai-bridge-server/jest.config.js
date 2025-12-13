/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    '*.js',
    '!test-server.js',
    '!jest.config.js',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

export default config;
