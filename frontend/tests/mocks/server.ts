import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// Create a single MSW server instance used across all tests
export const server = setupServer(...handlers);
