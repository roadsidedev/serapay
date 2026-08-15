import { describe, expect, it } from "vitest";
import { isStagingMiniAppUrl } from "../shared/staging";

describe("isStagingMiniAppUrl", () => {
  it("permits loopback HTTP previews and public HTTPS previews", () => {
    expect(isStagingMiniAppUrl("http://localhost:5173")).toBe(true);
    expect(isStagingMiniAppUrl("http://127.0.0.1:3001/app")).toBe(true);
    expect(isStagingMiniAppUrl("https://preview.example.com")).toBe(true);
  });

  it("rejects insecure remote, credentialed, and non-web URLs", () => {
    expect(isStagingMiniAppUrl("http://preview.example.com")).toBe(false);
    expect(isStagingMiniAppUrl("https://user:pass@preview.example.com")).toBe(false);
    expect(isStagingMiniAppUrl("file:///tmp/mini-app.html")).toBe(false);
    expect(isStagingMiniAppUrl("not a url")).toBe(false);
  });
});
