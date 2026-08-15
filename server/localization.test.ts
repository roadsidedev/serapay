import { describe, expect, it } from "vitest";
import { getCoreCopy } from "../shared/localization";

describe("SeraPay core localization", () => {
  it("returns translated core navigation labels for a supported language", () => {
    expect(getCoreCopy("fr").account).toBe("Compte");
    expect(getCoreCopy("es").explore).toBe("Explorar");
  });

  it("falls back to English for an unsupported language", () => {
    expect(getCoreCopy("unsupported").wallet).toBe("Wallet");
  });
});
