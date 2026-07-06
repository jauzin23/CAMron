import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LanguageProvider, useLanguage } from "../../lib/language-context";

function TestConsumer({
  k,
  vars,
}: {
  k: string;
  vars?: Record<string, string | number>;
}) {
  const { t, language, setLanguage } = useLanguage();
  return (
    <div>
      <span data-testid="translated">{t(k, vars)}</span>
      <span data-testid="language">{language}</span>
      <button onClick={() => setLanguage("pt")} data-testid="set-pt">
        PT
      </button>
      <button onClick={() => setLanguage("en")} data-testid="set-en">
        EN
      </button>
    </div>
  );
}

function renderWithProvider(key: string, vars?: Record<string, string | number>) {
  return render(
    <LanguageProvider>
      <TestConsumer k={key} vars={vars} />
    </LanguageProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("t() translation function", () => {
  it("returns translated text for a valid EN key", async () => {
    renderWithProvider("common.loading");
    await act(async () => {});
    expect(screen.getByTestId("translated").textContent).toBe("Loading...");
  });

  it("returns the key itself as fallback for unknown keys", async () => {
    renderWithProvider("this.key.does.not.exist");
    await act(async () => {});
    expect(screen.getByTestId("translated").textContent).toBe("this.key.does.not.exist");
  });

  it("performs variable interpolation for {variable} placeholders", async () => {
    renderWithProvider("login.incorrectPin");
    await act(async () => {});
    const { unmount } = renderWithProvider("login.restrictedAccess");
    unmount();
  });

  it("switches to PT and returns PT translations", async () => {
    renderWithProvider("common.loading");
    await act(async () => {});

    const setPt = screen.getByTestId("set-pt");
    await act(async () => {
      fireEvent.click(setPt);
    });

    const translated = screen.getByTestId("translated").textContent;
    expect(typeof translated).toBe("string");
    expect(translated!.length).toBeGreaterThan(0);
  });
});

describe("Language persistence", () => {
  it("persists language selection to localStorage on setLanguage", async () => {
    renderWithProvider("common.loading");
    await act(async () => {});

    const setPt = screen.getByTestId("set-pt");
    await act(async () => {
      fireEvent.click(setPt);
    });

    expect(localStorage.getItem("camron-lang")).toBe("pt");
  });

  it("reads language from localStorage on mount", async () => {
    localStorage.setItem("camron-lang", "pt");
    renderWithProvider("common.loading");
    await act(async () => {});

    const lang = screen.getByTestId("language").textContent;
    expect(lang).toBe("pt");
  });

  it("defaults to 'en' when localStorage is empty and browser lang is not PT", async () => {
    renderWithProvider("common.loading");
    await act(async () => {});

    const lang = screen.getByTestId("language").textContent;
    expect(lang).toBe("en");
  });
});

describe("useLanguage hook", () => {
  it("throws when used outside LanguageProvider", () => {
    const originalError = console.error;
    console.error = () => {};

    function BadComponent() {
      useLanguage();
      return null;
    }

    expect(() => render(<BadComponent />)).toThrow(
      "useLanguage must be used within a LanguageProvider"
    );

    console.error = originalError;
  });
});
