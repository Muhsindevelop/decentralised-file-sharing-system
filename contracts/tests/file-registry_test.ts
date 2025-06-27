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

Clarinet.test({
    name: "File versioning: Can upload new version",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        // Register initial file
        let block = chain.mineBlock([
            Tx.contractCall('file-registry', 'register-file', [
                types.utf8("test-file.txt"),
                types.uint(1024),
                types.ascii("abc123hash"),
                types.utf8("https://gaia.example.com/test-file-v1.txt"),
                types.ascii("def456keyhash"),
                types.bool(false)
            ], deployer.address)
        ]);

        let fileId = block.receipts[0].result.expectOk().expectAscii();

        // Upload new version
        let block2 = chain.mineBlock([
            Tx.contractCall('file-registry', 'upload-new-version', [
                types.ascii(fileId),
                types.uint(2048),
                types.ascii("xyz789hash"),
                types.utf8("https://gaia.example.com/test-file-v2.txt"),
                types.ascii("ghi012keyhash"),
                types.utf8("Updated content with new features")
            ], deployer.address)
        ]);

        block2.receipts[0].result.expectOk().expectUint(2);

        // Verify file metadata updated to version 2
        let getFileInfo = chain.callReadOnlyFn('file-registry', 'get-file-info', [
            types.ascii(fileId)
        ], deployer.address);

        let fileInfo = getFileInfo.result.expectSome().expectTuple();
        assertEquals(fileInfo['current-version'], types.uint(2));
        assertEquals(fileInfo['total-versions'], types.uint(2));
        assertEquals(fileInfo['file-hash'], types.ascii("xyz789hash"));
    },
});

Clarinet.test({
    name: "File versioning: Can get version details",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        // Register file and upload version
        let block = chain.mineBlock([
            Tx.contractCall('file-registry', 'register-file', [
                types.utf8("test-file.txt"),
                types.uint(1024),
                types.ascii("abc123hash"),
                types.utf8("https://gaia.example.com/test-file-v1.txt"),
                types.ascii("def456keyhash"),
                types.bool(false)
            ], deployer.address),
        ]);

        let fileId = block.receipts[0].result.expectOk().expectAscii();

        let block2 = chain.mineBlock([
            Tx.contractCall('file-registry', 'upload-new-version', [
                types.ascii(fileId),
                types.uint(2048),
                types.ascii("xyz789hash"),
                types.utf8("https://gaia.example.com/test-file-v2.txt"),
                types.ascii("ghi012keyhash"),
                types.utf8("Bug fixes and improvements")
            ], deployer.address)
        ]);

        // Get version 1 details
        let version1 = chain.callReadOnlyFn('file-registry', 'get-file-version', [
            types.ascii(fileId),
            types.uint(1)
        ], deployer.address);

        let v1Data = version1.result.expectSome().expectTuple();
        assertEquals(v1Data['file-hash'], types.ascii("abc123hash"));
        assertEquals(v1Data['version-notes'], types.utf8("Initial version"));
        assertEquals(v1Data['previous-version'], types.none());

        // Get version 2 details
        let version2 = chain.callReadOnlyFn('file-registry', 'get-file-version', [
            types.ascii(fileId),
            types.uint(2)
        ], deployer.address);

        let v2Data = version2.result.expectSome().expectTuple();
        assertEquals(v2Data['file-hash'], types.ascii("xyz789hash"));
        assertEquals(v2Data['version-notes'], types.utf8("Bug fixes and improvements"));
        assertEquals(v2Data['previous-version'], types.some(types.uint(1)));
    },
});

Clarinet.test({
    name: "File versioning: Can rollback to previous version",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        // Register file and create multiple versions
        let block = chain.mineBlock([
            Tx.contractCall('file-registry', 'register-file', [
                types.utf8("test-file.txt"),
                types.uint(1024),
                types.ascii("abc123hash"),
                types.utf8("https://gaia.example.com/test-file-v1.txt"),
                types.ascii("def456keyhash"),
                types.bool(false)
            ], deployer.address),
        ]);

        let fileId = block.receipts[0].result.expectOk().expectAscii();

        // Upload version 2
        let block2 = chain.mineBlock([
            Tx.contractCall('file-registry', 'upload-new-version', [
                types.ascii(fileId),
                types.uint(2048),
                types.ascii("xyz789hash"),
                types.utf8("https://gaia.example.com/test-file-v2.txt"),
                types.ascii("ghi012keyhash"),
                types.utf8("Version 2 with bugs")
            ], deployer.address)
        ]);

        // Rollback to version 1
        let block3 = chain.mineBlock([
            Tx.contractCall('file-registry', 'rollback-to-version', [
                types.ascii(fileId),
                types.uint(1)
            ], deployer.address)
        ]);

        block3.receipts[0].result.expectOk().expectUint(1);

        // Verify file metadata points to version 1
        let getFileInfo = chain.callReadOnlyFn('file-registry', 'get-file-info', [
            types.ascii(fileId)
        ], deployer.address);

        let fileInfo = getFileInfo.result.expectSome().expectTuple();
        assertEquals(fileInfo['current-version'], types.uint(1));
        assertEquals(fileInfo['total-versions'], types.uint(2)); // Total versions unchanged
        assertEquals(fileInfo['file-hash'], types.ascii("abc123hash")); // Back to v1 hash
    },
});

Clarinet.test({
    name: "File versioning: Only owner can upload new versions",
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

        // Try to upload new version as non-owner (should fail)
        let block2 = chain.mineBlock([
            Tx.contractCall('file-registry', 'upload-new-version', [
                types.ascii(fileId),
                types.uint(2048),
                types.ascii("xyz789hash"),
                types.utf8("https://gaia.example.com/test-file-v2.txt"),
                types.ascii("ghi012keyhash"),
                types.utf8("Unauthorized update")
            ], wallet1.address)
        ]);

        block2.receipts[0].result.expectErr().expectUint(100); // ERR_NOT_AUTHORIZED
    },
});
