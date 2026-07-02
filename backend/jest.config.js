"use strict";

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: [
    "routes/**/*.js",
    "middleware/**/*.js",
    "db/**/*.js",
    "utils/**/*.js",
  ],
  coverageThreshold: {
    global: {
      lines: 41,
      functions: 32,
    },
  },
  setupFiles: ["<rootDir>/tests/setup.js"],
  // Longer timeout for async tests
  testTimeout: 10000,
};

module.exports = config;
