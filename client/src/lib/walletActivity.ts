export type WalletActivityKind = "send" | "swap" | "deposit" | "withdrawal";

export type WalletActivityEntry = {
  id: string;
  kind: WalletActivityKind;
  label: string;
  status: "submitted" | "confirmed" | "failed";
  createdAt: string;
};

export function createWalletActivityEntry(input: Pick<WalletActivityEntry, "kind" | "id" | "label">): WalletActivityEntry {
  return { ...input, status: "submitted", createdAt: new Date().toISOString() };
}

const ACTIVITY_STORAGE_KEY = "serapay-wallet-activity";

export function readWalletActivity(): WalletActivityEntry[] {
  try {
    const raw = window.localStorage.getItem(ACTIVITY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordWalletActivity(entry: WalletActivityEntry) {
  const entries = [entry, ...readWalletActivity()].slice(0, 50);
  window.localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(entries));
  return entries;
}
