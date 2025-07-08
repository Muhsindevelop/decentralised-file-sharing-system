import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("File Audit Contract Tests", () => {
  beforeEach(() => {
    // Deploy contracts
    simnet.deployContract("file-audit", "contracts/file-audit.clar", null, deployer);
  });

  describe("Audit Logging", () => {
    it("should log file operations correctly", () => {
      const fileId = "test-file-123";
      const operation = "upload";
      const metadata = "Test file upload";
      const fileHash = "abc123def456";

      const { result } = simnet.callPublicFn(
        "file-audit",
        "log-file-operation",
        [
          Cl.stringAscii(fileId),
          Cl.stringAscii(operation),
          Cl.stringUtf8(metadata),
          Cl.none(),
          Cl.some(Cl.stringAscii(fileHash))
        ],
        wallet1
      );

      expect(result).toBeOk(Cl.uint(0)); // First audit ID should be 0

      // Verify audit entry was created
      const { result: auditEntry } = simnet.callReadOnlyFn(
        "file-audit",
        "get-audit-entry",
        [Cl.uint(0)],
        wallet1
      );

      expect(auditEntry).toBeSome();
      const auditData = auditEntry.value.data;
      expect(auditData["file-id"]).toBeStringAscii(fileId);
      expect(auditData["operation"]).toBeStringAscii(operation);
      expect(auditData["actor"]).toBePrincipal(wallet1);
      expect(auditData["metadata"]).toBeStringUtf8(metadata);
    });

    it("should increment audit counter correctly", () => {
      const fileId = "test-file-123";
      
      // Log first operation
      simnet.callPublicFn(
        "file-audit",
        "log-file-operation",
        [
          Cl.stringAscii(fileId),
          Cl.stringAscii("upload"),
          Cl.stringUtf8("First operation"),
          Cl.none(),
          Cl.some(Cl.stringAscii("hash1"))
        ],
        wallet1
      );

      // Log second operation
      const { result } = simnet.callPublicFn(
        "file-audit",
        "log-file-operation",
        [
          Cl.stringAscii(fileId),
          Cl.stringAscii("access"),
          Cl.stringUtf8("Second operation"),
          Cl.none(),
          Cl.none()
        ],
        wallet1
      );

      expect(result).toBeOk(Cl.uint(1)); // Second audit ID should be 1

      // Check counter
      const { result: counter } = simnet.callReadOnlyFn(
        "file-audit",
        "get-audit-counter",
        [],
        wallet1
      );

      expect(counter).toBeUint(2);
    });

    it("should update user audit summary", () => {
      const fileId = "test-file-123";
      
      // Log upload operation
      simnet.callPublicFn(
        "file-audit",
        "log-file-operation",
        [
          Cl.stringAscii(fileId),
          Cl.stringAscii("upload"),
          Cl.stringUtf8("Upload operation"),
          Cl.none(),
          Cl.some(Cl.stringAscii("hash1"))
        ],
        wallet1
      );

      // Log access operation
      simnet.callPublicFn(
        "file-audit",
        "log-file-operation",
        [
          Cl.stringAscii(fileId),
          Cl.stringAscii("access"),
          Cl.stringUtf8("Access operation"),
          Cl.none(),
          Cl.none()
        ],
        wallet1
      );

      // Check user summary
      const { result: summary } = simnet.callReadOnlyFn(
        "file-audit",
        "get-user-audit-summary",
        [Cl.principal(wallet1)],
        wallet1
      );

      expect(summary).toBeSome();
      const summaryData = summary.value.data;
      expect(summaryData["total-operations"]).toBeUint(2);
      expect(summaryData["files-uploaded"]).toBeUint(1);
      expect(summaryData["files-accessed"]).toBeUint(1);
    });
  });

  describe("File Integrity", () => {
    it("should initialize file integrity correctly", () => {
      const fileId = "test-file-123";
      const fileHash = "abc123def456";

      const { result } = simnet.callPublicFn(
        "file-audit",
        "update-file-integrity",
        [Cl.stringAscii(fileId), Cl.stringAscii(fileHash)],
        wallet1
      );

      expect(result).toBeOk(Cl.stringAscii("verified"));

      // Check integrity record
      const { result: integrity } = simnet.callReadOnlyFn(
        "file-audit",
        "get-file-integrity",
        [Cl.stringAscii(fileId)],
        wallet1
      );

      expect(integrity).toBeSome();
      const integrityData = integrity.value.data;
      expect(integrityData["original-hash"]).toBeStringAscii(fileHash);
      expect(integrityData["current-hash"]).toBeStringAscii(fileHash);
      expect(integrityData["integrity-status"]).toBeStringAscii("verified");
      expect(integrityData["verification-count"]).toBeUint(1);
    });

    it("should detect file tampering", () => {
      const fileId = "test-file-123";
      const originalHash = "abc123def456";
      const tamperedHash = "xyz789ghi012";

      // Initialize with original hash
      simnet.callPublicFn(
        "file-audit",
        "update-file-integrity",
        [Cl.stringAscii(fileId), Cl.stringAscii(originalHash)],
        wallet1
      );

      // Update with tampered hash
      const { result } = simnet.callPublicFn(
        "file-audit",
        "update-file-integrity",
        [Cl.stringAscii(fileId), Cl.stringAscii(tamperedHash)],
        wallet1
      );

      expect(result).toBeOk(Cl.stringAscii("tampered"));

      // Check tampered status
      const { result: isTampered } = simnet.callReadOnlyFn(
        "file-audit",
        "is-file-tampered",
        [Cl.stringAscii(fileId)],
        wallet1
      );

      expect(isTampered).toBeBool(true);
    });

    it("should verify file integrity correctly", () => {
      const fileId = "test-file-123";
      const correctHash = "abc123def456";
      const wrongHash = "xyz789ghi012";

      // Initialize file integrity
      simnet.callPublicFn(
        "file-audit",
        "update-file-integrity",
        [Cl.stringAscii(fileId), Cl.stringAscii(correctHash)],
        wallet1
      );

      // Verify with correct hash
      const { result: verifyCorrect } = simnet.callPublicFn(
        "file-audit",
        "verify-file-integrity",
        [Cl.stringAscii(fileId), Cl.stringAscii(correctHash)],
        wallet1
      );

      expect(verifyCorrect).toBeOk(Cl.bool(true));

      // Verify with wrong hash
      const { result: verifyWrong } = simnet.callPublicFn(
        "file-audit",
        "verify-file-integrity",
        [Cl.stringAscii(fileId), Cl.stringAscii(wrongHash)],
        wallet1
      );

      expect(verifyWrong).toBeErr(Cl.uint(303)); // ERR_INTEGRITY_VIOLATION
    });
  });

  describe("Input Validation", () => {
    it("should reject empty file ID", () => {
      const { result } = simnet.callPublicFn(
        "file-audit",
        "log-file-operation",
        [
          Cl.stringAscii(""),
          Cl.stringAscii("upload"),
          Cl.stringUtf8("Test"),
          Cl.none(),
          Cl.none()
        ],
        wallet1
      );

      expect(result).toBeErr(Cl.uint(301)); // ERR_INVALID_INPUT
    });

    it("should reject empty operation", () => {
      const { result } = simnet.callPublicFn(
        "file-audit",
        "log-file-operation",
        [
          Cl.stringAscii("test-file"),
          Cl.stringAscii(""),
          Cl.stringUtf8("Test"),
          Cl.none(),
          Cl.none()
        ],
        wallet1
      );

      expect(result).toBeErr(Cl.uint(301)); // ERR_INVALID_INPUT
    });
  });

  describe("System Statistics", () => {
    it("should return correct audit statistics", () => {
      // Log a few operations
      simnet.callPublicFn(
        "file-audit",
        "log-file-operation",
        [
          Cl.stringAscii("file1"),
          Cl.stringAscii("upload"),
          Cl.stringUtf8("Upload 1"),
          Cl.none(),
          Cl.none()
        ],
        wallet1
      );

      simnet.callPublicFn(
        "file-audit",
        "log-file-operation",
        [
          Cl.stringAscii("file2"),
          Cl.stringAscii("upload"),
          Cl.stringUtf8("Upload 2"),
          Cl.none(),
          Cl.none()
        ],
        wallet1
      );

      const { result: stats } = simnet.callReadOnlyFn(
        "file-audit",
        "get-audit-statistics",
        [],
        wallet1
      );

      const statsData = stats.data;
      expect(statsData["total-audits"]).toBeUint(2);
      expect(statsData["current-block"]).toBeUint(simnet.blockHeight);
    });
  });
});
