import { describe, expect, it } from "vitest";
import { resolveThemePreference } from "../shared/themePreference";

describe("resolveThemePreference", () => {
  it("keeps explicit light and dark preferences", () => {
    expect(resolveThemePreference("light", true)).toBe("light");
    expect(resolveThemePreference("dark", false)).toBe("dark");
  });

  it("uses the device preference only for the system option", () => {
    expect(resolveThemePreference("system", true)).toBe("dark");
    expect(resolveThemePreference("system", false)).toBe("light");
  });
});
