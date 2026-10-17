const fs = require('fs');

// Polyfill fetch for Node.js
if (typeof fetch === 'undefined') {
    global.fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
}

// Load the plugin source
const pluginSrc = fs.readFileSync('app/src/main/assets/plugins/anikoto.js', 'utf8');

// Evaluate the plugin
eval(pluginSrc);

async function runTest() {
    console.log("Setting up plugin...");
    const plugin = setupPlugin();
    
    console.log("Testing getTrending()...");
    try {
        const trending = await plugin.getTrending();
        console.log(`Success! Found ${trending.length} trending items.`);
        if (trending.length > 0) {
            console.log("Sample item:", JSON.stringify(trending[0], null, 2));
        }
    } catch (e) {
        console.error("Failed getTrending():", e);
    }
    
    console.log("\nTesting searchAnime('Naruto')...");
    try {
        const search = await plugin.searchAnime("Naruto");
        console.log(`Success! Found ${search.length} search results.`);
        if (search.length > 0) {
            console.log("Sample item:", JSON.stringify(search[0], null, 2));
        }
    } catch (e) {
        console.error("Failed searchAnime():", e);
    }
}

runTest();
