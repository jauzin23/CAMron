"use strict";
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
  testTimeout: 10000,
};

module.exports = config;
