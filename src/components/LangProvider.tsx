"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { t as translate, type DictKey, type Lang } from "@/lib/i18n";

interface LangContextValue {
  lang: Lang;
  t: (key: DictKey) => string;
  setLang: (lang: Lang) => Promise<void>;
  dir: "ltr" | "rtl";
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback(async (next: Lang) => {
    setLangState(next);
    await fetch("/api/lang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: next }),
    });
  }, []);

  const value: LangContextValue = {
    lang,
    t: (key: DictKey) => translate(lang, key),
    setLang,
    dir: lang === "UR" ? "rtl" : "ltr",
  };

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
