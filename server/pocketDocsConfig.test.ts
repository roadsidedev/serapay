import { existsSync, readFileSync } from "node:fs";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("Pocket Sera documentation site", () => {
  it("builds Starlight documentation under the production /doc path", () => {
    const configPath = resolve(projectRoot, "docs-site/astro.config.mjs");
    const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8")) as { scripts: Record<string, string> };

    expect(existsSync(configPath)).toBe(true);
    const config = readFileSync(configPath, "utf8");
    expect(config).toContain("@astrojs/starlight");
    expect(config).toContain("base: \"/doc\"");
    expect(packageJson.scripts["docs:build"]).toContain("astro build");
    expect(packageJson.scripts.build).toContain("docs:build");
  });

  it("includes the required Mini App developer guides", () => {
    const requiredPages = [
      "index.md",
      "mini-apps/manifest.md",
      "mini-apps/staging.md",
      "mini-apps/wallet-and-permissions.md",
      "mini-apps/submission-and-review.md",
      "operations/deploy-pocket-mini-app.md",
      "reference/staging-context.md",
    ];

    requiredPages.forEach((page) => {
      expect(existsSync(resolve(projectRoot, "docs-site/src/content/docs", page))).toBe(true);
    });
  });

  it("keeps internal content links inside the /doc deployment base", () => {
    const docsRoot = resolve(projectRoot, "docs-site/src/content/docs");
    const readMarkdownFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? readMarkdownFiles(path) : entry.name.endsWith(".md") ? [path] : [];
    });

    readMarkdownFiles(docsRoot).forEach((filePath) => {
      const content = readFileSync(filePath, "utf8");
      expect(content).not.toMatch(/\]\(\/(?!doc\/)/);
    });
  });
});
