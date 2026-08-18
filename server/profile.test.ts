import { describe, expect, it } from "vitest";
import { normalizeUsername, validateUsername } from "../shared/profile";

describe("Pocket Sera username rules", () => {
  it("normalizes social-profile names into stable account handles", () => {
    expect(normalizeUsername("  Ayo O'Neill  ")).toBe("ayo_oneill");
    expect(normalizeUsername("@Sera.Pay")).toBe("serapay");
  });

  it("accepts readable handles and rejects invalid account identifiers", () => {
    expect(validateUsername("ayo_pay")).toEqual({ valid: true });
    expect(validateUsername("ab").valid).toBe(false);
    expect(validateUsername("wallet-address").valid).toBe(false);
  });
});
