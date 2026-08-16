import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const viteConfigSource = readFileSync(resolve(import.meta.dirname, "../vite.config.ts"), "utf8");

describe("production bundle configuration", () => {
  it("does not isolate wallet cryptography from its React and Privy dependencies", () => {
    expect(viteConfigSource).not.toContain('return "wallet-crypto"');
    expect(viteConfigSource).not.toContain('return "privy"');
  });
});
