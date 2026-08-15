import { describe, expect, it } from "vitest";
import { getAllowedOrigin } from "./cors";

describe("external frontend origin policy", () => {
  it("returns a configured HTTPS Vercel origin", () => {
    expect(getAllowedOrigin("https://serapay.vercel.app")).toBe("https://serapay.vercel.app");
  });

  it("rejects non-HTTP and wildcard origins", () => {
    expect(getAllowedOrigin("*")).toBeUndefined();
    expect(getAllowedOrigin("javascript:alert(1)")).toBeUndefined();
  });
});
