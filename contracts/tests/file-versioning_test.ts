import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can create first version of a file",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('file-versioning', 'create-file-version', [
                types.ascii("file123"),
                types.ascii("abc123hash"),
                types.utf8("https://gaia.example.com/file123-v1.txt"),
                types.ascii("def456keyhash"),
                types.uint(1024),
                types.utf8("Initial version")
            ], deployer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        
        let result = block.receipts[0].result.expectOk().expectTuple();
        assertEquals(result['version-number'], types.uint(1));
        assertEquals(result['version-id'], types.ascii("v1"));
    },
});

Clarinet.test({
    name: "Can create multiple versions of the same file",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Create first version
        let block1 = chain.mineBlock([
            Tx.contractCall('file-versioning', 'create-file-version', [
                types.ascii("file123"),
                types.ascii("abc123hash"),
                types.utf8("https://gaia.example.com/file123-v1.txt"),
                types.ascii("def456keyhash"),
                types.uint(1024),
                types.utf8("Initial version")
            ], deployer.address)
        ]);
        
        // Create second version
        let block2 = chain.mineBlock([
            Tx.contractCall('file-versioning', 'create-file-version', [
                types.ascii("file123"),
                types.ascii("xyz789hash"),
                types.utf8("https://gaia.example.com/file123-v2.txt"),
                types.ascii("ghi012keyhash"),
                types.uint(2048),
                types.utf8("Updated content")
            ], deployer.address)
        ]);
        
        assertEquals(block2.receipts.length, 1);
        let result = block2.receipts[0].result.expectOk().expectTuple();
        assertEquals(result['version-number'], types.uint(2));
        assertEquals(result['version-id'], types.ascii("v2"));
    },
});

Clarinet.test({
    name: "Fails with invalid input",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('file-versioning', 'create-file-version', [
                types.ascii(""), // empty file-id
                types.ascii("abc123hash"),
                types.utf8("https://gaia.example.com/file123-v1.txt"),
                types.ascii("def456keyhash"),
                types.uint(1024),
                types.utf8("Initial version")
            ], deployer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectErr().expectUint(303); // ERR_INVALID_INPUT
    },
});

Clarinet.test({
    name: "Fails with zero file size",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('file-versioning', 'create-file-version', [
                types.ascii("file123"),
                types.ascii("abc123hash"),
                types.utf8("https://gaia.example.com/file123-v1.txt"),
                types.ascii("def456keyhash"),
                types.uint(0), // zero file size
                types.utf8("Initial version")
            ], deployer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectErr().expectUint(303); // ERR_INVALID_INPUT
    },
});

Clarinet.test({
    name: "Can get specific version information",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Create test versions
        chain.mineBlock([
            Tx.contractCall('file-versioning', 'create-file-version', [
                types.ascii("testfile"),
                types.ascii("hash1"),
                types.utf8("https://gaia.example.com/testfile-v1.txt"),
                types.ascii("key1"),
                types.uint(1024),
                types.utf8("First version")
            ], deployer.address)
        ]);

        chain.mineBlock([
            Tx.contractCall('file-versioning', 'create-file-version', [
                types.ascii("testfile"),
                types.ascii("hash2"),
                types.utf8("https://gaia.example.com/testfile-v2.txt"),
                types.ascii("key2"),
                types.uint(2048),
                types.utf8("Second version")
            ], deployer.address)
        ]);

        let getVersion = chain.callReadOnlyFn('file-versioning', 'get-file-version', [
            types.ascii("testfile"),
            types.uint(1)
        ], deployer.address);

        let versionData = getVersion.result.expectSome().expectTuple();
        assertEquals(versionData['version-id'], types.ascii("v1"));
        assertEquals(versionData['file-hash'], types.ascii("hash1"));
        assertEquals(versionData['file-size'], types.uint(1024));
        assertEquals(versionData['changes-description'], types.utf8("First version"));
        assertEquals(versionData['is-current'], types.bool(false)); // Second version should be current
    },
});

Clarinet.test({
    name: "Can get current version",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Create test versions
        chain.mineBlock([
            Tx.contractCall('file-versioning', 'create-file-version', [
                types.ascii("testfile"),
                types.ascii("hash1"),
                types.utf8("https://gaia.example.com/testfile-v1.txt"),
                types.ascii("key1"),
                types.uint(1024),
                types.utf8("First version")
            ], deployer.address)
        ]);

        chain.mineBlock([
            Tx.contractCall('file-versioning', 'create-file-version', [
                types.ascii("testfile"),
                types.ascii("hash2"),
                types.utf8("https://gaia.example.com/testfile-v2.txt"),
                types.ascii("key2"),
                types.uint(2048),
                types.utf8("Second version")
            ], deployer.address)
        ]);

        let getCurrentVersion = chain.callReadOnlyFn('file-versioning', 'get-current-version', [
            types.ascii("testfile")
        ], deployer.address);

        let versionData = getCurrentVersion.result.expectSome().expectTuple();
        assertEquals(versionData['version-id'], types.ascii("v2"));
        assertEquals(versionData['file-hash'], types.ascii("hash2"));
        assertEquals(versionData['is-current'], types.bool(true));
    },
});

Clarinet.test({
    name: "Can revert to previous version",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Create test versions
        chain.mineBlock([
            Tx.contractCall('file-versioning', 'create-file-version', [
                types.ascii("revertfile"),
                types.ascii("hash1"),
                types.utf8("https://gaia.example.com/revertfile-v1.txt"),
                types.ascii("key1"),
                types.uint(1024),
                types.utf8("First version")
            ], deployer.address)
        ]);

        chain.mineBlock([
            Tx.contractCall('file-versioning', 'create-file-version', [
                types.ascii("revertfile"),
                types.ascii("hash2"),
                types.utf8("https://gaia.example.com/revertfile-v2.txt"),
                types.ascii("key2"),
                types.uint(2048),
                types.utf8("Second version")
            ], deployer.address)
        ]);

        // Revert to version 1
        let revertBlock = chain.mineBlock([
            Tx.contractCall('file-versioning', 'revert-to-version', [
                types.ascii("revertfile"),
                types.uint(1)
            ], deployer.address)
        ]);

        revertBlock.receipts[0].result.expectOk();

        // Verify current version is now 1
        let getCurrentVersion = chain.callReadOnlyFn('file-versioning', 'get-current-version', [
            types.ascii("revertfile")
        ], deployer.address);
        
        let afterData = getCurrentVersion.result.expectSome().expectTuple();
        assertEquals(afterData['version-id'], types.ascii("v1"));
        assertEquals(afterData['is-current'], types.bool(true));
    },
});
