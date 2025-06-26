import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can grant file access",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('file-access-control', 'grant-file-access', [
                types.ascii("file123"),
                types.principal(wallet1.address),
                types.ascii("read"),
                types.none()
            ], deployer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        
        block.receipts[0].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "Can check if user has access",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Grant access
        let block = chain.mineBlock([
            Tx.contractCall('file-access-control', 'grant-file-access', [
                types.ascii("file123"),
                types.principal(wallet1.address),
                types.ascii("read"),
                types.none()
            ], deployer.address)
        ]);
        
        // Check access
        let hasAccess = chain.callReadOnlyFn('file-access-control', 'has-file-access', [
            types.ascii("file123"),
            types.principal(wallet1.address)
        ], deployer.address);
        
        hasAccess.result.expectBool(true);
        
        // Check access for user without permission
        let noAccess = chain.callReadOnlyFn('file-access-control', 'has-file-access', [
            types.ascii("file123"),
            types.principal(deployer.address)
        ], deployer.address);
        
        noAccess.result.expectBool(false);
    },
});

Clarinet.test({
    name: "Can revoke file access",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Grant access
        let block = chain.mineBlock([
            Tx.contractCall('file-access-control', 'grant-file-access', [
                types.ascii("file123"),
                types.principal(wallet1.address),
                types.ascii("read"),
                types.none()
            ], deployer.address)
        ]);
        
        // Revoke access
        let block2 = chain.mineBlock([
            Tx.contractCall('file-access-control', 'revoke-file-access', [
                types.ascii("file123"),
                types.principal(wallet1.address)
            ], deployer.address)
        ]);
        
        block2.receipts[0].result.expectOk().expectBool(true);
        
        // Check access is revoked
        let hasAccess = chain.callReadOnlyFn('file-access-control', 'has-file-access', [
            types.ascii("file123"),
            types.principal(wallet1.address)
        ], deployer.address);
        
        hasAccess.result.expectBool(false);
    },
});

Clarinet.test({
    name: "Can request file access",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('file-access-control', 'request-file-access', [
                types.ascii("file123"),
                types.utf8("Please grant me access to this file")
            ], wallet1.address)
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        
        // Check request exists
        let getRequest = chain.callReadOnlyFn('file-access-control', 'get-access-request', [
            types.ascii("file123"),
            types.principal(wallet1.address)
        ], deployer.address);
        
        let requestData = getRequest.result.expectSome().expectTuple();
        assertEquals(requestData['status'], types.ascii("pending"));
        assertEquals(requestData['message'], types.utf8("Please grant me access to this file"));
    },
});

Clarinet.test({
    name: "Can approve access request",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Request access
        let block = chain.mineBlock([
            Tx.contractCall('file-access-control', 'request-file-access', [
                types.ascii("file123"),
                types.utf8("Please grant me access")
            ], wallet1.address)
        ]);
        
        // Approve request
        let block2 = chain.mineBlock([
            Tx.contractCall('file-access-control', 'respond-to-access-request', [
                types.ascii("file123"),
                types.principal(wallet1.address),
                types.bool(true),
                types.ascii("read")
            ], deployer.address)
        ]);
        
        block2.receipts[0].result.expectOk().expectBool(true);
        
        // Check user now has access
        let hasAccess = chain.callReadOnlyFn('file-access-control', 'has-file-access', [
            types.ascii("file123"),
            types.principal(wallet1.address)
        ], deployer.address);
        
        hasAccess.result.expectBool(true);
    },
});
