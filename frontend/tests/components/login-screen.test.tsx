/**
 * Tests for frontend/components/login-screen.tsx
 * Verifies rendering, input behaviour, login triggering, error display,
 * and language selection.
 */
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LanguageProvider } from "../../lib/language-context";
import { LoginScreen } from "../../components/login-screen";

// Mock the dependencies to avoid Radix UI and input-otp complexities in jsdom
vi.mock("@/components/ui/warp-background", () => ({
  WarpBackground: ({ children }: any) => <div data-testid="warp">{children}</div>,
}));

vi.mock("@/components/ui/input-otp", () => ({
  InputOTP: ({ value, onChange, disabled }: any) => (
    <input
      data-testid="pin-input"
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  ),
  InputOTPGroup: ({ children }: any) => <div>{children}</div>,
  InputOTPSlot: () => null,
}));

// Mock dropdown menu to bypass Radix UI click triggering complexities
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuRadioGroup: ({ children, value, onValueChange }: any) => (
    <div data-testid="radio-group">
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, {
              onClick: () => onValueChange((child.props as any).value),
            } as any)
          : child
      )}
    </div>
  ),
  DropdownMenuRadioItem: ({ children, value, onClick }: any) => (
    <button data-testid={`lang-item-${value}`} onClick={onClick}>
      {children}
    </button>
  ),
}));

const mockLogin = vi.fn();
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

beforeEach(() => {
  mockLogin.mockReset();
  localStorage.clear();
});

describe("<LoginScreen />", () => {
  it("renders CAMron login header and inputs", async () => {
    render(
      <LanguageProvider>
        <LoginScreen />
      </LanguageProvider>
    );
    await act(async () => {});

    expect(screen.getByText("CAMron")).toBeInTheDocument();
    expect(screen.getByTestId("pin-input")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enter/i })).toBeInTheDocument();
  });

  it("submits the pin when it reaches 4 digits", async () => {
    mockLogin.mockResolvedValue({ success: true });
    render(
      <LanguageProvider>
        <LoginScreen />
      </LanguageProvider>
    );
    await act(async () => {});

    const input = screen.getByTestId("pin-input");
    await act(async () => {
      fireEvent.change(input, { target: { value: "1234" } });
    });

    expect(mockLogin).toHaveBeenCalledWith("1234");
  });

  it("does not allow entering non-numeric digits", async () => {
    render(
      <LanguageProvider>
        <LoginScreen />
      </LanguageProvider>
    );
    await act(async () => {});

    const input = screen.getByTestId("pin-input") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "12ab" } });
    });

    // It regex validates for digits only
    expect(input.value).toBe("");
  });

  it("shows error message on failed login and clears pin", async () => {
    mockLogin.mockResolvedValue({ success: false, error: "Incorrect PIN. Try again." });
    render(
      <LanguageProvider>
        <LoginScreen />
      </LanguageProvider>
    );
    await act(async () => {});

    const input = screen.getByTestId("pin-input") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "1234" } });
    });
    // Wait for async login check to resolve
    await act(async () => {});

    expect(screen.getByText("Incorrect PIN. Try again.")).toBeInTheDocument();
    expect(input.value).toBe("");
  });

  it("disables inputs and shows verifying state during login", async () => {
    let resolveLogin: (val: any) => void = () => {};
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    mockLogin.mockReturnValue(loginPromise);

    render(
      <LanguageProvider>
        <LoginScreen />
      </LanguageProvider>
    );
    await act(async () => {});

    const input = screen.getByTestId("pin-input") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "1234" } });
    });

    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: /verifying/i })).toBeInTheDocument();

    await act(async () => {
      resolveLogin({ success: true });
    });
  });

  it("allows switching language via language selector", async () => {
    render(
      <LanguageProvider>
        <LoginScreen />
      </LanguageProvider>
    );
    await act(async () => {});

    // Default language is English (Enter your PIN to access...)
    expect(screen.getByText(/Enter your PIN/i)).toBeInTheDocument();

    const ptBtn = screen.getByTestId("lang-item-pt");
    await act(async () => {
      fireEvent.click(ptBtn);
    });

    // Text changes to Portuguese equivalent
    expect(screen.getByText(/Introduza o seu PIN/i)).toBeInTheDocument();
  });
});
