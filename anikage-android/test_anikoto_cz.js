const fs = require('fs');
if (typeof fetch === 'undefined') { global.fetch = require('node-fetch'); }

class AnikotoCzAPI {
    constructor() {
        this.apiUrl = "https://anikoto.cz";
        this.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
    }
    async execFetch(url, options = {}) {
        const headers = {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/json,text/plain,*/*',
            'X-Requested-With': 'XMLHttpRequest',
            ...options.headers
        };
        const response = await fetch(url, { headers });
        const text = await response.text();
        try { return JSON.parse(text); } catch (e) { return text; }
    }
}

async function runTest() {
    const plugin = new AnikotoCzAPI();
    const token = "MTF1dkFtaW9BRTZPbzJJRElFZUZrOWdjeldjOERLaWNMMXFNbVB3WUJqOVlaQnMva015OG9FbncrWGpqR0RkY1dZN3FrdVdIdEQ5eFZWQXdWZDB2MmxZUTNNVXZhSjVUNWEzZE1xRXhLLzd4R252bGFOMG9qdjZob3BHNjE4bEMxbmRUVnV2a3FWWDdsb1Q5Uk5pUFVMY0U5MkZBKzZ2OGQvNkFGSGt5OE9jPQ";
    
    const embedRes = await plugin.execFetch(`${plugin.apiUrl}/ajax/server?get=${token}`);
    console.log("Embed Res:", embedRes);
}
runTest();
