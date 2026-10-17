import fs from 'fs';
import path from 'path';

globalThis.window = globalThis;
globalThis.document = { createElement: () => ({}) };
globalThis.activePlugin = null;

const scriptPath = path.resolve('dist/hianime.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');
eval(scriptCode);

const plugin = globalThis.activePlugin;

async function run() {
    console.log("Searching Re:Zero...");
    const shows = await plugin.searchAnime('Re:Zero - Starting Life in Another World Season 3');
    const showId = shows[0].id;
    console.log("ID:", showId);
    
    const episodes = await plugin.getEpisodesList(showId);
    console.log("Episodes:", episodes.slice(0,3));
    
    const embedRes = await plugin.getEpisodeEmbedUrls(showId, "3");
    console.log("Embed Res:", embedRes);
    
    const links = await plugin.generateLinks(embedRes.sources);
    console.log("Links:", JSON.stringify(links, null, 2));
}

run();
