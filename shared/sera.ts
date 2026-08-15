export type SeraBalance = {
  symbol: string;
  currency: string;
  tokenAddress: string;
  walletBalance: string;
  vaultAvailable: string;
  vaultFrozen: string;
};

export type SeraActivityRecord = {
  id: string;
  kind: "order" | "fill";
  status: string;
  createdAt: string;
  txHash?: string;
};

type SeraBalanceResponse = {
  balances?: Array<{
    symbol?: string;
    currency?: string;
    token_address?: string;
    address?: string;
    wallet_balance?: string;
    vault_available?: string;
    vault_frozen?: string;
  }>;
};

export const SERA_API_BASE_URL = "https://api.sera.cx/api/v1";

export function buildSeraAuthorizationHeader(apiKey: string, apiSecret: string) {
  return `Bearer ${apiKey}:${apiSecret}`;
}

export function normaliseSeraReadAddress(address: string) {
  return address.toLowerCase();
}

export function normaliseSeraBalances(response: SeraBalanceResponse): SeraBalance[] {
  return (response.balances ?? []).map(balance => ({
    symbol: balance.symbol ?? "Unknown",
    currency: balance.currency ?? "—",
    tokenAddress: balance.token_address ?? balance.address ?? "",
    walletBalance: balance.wallet_balance ?? "0",
    vaultAvailable: balance.vault_available ?? "0",
    vaultFrozen: balance.vault_frozen ?? "0",
  }));
}

function normaliseSeraActivity(
  values: Array<{ order_id?: string; fill_id?: string; id?: string; status?: string; created_at?: string; createdAt?: string; tx_hash?: string; txHash?: string }> | undefined,
  kind: SeraActivityRecord["kind"],
) {
  return (values ?? []).map(value => ({
    id: value.order_id ?? value.fill_id ?? value.id ?? "unknown",
    kind,
    status: value.status ?? "pending",
    createdAt: value.created_at ?? value.createdAt ?? "",
    txHash: value.tx_hash ?? value.txHash,
  }));
}

export function normaliseSeraOrders(response: { orders?: Array<{ order_id?: string; id?: string; status?: string; created_at?: string; createdAt?: string; tx_hash?: string; txHash?: string }> }) {
  return normaliseSeraActivity(response.orders, "order");
}

export function normaliseSeraFills(response: { fills?: Array<{ fill_id?: string; id?: string; status?: string; created_at?: string; createdAt?: string; tx_hash?: string; txHash?: string }> }) {
  return normaliseSeraActivity(response.fills, "fill");
}

export function toSeraErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "detail" in payload) {
    const detail = payload.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
  }

  return fallback;
}
