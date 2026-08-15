import { describe, expect, it } from "vitest";
import { normalizeAccountPreferences } from "../shared/accountPreferences";

describe("account preferences", () => {
  it("normalizes supported country, currency, language, and device-approval settings", () => {
    expect(normalizeAccountPreferences({
      countryCode: "NG",
      preferredCurrency: "NGN",
      preferredLanguage: "yo",
      deviceApproval: "passkey",
    })).toEqual({
      countryCode: "NG",
      preferredCurrency: "NGN",
      preferredLanguage: "yo",
      deviceApproval: "passkey",
    });
  });

  it("falls back to safe global defaults for unsupported values", () => {
    expect(normalizeAccountPreferences({
      countryCode: "XX",
      preferredCurrency: "INVALID",
      preferredLanguage: "unknown",
      deviceApproval: "anything-else",
    })).toEqual({
      countryCode: "US",
      preferredCurrency: "USD",
      preferredLanguage: "en",
      deviceApproval: "passkey",
    });
  });
});
