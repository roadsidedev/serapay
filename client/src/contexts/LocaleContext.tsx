import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { getCoreCopy, type CoreCopy } from "@shared/localization";

type LocaleContextValue = {
  language: string;
  copy: CoreCopy;
  setLanguage: (language: string) => void;
};

const LOCALE_STORAGE_KEY = "pocket-sera-language";
const LEGACY_LOCALE_STORAGE_KEY = "serapay-language";

const LocaleContext = createContext<LocaleContextValue>({ language: "en", copy: getCoreCopy("en"), setLanguage: () => undefined });

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState(() => localStorage.getItem(LOCALE_STORAGE_KEY) ?? localStorage.getItem(LEGACY_LOCALE_STORAGE_KEY) ?? navigator.language.slice(0, 2));

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem(LOCALE_STORAGE_KEY, language);
  }, [language]);

  const value = useMemo(() => ({ language, copy: getCoreCopy(language), setLanguage }), [language]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
