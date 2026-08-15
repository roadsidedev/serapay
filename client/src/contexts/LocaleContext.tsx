import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { getCoreCopy, type CoreCopy } from "@shared/localization";

type LocaleContextValue = {
  language: string;
  copy: CoreCopy;
  setLanguage: (language: string) => void;
};

const LocaleContext = createContext<LocaleContextValue>({ language: "en", copy: getCoreCopy("en"), setLanguage: () => undefined });

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("serapay-language") ?? navigator.language.slice(0, 2));

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("serapay-language", language);
  }, [language]);

  const value = useMemo(() => ({ language, copy: getCoreCopy(language), setLanguage }), [language]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
