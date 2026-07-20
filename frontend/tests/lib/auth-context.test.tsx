import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../../lib/auth-context";

vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "http://localhost:3000");

function TestConsumer() {
  const { isAuthenticated, isLoading, login, logout } = useAuth();
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
  // Clear any cookies set by previous tests to prevent state leakage
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
  });
});

describe("AuthProvider & useAuth", () => {
  it("finishes as unauthenticated when verify returns 401 (no cookie)", async () => {
    renderWithProvider();
    await act(async () => {});
    expect(screen.getByTestId("auth-state").textContent).toBe("unauthenticated");
  });

  it("successful login sets authenticated state", async () => {
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
  });

  it("logout calls /api/auth/logout and sets unauthenticated", async () => {
    renderWithProvider();
    await act(async () => {});

    // First login
    await act(async () => {
      fireEvent.click(screen.getByTestId("login-success"));
    });
    await act(async () => {});
    expect(screen.getByTestId("auth-state").textContent).toBe("authenticated");

    // Then logout
    await act(async () => {
      fireEvent.click(screen.getByTestId("logout"));
    });
    await act(async () => {});

    expect(screen.getByTestId("auth-state").textContent).toBe("unauthenticated");
  });

  it("reacts to global camron:logout event to force-logout", async () => {
    renderWithProvider();
    await act(async () => {});

    // Login first
    await act(async () => {
      fireEvent.click(screen.getByTestId("login-success"));
    });
    await act(async () => {});
    expect(screen.getByTestId("auth-state").textContent).toBe("authenticated");

    await act(async () => {
      window.dispatchEvent(new CustomEvent("camron:logout"));
    });

    expect(screen.getByTestId("auth-state").textContent).toBe("unauthenticated");
  });
});
