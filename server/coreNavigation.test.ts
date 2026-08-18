import { describe, expect, it } from "vitest";
import { CORE_NAVIGATION } from "../shared/coreNavigation";

describe("Pocket Sera core navigation", () => {
  it("keeps Wallet, Explore, and Account as the only primary destinations", () => {
    expect(CORE_NAVIGATION.map(item => item.id)).toEqual(["wallet", "explore", "account"]);
  });

  it("does not expose swap, activity, or developer tools as primary destinations", () => {
    expect(CORE_NAVIGATION.map(item => item.id)).not.toEqual(expect.arrayContaining(["swap", "activity", "build"]));
  });
});
