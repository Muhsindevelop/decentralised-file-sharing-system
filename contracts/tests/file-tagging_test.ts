import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can add tag to file",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('file-tagging', 'add-file-tag', [
                types.ascii("file123"),
                types.utf8("document"),
                types.utf8("general")
            ], deployer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "Can check if file has tag",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Add tag
        chain.mineBlock([
            Tx.contractCall('file-tagging', 'add-file-tag', [
                types.ascii("file123"),
                types.utf8("document"),
                types.utf8("general")
            ], deployer.address)
        ]);
        
        // Check if file has tag
        let hasTag = chain.callReadOnlyFn('file-tagging', 'file-has-tag', [
            types.ascii("file123"),
            types.utf8("document")
        ], deployer.address);
        
        assertEquals(hasTag.result, types.bool(true));
    },
});

Clarinet.test({
    name: "Can get file tags",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Add tag
        chain.mineBlock([
            Tx.contractCall('file-tagging', 'add-file-tag', [
                types.ascii("file123"),
                types.utf8("document"),
                types.utf8("general")
            ], deployer.address)
        ]);
        
        // Get file tags
        let fileTags = chain.callReadOnlyFn('file-tagging', 'get-file-tags', [
            types.ascii("file123")
        ], deployer.address);
        
        let tagData = fileTags.result.expectSome().expectTuple();
        assertEquals(tagData['tag-count'], types.uint(1));
    },
});

Clarinet.test({
    name: "Can remove tag from file",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Add tag
        chain.mineBlock([
            Tx.contractCall('file-tagging', 'add-file-tag', [
                types.ascii("file123"),
                types.utf8("document"),
                types.utf8("general")
            ], deployer.address)
        ]);
        
        // Remove tag
        let removeBlock = chain.mineBlock([
            Tx.contractCall('file-tagging', 'remove-file-tag', [
                types.ascii("file123"),
                types.utf8("document")
            ], deployer.address)
        ]);
        
        removeBlock.receipts[0].result.expectOk().expectBool(true);
        
        // Check if tag is removed
        let hasTag = chain.callReadOnlyFn('file-tagging', 'file-has-tag', [
            types.ascii("file123"),
            types.utf8("document")
        ], deployer.address);
        
        assertEquals(hasTag.result, types.bool(false));
    },
});

Clarinet.test({
    name: "Can create tag category",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('file-tagging', 'create-tag-category', [
                types.utf8("media"),
                types.utf8("Files related to media content")
            ], deployer.address)
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        
        // Check category info
        let categoryInfo = chain.callReadOnlyFn('file-tagging', 'get-category-info', [
            types.utf8("media")
        ], deployer.address);
        
        let categoryData = categoryInfo.result.expectSome().expectTuple();
        assertEquals(categoryData['description'], types.utf8("Files related to media content"));
    },
});

Clarinet.test({
    name: "Cannot add duplicate tag to same file",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Add tag first time
        chain.mineBlock([
            Tx.contractCall('file-tagging', 'add-file-tag', [
                types.ascii("file123"),
                types.utf8("document"),
                types.utf8("general")
            ], deployer.address)
        ]);
        
        // Try to add same tag again
        let block = chain.mineBlock([
            Tx.contractCall('file-tagging', 'add-file-tag', [
                types.ascii("file123"),
                types.utf8("document"),
                types.utf8("general")
            ], deployer.address)
        ]);
        
        block.receipts[0].result.expectErr().expectUint(503); // ERR_TAG_ALREADY_EXISTS
    },
});

Clarinet.test({
    name: "Can get tag statistics",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Add tag to create statistics
        chain.mineBlock([
            Tx.contractCall('file-tagging', 'add-file-tag', [
                types.ascii("file123"),
                types.utf8("document"),
                types.utf8("general")
            ], deployer.address)
        ]);
        
        // Get tag stats
        let tagStats = chain.callReadOnlyFn('file-tagging', 'get-tag-stats', [
            types.utf8("document")
        ], deployer.address);
        
        let statsData = tagStats.result.expectSome().expectTuple();
        assertEquals(statsData['usage-count'], types.uint(1));
    },
});

Clarinet.test({
    name: "Can search files by tag",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Add tag
        chain.mineBlock([
            Tx.contractCall('file-tagging', 'add-file-tag', [
                types.ascii("file123"),
                types.utf8("document"),
                types.utf8("general")
            ], deployer.address)
        ]);
        
        // Search for files with tag
        let searchResult = chain.callReadOnlyFn('file-tagging', 'search-files-by-tag', [
            types.utf8("document"),
            types.ascii("file123")
        ], deployer.address);
        
        assertEquals(searchResult.result, types.bool(true));
    },
});

Clarinet.test({
    name: "Can check multiple tags on file",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Add first tag
        chain.mineBlock([
            Tx.contractCall('file-tagging', 'add-file-tag', [
                types.ascii("file123"),
                types.utf8("document"),
                types.utf8("general")
            ], deployer.address)
        ]);
        
        // Add second tag
        chain.mineBlock([
            Tx.contractCall('file-tagging', 'add-file-tag', [
                types.ascii("file123"),
                types.utf8("important"),
                types.utf8("priority")
            ], deployer.address)
        ]);
        
        // Check if file has both tags
        let hasMultipleTags = chain.callReadOnlyFn('file-tagging', 'has-multiple-tags', [
            types.ascii("file123"),
            types.utf8("document"),
            types.utf8("important")
        ], deployer.address);
        
        assertEquals(hasMultipleTags.result, types.bool(true));
    },
});

Clarinet.test({
    name: "Validates tag input",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Try to add empty tag
        let block = chain.mineBlock([
            Tx.contractCall('file-tagging', 'add-file-tag', [
                types.ascii("file123"),
                types.utf8(""), // empty tag
                types.utf8("general")
            ], deployer.address)
        ]);
        
        block.receipts[0].result.expectErr().expectUint(504); // ERR_INVALID_INPUT
    },
});

Clarinet.test({
    name: "Can bulk add tags",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('file-tagging', 'bulk-add-tags', [
                types.ascii("file123"),
                types.list([types.utf8("tag1"), types.utf8("tag2"), types.utf8("tag3")]),
                types.utf8("general")
            ], deployer.address)
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
    },
});
