import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../../lib/auth-context";

vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "http://localhost:3000");

const SESSION_KEY = "camron_jwt";

function TestConsumer() {
  const { token, isAuthenticated, isLoading, login, logout } = useAuth();
  const [result, setResult] = React.useState<any>(null);

  const handleLogin = async (pin: string) => {
    const res = await login(pin);
    setResult(res);
  };

  return (
    <div>
      <span data-testid="auth-state">
        {isLoading ? "loading" : isAuthenticated ? "authenticated" : "unauthenticated"}
      </span>
      <span data-testid="token">{token ?? "no-token"}</span>
      <span data-testid="login-result">{result ? JSON.stringify(result) : "none"}</span>
      <button onClick={() => handleLogin("1234")} data-testid="login-success">
        Login Success
      </button>
      <button onClick={() => handleLogin("9999")} data-testid="login-fail">
        Login Fail
      </button>
      <button onClick={logout} data-testid="logout">
        Logout
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

beforeEach(() => {
  sessionStorage.clear();
});

describe("AuthProvider & useAuth", () => {
  it("finishes as unauthenticated if no token exists", async () => {
    renderWithProvider();
    await act(async () => {});
    expect(screen.getByTestId("auth-state").textContent).toBe("unauthenticated");
  });

  it("checks token on mount and sets authenticated if token is valid", async () => {
    sessionStorage.setItem(SESSION_KEY, "mock-jwt-token");
    renderWithProvider();
    await act(async () => {});

    expect(screen.getByTestId("auth-state").textContent).toBe("authenticated");
    expect(screen.getByTestId("token").textContent).toBe("mock-jwt-token");
  });

  it("checks token on mount and sets unauthenticated if token is invalid/verification fails", async () => {
    sessionStorage.setItem(SESSION_KEY, "invalid-token");
    renderWithProvider();
    await act(async () => {});

    expect(screen.getByTestId("auth-state").textContent).toBe("unauthenticated");
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("successful login updates state and saves token to sessionStorage", async () => {
    renderWithProvider();
    await act(async () => {});

    const btn = screen.getByTestId("login-success");
    await act(async () => {
      fireEvent.click(btn);
    });
    await act(async () => {});

    const result = JSON.parse(screen.getByTestId("login-result").textContent!);
    expect(result).toEqual({ success: true });
    expect(screen.getByTestId("auth-state").textContent).toBe("authenticated");
    expect(sessionStorage.getItem(SESSION_KEY)).toBe("mock-jwt-token");
  });

  it("failed login returns error and does not authenticate", async () => {
    renderWithProvider();
    await act(async () => {});

    const btn = screen.getByTestId("login-fail");
    await act(async () => {
      fireEvent.click(btn);
    });
    await act(async () => {});

    const result = JSON.parse(screen.getByTestId("login-result").textContent!);
    expect(result).toEqual({ success: false, error: "Incorrect PIN" });
    expect(screen.getByTestId("auth-state").textContent).toBe("unauthenticated");
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("logout clears sessionStorage and sets unauthenticated", async () => {
    sessionStorage.setItem(SESSION_KEY, "mock-jwt-token");
    renderWithProvider();
    await act(async () => {});

    const btn = screen.getByTestId("logout");
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(screen.getByTestId("auth-state").textContent).toBe("unauthenticated");
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("reacts to global camron:logout event to force-logout", async () => {
    sessionStorage.setItem(SESSION_KEY, "mock-jwt-token");
    renderWithProvider();
    await act(async () => {});
    
    expect(screen.getByTestId("auth-state").textContent).toBe("authenticated");

    await act(async () => {
      window.dispatchEvent(new CustomEvent("camron:logout"));
    });

    expect(screen.getByTestId("auth-state").textContent).toBe("unauthenticated");
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
