import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/Home.tsx"), "utf8");
const accountPanelSource = readFileSync(resolve(import.meta.dirname, "../client/src/components/AccountProfilePanel.tsx"), "utf8");

describe("Account navigation surface", () => {
  it("keeps passkey setup in Account settings instead of the top navigation", () => {
    const topBarSource = homeSource.slice(homeSource.indexOf("function TopBar"), homeSource.indexOf("function ReceiveDialog"));
    expect(topBarSource).not.toContain("Passkey");
    expect(topBarSource).not.toContain("onPasskey");
    expect(accountPanelSource).toContain("Add or update passkey");
  });

  it("uses AccountView as the sole Dev Console entry point", () => {
    expect(accountPanelSource).not.toContain("onOpenDevConsole");
    expect(accountPanelSource).not.toContain("Open Dev Console");
    expect(homeSource).toContain("function AccountView");
  });
});
