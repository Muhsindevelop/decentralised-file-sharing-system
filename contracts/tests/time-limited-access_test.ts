import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can grant time-limited access",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('time-limited-access', 'grant-time-limited-access', [
                types.ascii("file123"),
                types.principal(wallet1.address),
                types.ascii("read"),
                types.uint(100), // duration in blocks
                types.bool(false), // auto-renew
                types.uint(50), // renewal duration
                types.uint(3) // max renewals
            ], deployer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        let result = block.receipts[0].result.expectOk().expectAscii();
        assertEquals(result, "grant1");
    },
});

Clarinet.test({
    name: "Can check valid access",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Grant access
        chain.mineBlock([
            Tx.contractCall('time-limited-access', 'grant-time-limited-access', [
                types.ascii("file123"),
                types.principal(wallet1.address),
                types.ascii("read"),
                types.uint(100),
                types.bool(false),
                types.uint(50),
                types.uint(3)
            ], deployer.address)
        ]);
        
        // Check access
        let hasAccess = chain.callReadOnlyFn('time-limited-access', 'has-valid-access', [
            types.ascii("file123"),
            types.principal(wallet1.address)
        ], deployer.address);
        
        assertEquals(hasAccess.result, types.bool(true));
    },
});

Clarinet.test({
    name: "Access expires after duration",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Grant short-term access (1 block)
        chain.mineBlock([
            Tx.contractCall('time-limited-access', 'grant-time-limited-access', [
                types.ascii("file123"),
                types.principal(wallet1.address),
                types.ascii("read"),
                types.uint(1), // 1 block duration
                types.bool(false),
                types.uint(50),
                types.uint(3)
            ], deployer.address)
        ]);
        
        // Mine a block to advance time
        chain.mineBlock([]);
        
        // Check if access is expired
        let isExpired = chain.callReadOnlyFn('time-limited-access', 'is-access-expired-check', [
            types.ascii("file123"),
            types.principal(wallet1.address)
        ], deployer.address);
        
        assertEquals(isExpired.result, types.bool(true));
    },
});

Clarinet.test({
    name: "Can revoke access",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Grant access
        chain.mineBlock([
            Tx.contractCall('time-limited-access', 'grant-time-limited-access', [
                types.ascii("file123"),
                types.principal(wallet1.address),
                types.ascii("read"),
                types.uint(100),
                types.bool(false),
                types.uint(50),
                types.uint(3)
            ], deployer.address)
        ]);
        
        // Revoke access
        let revokeBlock = chain.mineBlock([
            Tx.contractCall('time-limited-access', 'revoke-time-limited-access', [
                types.ascii("file123"),
                types.principal(wallet1.address)
            ], deployer.address)
        ]);
        
        revokeBlock.receipts[0].result.expectOk();
        
        // Check access is no longer valid
        let hasAccess = chain.callReadOnlyFn('time-limited-access', 'has-valid-access', [
            types.ascii("file123"),
            types.principal(wallet1.address)
        ], deployer.address);
        
        assertEquals(hasAccess.result, types.bool(false));
    },
});

Clarinet.test({
    name: "Can renew access",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Grant access
        chain.mineBlock([
            Tx.contractCall('time-limited-access', 'grant-time-limited-access', [
                types.ascii("file123"),
                types.principal(wallet1.address),
                types.ascii("read"),
                types.uint(10), // short duration
                types.bool(false),
                types.uint(50),
                types.uint(3) // allow renewals
            ], deployer.address)
        ]);
        
        // Renew access
        let renewBlock = chain.mineBlock([
            Tx.contractCall('time-limited-access', 'renew-access', [
                types.ascii("file123"),
                types.principal(wallet1.address),
                types.uint(100) // additional duration
            ], deployer.address)
        ]);
        
        let newExpiresAt = renewBlock.receipts[0].result.expectOk().expectUint();
        
        // Should be original expiry + additional duration
        // Original: block 2 + 10 = 12, Additional: 100, New: 112
        assertEquals(newExpiresAt, 112);
    },
});

Clarinet.test({
    name: "Can extend access duration by grant ID",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Grant access
        let grantBlock = chain.mineBlock([
            Tx.contractCall('time-limited-access', 'grant-time-limited-access', [
                types.ascii("file123"),
                types.principal(wallet1.address),
                types.ascii("read"),
                types.uint(10),
                types.bool(false),
                types.uint(50),
                types.uint(3)
            ], deployer.address)
        ]);
        
        let grantId = grantBlock.receipts[0].result.expectOk().expectAscii();
        
        // Extend access
        let extendBlock = chain.mineBlock([
            Tx.contractCall('time-limited-access', 'extend-access-duration', [
                types.ascii(grantId),
                types.uint(50) // additional blocks
            ], deployer.address)
        ]);
        
        let newExpiresAt = extendBlock.receipts[0].result.expectOk().expectUint();
        
        // Should be original expiry + extension
        // Original: block 2 + 10 = 12, Extension: 50, New: 62
        assertEquals(newExpiresAt, 62);
    },
});

Clarinet.test({
    name: "Fails with invalid duration",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('time-limited-access', 'grant-time-limited-access', [
                types.ascii("file123"),
                types.principal(wallet1.address),
                types.ascii("read"),
                types.uint(0), // invalid duration
                types.bool(false),
                types.uint(50),
                types.uint(3)
            ], deployer.address)
        ]);
        
        block.receipts[0].result.expectErr().expectUint(405); // ERR_INVALID_DURATION
    },
});

Clarinet.test({
    name: "Cannot grant to self",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('time-limited-access', 'grant-time-limited-access', [
                types.ascii("file123"),
                types.principal(deployer.address), // granting to self
                types.ascii("read"),
                types.uint(100),
                types.bool(false),
                types.uint(50),
                types.uint(3)
            ], deployer.address)
        ]);
        
        block.receipts[0].result.expectErr().expectUint(407); // ERR_CANNOT_GRANT_TO_SELF
    },
});

Clarinet.test({
    name: "Can get remaining access time",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Grant access with 100 block duration
        chain.mineBlock([
            Tx.contractCall('time-limited-access', 'grant-time-limited-access', [
                types.ascii("file123"),
                types.principal(wallet1.address),
                types.ascii("read"),
                types.uint(100),
                types.bool(false),
                types.uint(50),
                types.uint(3)
            ], deployer.address)
        ]);
        
        // Check remaining time
        let remainingTime = chain.callReadOnlyFn('time-limited-access', 'get-remaining-access-time', [
            types.ascii("file123"),
            types.principal(wallet1.address)
        ], deployer.address);
        
        // Should be 100 blocks remaining (granted at block 2, expires at block 102, current block 2)
        assertEquals(remainingTime.result.expectSome(), types.uint(100));
    },
});
