"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { pt } from "./translations/pt";
import { en } from "./translations/en";

export type Language = "pt" | "en";

const translations = { pt, en };

type TranslationKeys = typeof en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("camron-lang") as Language;
    if (saved === "pt" || saved === "en") {
      setLanguageState(saved);
      document.documentElement.lang = saved === "pt" ? "pt-PT" : "en-US";
    } else {
      const browserLang = navigator.language.slice(0, 2);
      const initialLang: Language = browserLang === "pt" ? "pt" : "en";
      setLanguageState(initialLang);
      document.documentElement.lang = initialLang === "pt" ? "pt-PT" : "en-US";
    }
    setIsLoaded(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("camron-lang", lang);
    document.documentElement.lang = lang === "pt" ? "pt-PT" : "en-US";
  };

  const t = (
    key: string,
    variables?: Record<string, string | number>,
  ): string => {
    const dict = translations[language];
    const parts = key.split(".");
    let current: any = dict;

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return key;
      }
    }

    if (typeof current !== "string") {
      return key;
    }

    let text = current;
    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, "g"), String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {isLoaded ? children : <div className="invisible">{children}</div>}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
