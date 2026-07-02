import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll, vi } from "vitest";
import { server } from "./mocks/server";

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));

// Reset handlers after each test (so one test's overrides don't leak)
afterEach(() => {
  server.resetHandlers();
  cleanup();
  // Clear sessionStorage and localStorage between tests
  sessionStorage.clear();
  localStorage.clear();
});

// Stop server after all tests
afterAll(() => server.close());

// Mock window.dispatchEvent for logout event tests
vi.spyOn(window, "dispatchEvent");
