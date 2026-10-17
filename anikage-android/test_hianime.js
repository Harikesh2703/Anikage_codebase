const fs = require('fs');

if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

const pluginSrc = fs.readFileSync('app/src/main/assets/plugins/hianime.js', 'utf8');

// Evaluate the plugin
eval(pluginSrc);

async function runTest() {
    console.log("Setting up HiAnime plugin...");
    const plugin = setupPlugin();
    
    // Override execFetch for Node.js testing since fetch is async in Node but sync in QuickJS
    plugin.execFetch = async function(url, options = {}) {
        const headers = {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            ...options.headers
        };
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: headers
        });
        return await response.text();
    };

    console.log("Testing getTrending()...");
    try {
        const url = `${plugin.apiUrl}/home`;
        const html = await plugin.execFetch(url);
        console.log("HTML length:", html.length);
        
        // Let's manually run the regex logic
        const shows = [];
        const itemRegex = /<div class="flw-item[^>]*>[\s\S]*?<img.*?data-src="([^"]+)".*?alt="([^"]+)".*?<a href="([^"]+)".*?class="dynamic-name"/g;
        let match;
        let count = 0;
        
        while ((match = itemRegex.exec(html)) !== null && count < 15) {
            shows.push(match[2]);
            count++;
        }
        console.log("Found trending names via regex:", shows);
    } catch (e) {
        console.error("Failed getTrending():", e);
    }
}
runTest();
