import { describe, it, expect } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const user1 = accounts.get("wallet_1")!;
const user2 = accounts.get("wallet_2")!;

describe("Cross-Contract Validation Security Tests", () => {

  it("Grant access fails when caller doesn't own the file", () => {

    // User1 registers a file
    const registerResult = simnet.callPublicFn(
      "file-registry",
      "register-file",
      [
        Cl.stringUtf8("test-file.txt"),
        Cl.uint(1024),
        Cl.stringAscii("abc123hash"),
        Cl.stringUtf8("https://gaia.example.com/test-file.txt"),
        Cl.stringAscii("def456keyhash"),
        Cl.bool(false)
      ],
      user1
    );

    expect(registerResult.result).toBeOk(Cl.stringAscii("0"));

    // User2 tries to grant access to user1's file (should fail)
    const grantResult = simnet.callPublicFn(
      "file-access-control",
      "grant-file-access",
      [
        Cl.stringAscii("0"),
        Cl.principal(deployer),
        Cl.stringAscii("read"),
        Cl.none()
      ],
      user2
    );

    expect(grantResult.result).toBeErr(Cl.uint(200)); // ERR_NOT_AUTHORIZED
  });

  it("Grant access succeeds when caller owns the file", () => {

    // User1 registers a file
    const registerResult = simnet.callPublicFn(
      "file-registry",
      "register-file",
      [
        Cl.stringUtf8("test-file.txt"),
        Cl.uint(1024),
        Cl.stringAscii("abc123hash"),
        Cl.stringUtf8("https://gaia.example.com/test-file.txt"),
        Cl.stringAscii("def456keyhash"),
        Cl.bool(false)
      ],
      user1
    );

    expect(registerResult.result).toBeOk(Cl.stringAscii("0"));

    // User1 grants access to deployer (should succeed)
    const grantResult = simnet.callPublicFn(
      "file-access-control",
      "grant-file-access",
      [
        Cl.stringAscii("0"),
        Cl.principal(deployer),
        Cl.stringAscii("read"),
        Cl.none()
      ],
      user1
    );

    expect(grantResult.result).toBeOk(Cl.bool(true));
  });

  it("Grant access fails for non-existent file", () => {

    // Try to grant access to non-existent file
    const grantResult = simnet.callPublicFn(
      "file-access-control",
      "grant-file-access",
      [
        Cl.stringAscii("999"), // Non-existent file ID
        Cl.principal(deployer),
        Cl.stringAscii("read"),
        Cl.none()
      ],
      user1
    );

    expect(grantResult.result).toBeErr(Cl.uint(200)); // ERR_NOT_AUTHORIZED
  });

  it("Request access fails for non-existent file", () => {

    // Try to request access to non-existent file
    const requestResult = simnet.callPublicFn(
      "file-access-control",
      "request-file-access",
      [
        Cl.stringAscii("999"), // Non-existent file ID
        Cl.stringUtf8("Please grant me access")
      ],
      user1
    );

    expect(requestResult.result).toBeErr(Cl.uint(201)); // ERR_FILE_NOT_FOUND
  });
});
