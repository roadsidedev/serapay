import { describe, expect, it } from "vitest";
import {
  isPublicHttpUrl,
  miniAppManifestSchema,
  miniAppSubmissionSchema,
  toMiniAppPermissions,
} from "../shared/miniApps";

describe("mini-app safety contracts", () => {
  it("accepts a complete submission with declared capabilities", () => {
    const result = miniAppSubmissionSchema.safeParse({
      name: "Utility desk",
      description: "Pay for a household utility with a Sera wallet.",
      logoUrl: "https://example.com/icon.svg",
      launchUrl: "https://example.com/app",
      manifestUrl: "https://example.com/sera-mini-app.json",
      developerIdentity: "Example Labs",
      category: "Utilities",
      version: "1.0.0",
      permissions: ["wallet.balance", "wallet.payment"],
      supportedCurrencies: ["USD", "NGN"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsafe local URLs before server reachability checks", () => {
    expect(isPublicHttpUrl("http://127.0.0.1:3000")).toBe(false);
    expect(isPublicHttpUrl("http://localhost:3000")).toBe(false);
    expect(isPublicHttpUrl("https://example.com/app")).toBe(true);
  });

  it("deduplicates the requested capabilities", () => {
    expect(toMiniAppPermissions(["wallet.read", "wallet.read", "wallet.swap"])).toEqual([
      "wallet.read",
      "wallet.swap",
    ]);
  });

  it("requires mini-app manifests to identify the app and requested permissions", () => {
    expect(
      miniAppManifestSchema.safeParse({
        name: "Utility desk",
        description: "Pay a household utility with a Sera wallet.",
        version: "1.0.0",
        developer: "Example Labs",
        permissions: ["wallet.balance", "wallet.payment"],
      }).success,
    ).toBe(true);
  });
});
