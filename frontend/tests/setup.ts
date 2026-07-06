import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll, vi } from "vitest";
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));

afterEach(() => {
  server.resetHandlers();
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
});

afterAll(() => server.close());

vi.spyOn(window, "dispatchEvent");
