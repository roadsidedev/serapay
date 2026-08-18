import { describe, expect, it } from "vitest";
import { extractBearerAccessToken, toPrivyIdentity } from "./privyAuth";

describe("Privy authentication helpers", () => {
  it("only accepts a non-empty Bearer token", () => {
    expect(extractBearerAccessToken("Bearer privy-token")).toBe("privy-token");
    expect(extractBearerAccessToken("bearer lower-case")).toBeNull();
    expect(extractBearerAccessToken("Token privy-token")).toBeNull();
    expect(extractBearerAccessToken(undefined)).toBeNull();
  });

  it("maps the verified Privy user identifier to a non-custodial Pocket Sera identity", () => {
    expect(toPrivyIdentity({ user_id: "did:privy:cm123" })).toEqual({
      openId: "did:privy:cm123",
      privyDid: "did:privy:cm123",
      loginMethod: "privy",
    });
  });
});
