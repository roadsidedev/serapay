export type CoreCopy = {
  wallet: string;
  explore: string;
  account: string;
  miniApps: string;
  devConsole: string;
  stablecoinsOrganized: string;
};

const translations: Record<string, CoreCopy> = {
  en: { wallet: "Wallet", explore: "Explore", account: "Account", miniApps: "Mini apps", devConsole: "Dev Console", stablecoinsOrganized: "Stablecoins, clearly organized." },
  fr: { wallet: "Portefeuille", explore: "Explorer", account: "Compte", miniApps: "Mini-apps", devConsole: "Console développeur", stablecoinsOrganized: "Des stablecoins clairement organisés." },
  es: { wallet: "Billetera", explore: "Explorar", account: "Cuenta", miniApps: "Miniapps", devConsole: "Consola de desarrollo", stablecoinsOrganized: "Stablecoins claramente organizadas." },
  pt: { wallet: "Carteira", explore: "Explorar", account: "Conta", miniApps: "Mini apps", devConsole: "Console de desenvolvimento", stablecoinsOrganized: "Stablecoins claramente organizadas." },
  yo: { wallet: "Àpamọ́ owó", explore: "Ṣàwárí", account: "Àkọọ́lẹ̀", miniApps: "Àwọn mini app", devConsole: "Ibi ìdàgbàsókè", stablecoinsOrganized: "Àwọn stablecoin tí a ṣètò dáadáa." },
};

export function getCoreCopy(language: string | null | undefined) {
  return translations[language ?? ""] ?? translations.en;
}
