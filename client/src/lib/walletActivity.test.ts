import { describe, expect, it } from "vitest";
import { createWalletActivityEntry } from "./walletActivity";

describe("wallet lifecycle activity", () => {
  it("creates a pending activity entry for a submitted wallet action", () => {
    const entry = createWalletActivityEntry({ kind: "send", id: "0xabc", label: "USDC sent" });
    expect(entry).toMatchObject({ kind: "send", id: "0xabc", label: "USDC sent", status: "submitted" });
    expect(entry.createdAt).toEqual(expect.any(String));
  });
});

