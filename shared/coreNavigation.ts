export const CORE_NAVIGATION = [
  { id: "wallet", label: "Wallet" },
  { id: "explore", label: "Explore" },
  { id: "account", label: "Account" },
] as const;

export type CoreView = (typeof CORE_NAVIGATION)[number]["id"];
