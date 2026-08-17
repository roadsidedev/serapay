import { beforeAll, describe, expect, it, vi } from "vitest";
import { getSeraApiKeyManagementTypedData } from "../shared/sera";

beforeAll(() => {
  process.env.SERA_CREDENTIAL_ENCRYPTION_KEY = "11".repeat(32);
});

describe("Sera per-user API credentials", () => {
  it("builds the documented ManageApiKey payload", () => {
    const typedData = getSeraApiKeyManagementTypedData("0x0000000000000000000000000000000000000001", 1786957207);
    expect(typedData.primaryType).toBe("ManageApiKey");
    expect(typedData.domain.verifyingContract).toBe("0xB5C50C5D5f038404F85970b7f5B7259C4AC0E198");
    expect(typedData.message).toEqual({ owner: "0x0000000000000000000000000000000000000001", action: "create", timestamp: 1786957207 });
  });

  it("encrypts and decrypts an API secret without storing it in plaintext", async () => {
    vi.resetModules();
    const { decryptSeraApiSecret, encryptSeraApiSecret } = await import("./seraCredentialCrypto");
    const encrypted = encryptSeraApiSecret("secret-value");
    expect(encrypted).not.toContain("secret-value");
    expect(decryptSeraApiSecret(encrypted)).toBe("secret-value");
  });
});
