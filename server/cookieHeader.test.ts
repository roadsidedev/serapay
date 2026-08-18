import { describe, expect, it } from "vitest";
import { parseCookieHeader } from "./_core/cookieHeader";

describe("parseCookieHeader", () => {
  it("reads encoded cookie values without depending on the cookie package API", () => {
    expect(parseCookieHeader("session=token%20value; theme=dark")).toEqual({
      session: "token value",
      theme: "dark",
    });
  });

  it("returns an empty object for an absent header and preserves malformed values", () => {
    expect(parseCookieHeader(undefined)).toEqual({});
    expect(parseCookieHeader("bad=%E0%A4%A")).toEqual({ bad: "%E0%A4%A" });
  });
});
