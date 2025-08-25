import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;
const deployer = accounts.get("deployer")!;

describe("file-audit-analytics contract", () => {
  
  describe("Read-Only Functions", () => {
    it("should check if analytics are enabled by default", () => {
      const { result } = simnet.callReadOnlyFn(
        "file-audit-analytics",
        "is-analytics-enabled",
        [],
        address1
      );

      expect(result).toBeBool(true);
    });

    it("should get initial audit counter as zero", () => {
      const { result } = simnet.callReadOnlyFn(
        "file-audit-analytics",
        "get-audit-counter",
        [],
        address1
      );

      expect(result).toBeUint(0);
    });
  });

  describe("Administrative Functions", () => {
    it("should toggle analytics state", () => {
      // Check initial state is true
      let { result: initialState } = simnet.callReadOnlyFn(
        "file-audit-analytics",
        "is-analytics-enabled",
        [],
        deployer
      );
      expect(initialState).toBeBool(true);

      // Toggle analytics off - just verify it executes without error
      simnet.callPublicFn(
        "file-audit-analytics",
        "toggle-analytics",
        [],
        deployer
      );
      
      // Check new state is false
      const { result: newState } = simnet.callReadOnlyFn(
        "file-audit-analytics",
        "is-analytics-enabled",
        [],
        deployer
      );
      expect(newState).toBeBool(false);
    });
  });
});