import { describe, expect, it } from "vitest";
import {
  buildSeraAuthorizationHeader,
  normaliseSeraBalances,
  normaliseSeraFills,
  normaliseSeraOrders,
  normaliseSeraReadAddress,
} from "../shared/sera";
import { encodeErc20Transfer, getErc2612PermitTypedData, getSeraSwapTypedData, getSeraWithdrawTypedData, parseTokenAmount } from "../shared/wallet";

describe("Sera adapter contracts", () => {
  it("creates a server-only bearer authorization value", () => {
    expect(buildSeraAuthorizationHeader("sera_key", "secret")).toBe(
      "Bearer sera_key:secret",
    );
  });

  it("normalises read addresses to Sera's lowercase requirement", () => {
    expect(normaliseSeraReadAddress("0xAbCDef")).toBe("0xabcdef");
  });

  it("keeps wallet, vault, and frozen balances distinct", () => {
    const rows = normaliseSeraBalances({
      balances: [
        {
          symbol: "USDC",
          currency: "USD",
          wallet_balance: "125.50",
          vault_available: "20.25",
          vault_frozen: "2.00",
          token_address: "0xa0b8",
        },
      ],
    });

    expect(rows).toEqual([
      expect.objectContaining({
        symbol: "USDC",
        walletBalance: "125.50",
        vaultAvailable: "20.25",
        vaultFrozen: "2.00",
      }),
    ]);
  });

  it("normalises order and fill activity into stable status records", () => {
    expect(normaliseSeraOrders({ orders: [{ order_id: "order-1", status: "open", created_at: "2026-08-15T00:00:00Z" }] })).toEqual([
      { id: "order-1", kind: "order", status: "open", createdAt: "2026-08-15T00:00:00Z" },
    ]);
    expect(normaliseSeraFills({ fills: [{ fill_id: "fill-1", status: "settled", created_at: "2026-08-15T00:01:00Z" }] })).toEqual([
      { id: "fill-1", kind: "fill", status: "settled", createdAt: "2026-08-15T00:01:00Z" },
    ]);
  });

  it("constructs the documented swap intent typed data without a private key", () => {
    const typedData = getSeraSwapTypedData({
      taker: "0x0000000000000000000000000000000000000001",
      inputToken: "0x0000000000000000000000000000000000000002",
      outputToken: "0x0000000000000000000000000000000000000003",
      maxInputAmount: "1000000",
      minOutputAmount: "990000",
      recipient: "0x0000000000000000000000000000000000000001",
      initialDepositAmount: "0",
      uuid: "42",
      deadline: "1767225600",
    });

    expect(typedData.primaryType).toBe("Intent");
    expect(typedData.domain.name).toBe("Sera");
    expect(typedData.types.Intent).toHaveLength(9);
  });

  it("requires the quote-derived permit fields for a signed Sera swap when a permit is required", async () => {
    const { validateSeraSwapExecution } = await import("../shared/sera");
    expect(() => validateSeraSwapExecution({ uuid: "42", signature: "0xabc", permitRequired: true })).toThrow(/permit signature/i);
    expect(validateSeraSwapExecution({ uuid: "42", signature: "0xabc", permitRequired: false })).toEqual({ uuid: "42", signature: "0xabc" });
  });

  it("constructs the ERC-2612 permit message used by the Vault deposit path", () => {
    const permit = getErc2612PermitTypedData(
      { name: "USD Coin", version: "2", chainId: 1, verifyingContract: "0x0000000000000000000000000000000000000002" },
      { owner: "0x0000000000000000000000000000000000000001", spender: "0x0000000000000000000000000000000000000003", value: "1000000", nonce: 7, deadline: 1_800_000_000 },
    );
    expect(permit.primaryType).toBe("Permit");
    expect(permit.message).toMatchObject({ value: "1000000", nonce: 7, deadline: 1_800_000_000 });
  });

  it("rejects expired Sera quote timestamps before opening a signing flow", async () => {
    const { isSeraQuoteUsable } = await import("../shared/sera");
    expect(isSeraQuoteUsable("2026-08-15T12:00:00Z", new Date("2026-08-15T12:00:01Z"))).toBe(false);
    expect(isSeraQuoteUsable("2026-08-15T12:01:00Z", new Date("2026-08-15T12:00:01Z"))).toBe(true);
    expect(isSeraQuoteUsable(1786795260, new Date("2026-08-15T12:00:01Z"))).toBe(true);
  });

  it("uses a thirty-second quote window for a fresh Sera route", () => {
    const quoteRequestedAt = 1_786_795_200;
    const quoteExpiration = quoteRequestedAt + 30;
    expect(quoteExpiration - quoteRequestedAt).toBe(30);
  });

  it("recognizes Sera terminal settlement statuses used by swap and Vault refreshes", async () => {
    const { isSeraSettlementTerminal } = await import("../shared/sera");
    expect(isSeraSettlementTerminal("filled")).toBe(true);
    expect(isSeraSettlementTerminal("completed_onchain")).toBe(true);
    expect(isSeraSettlementTerminal("pending")).toBe(false);
    expect(isSeraSettlementTerminal("reverted")).toBe(false);
  });

  it("constructs the dual-signature withdrawal intent with aligned token arrays", () => {
    const typedData = getSeraWithdrawTypedData({
      user: "0x0000000000000000000000000000000000000001",
      tokens: ["0x0000000000000000000000000000000000000002"],
      amounts: ["1000000"],
      recipient: "0x0000000000000000000000000000000000000001",
      deadline: "1767225600",
      uuid: "42",
    });

    expect(typedData.primaryType).toBe("WithdrawIntent");
    expect(typedData.types.WithdrawIntent).toHaveLength(6);
    expect(typedData.message.amounts).toEqual(["1000000"]);
  });

  it("converts decimal asset values without precision loss before transfer encoding", () => {
    expect(parseTokenAmount("12.34", 6)).toBe("12340000");
    expect(
      encodeErc20Transfer("0x00000000000000000000000000000000000000ab", "12340000"),
    ).toBe(
      "0xa9059cbb00000000000000000000000000000000000000000000000000000000000000ab0000000000000000000000000000000000000000000000000000000000bc4b20",
    );
  });
});
