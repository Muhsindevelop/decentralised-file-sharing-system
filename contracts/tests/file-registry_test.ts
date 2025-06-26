import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can register a new file",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('file-registry', 'register-file', [
                types.utf8("test-file.txt"),
                types.uint(1024),
                types.ascii("abc123hash"),
                types.utf8("https://gaia.example.com/test-file.txt"),
                types.ascii("def456keyhash"),
                types.bool(false)
            ], deployer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        
        block.receipts[0].result.expectOk().expectAscii("1");
    },
});

Clarinet.test({
    name: "Can get file info after registration",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('file-registry', 'register-file', [
                types.utf8("test-file.txt"),
                types.uint(1024),
                types.ascii("abc123hash"),
                types.utf8("https://gaia.example.com/test-file.txt"),
                types.ascii("def456keyhash"),
                types.bool(true)
            ], deployer.address)
        ]);
        
        let fileId = block.receipts[0].result.expectOk().expectAscii();
        
        let getFileInfo = chain.callReadOnlyFn('file-registry', 'get-file-info', [
            types.ascii(fileId)
        ], deployer.address);
        
        let fileInfo = getFileInfo.result.expectSome().expectTuple();
        assertEquals(fileInfo['file-name'], types.utf8("test-file.txt"));
        assertEquals(fileInfo['file-size'], types.uint(1024));
        assertEquals(fileInfo['is-public'], types.bool(true));
    },
});

Clarinet.test({
    name: "Only owner can update file visibility",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Register file as deployer
        let block = chain.mineBlock([
            Tx.contractCall('file-registry', 'register-file', [
                types.utf8("test-file.txt"),
                types.uint(1024),
                types.ascii("abc123hash"),
                types.utf8("https://gaia.example.com/test-file.txt"),
                types.ascii("def456keyhash"),
                types.bool(false)
            ], deployer.address)
        ]);
        
        let fileId = block.receipts[0].result.expectOk().expectAscii();
        
        // Try to update visibility as non-owner (should fail)
        let block2 = chain.mineBlock([
            Tx.contractCall('file-registry', 'update-file-visibility', [
                types.ascii(fileId),
                types.bool(true)
            ], wallet1.address)
        ]);
        
        block2.receipts[0].result.expectErr().expectUint(100); // ERR_NOT_AUTHORIZED
        
        // Update visibility as owner (should succeed)
        let block3 = chain.mineBlock([
            Tx.contractCall('file-registry', 'update-file-visibility', [
                types.ascii(fileId),
                types.bool(true)
            ], deployer.address)
        ]);
        
        block3.receipts[0].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "Can delete own file",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Register file
        let block = chain.mineBlock([
            Tx.contractCall('file-registry', 'register-file', [
                types.utf8("test-file.txt"),
                types.uint(1024),
                types.ascii("abc123hash"),
                types.utf8("https://gaia.example.com/test-file.txt"),
                types.ascii("def456keyhash"),
                types.bool(false)
            ], deployer.address)
        ]);
        
        let fileId = block.receipts[0].result.expectOk().expectAscii();
        
        // Delete file
        let block2 = chain.mineBlock([
            Tx.contractCall('file-registry', 'delete-file', [
                types.ascii(fileId)
            ], deployer.address)
        ]);
        
        block2.receipts[0].result.expectOk().expectBool(true);
        
        // Verify file is deleted
        let getFileInfo = chain.callReadOnlyFn('file-registry', 'get-file-info', [
            types.ascii(fileId)
        ], deployer.address);
        
        getFileInfo.result.expectNone();
    },
});
