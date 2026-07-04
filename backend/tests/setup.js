"use strict";

// Set environment variables for all backend Jest tests before any modules are loaded
process.env.NODE_ENV = "test";
process.env.APP_PIN = "1234";
process.env.JWT_SECRET = "test-secret-for-jest-long-enough-to-be-secure-for-testing-123456";
process.env.JWT_EXPIRY = "1h";
process.env.SKIP_RATE_LIMIT = "true";
process.env.HOST_IP = "192.168.1.50";
process.env.PORT = "3000";
