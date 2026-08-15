import { describe, expect, it } from "vitest";
import { deriveUsernameSuggestion } from "../shared/usernameSuggestion";

describe("deriveUsernameSuggestion", () => {
  it("prioritizes a linked social username and normalizes it for SeraPay", () => {
    expect(deriveUsernameSuggestion({ linkedAccounts: [{ type: "twitter_oauth", username: "Ayo Pay!" }] })).toBe("ayo_pay");
  });

  it("falls back to an email local-part and omits empty identity fields", () => {
    expect(deriveUsernameSuggestion({ linkedAccounts: [{ type: "email", address: "owner@serapay.example" }] })).toBe("owner");
    expect(deriveUsernameSuggestion({ linkedAccounts: [] })).toBeNull();
  });
});
