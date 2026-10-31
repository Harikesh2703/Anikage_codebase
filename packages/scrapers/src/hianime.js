import * as cheerio from 'cheerio';
import CryptoJS from 'crypto-js';

class HiAnimeAPI {
    constructor() {
        this.apiUrl = "https://hianime.at";
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    }

    async execFetch(url, options = {}) {
        const headers = {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/json,text/plain,*/*',
            ...(options.headers || {})
        };
        const res = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body
        });
        const text = (res && typeof res.text === 'function') ? await res.text() : (typeof res === 'string' ? res : JSON.stringify(res));
        try {
            return JSON.parse(text);
        } catch (e) {
            return text;
        }
    }

    async searchAnime(query) {
        try {
            let q = (query || '').trim();
            let shows = await this._searchRaw(q);
            if (shows.length === 0 && (q.toLowerCase().includes('season') || q.toLowerCase().includes('part'))) {
                const cleaned = q.replace(/\s+(?:season|\bpart)\s*\d+/gi, '').replace(/\s+\d+(?:st|nd|rd|th)\s+season/gi, '').trim();
                if (cleaned && cleaned !== q) {
                    console.log(`[HiAnime] Retrying search with base title: "${cleaned}"`);
                    shows = await this._searchRaw(cleaned);
                }
            }
            return shows;
        } catch (e) {
            console.error("HiAnime searchAnime failed:", e.message);
            return [];
        }
    }

    async _searchRaw(query) {
        const html = await this.execFetch(`${this.apiUrl}/search?keyword=${encodeURIComponent(query)}`);
        if (typeof html !== 'string') return [];
        const $ = cheerio.load(html);
        const shows = [];
        
        $('div.flw-item').each((_, el) => {
            const href = $(el).find('a.dynamic-name').attr('href') || "";
            const id = href.split('?')[0].split('/').filter(Boolean).pop() || "";
            shows.push({
                id: id,
                name: $(el).find('a.dynamic-name').text().trim(),
                thumbnail: $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || "",
                banner: $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || "",
                type: "TV",
                episodes: 0
            });
        });
        
        return shows;
    }

    async getTrending() {
        try {
            const html = await this.execFetch(`${this.apiUrl}/home`);
            if (typeof html !== 'string') return [];
            const $ = cheerio.load(html);
            const shows = [];
            
            $('#trending-home div.swiper-slide').each((_, el) => {
                if (shows.length >= 15) return;
                const href = $(el).find('a').attr('href') || "";
                const id = href.split('?')[0].split('/').filter(Boolean).pop() || "";
                shows.push({
                    id: id,
                    name: $(el).find('.film-title').text().trim(),
                    thumbnail: $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || "",
                    banner: $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || "",
                    type: "TV"
                });
            });
            return shows;
        } catch (e) {
            console.error("HiAnime getTrending failed:", e.message);
            return [];
        }
    }

    async getEpisodesList(showId) {
        try {
            const showIdNumeric = showId.split('-').pop();
            const data = await this.execFetch(`${this.apiUrl}/api/theme/episode/list/${showIdNumeric}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const html = data?.html || (typeof data === 'string' ? data : '');
            const $ = cheerio.load(html);
            const episodes = [];
            
            $('.ssl-item.ep-item').each((_, el) => {
                episodes.push($(el).attr('data-number'));
            });
            
            return episodes.sort((a, b) => parseFloat(a) - parseFloat(b));
        } catch (e) {
            console.error("HiAnime getEpisodesList failed:", e.message);
            return [];
        }
    }

    async getEpisodeEmbedUrls(showId, episodeString) {
        try {
            const showIdNumeric = showId.split('-').pop();
            const epListData = await this.execFetch(`${this.apiUrl}/api/theme/episode/list/${showIdNumeric}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const $ep = cheerio.load(epListData?.html || "");
            const epId = $ep(`.ssl-item.ep-item[data-number="${episodeString}"]`).attr('data-id');
            
            if (!epId) return { sources: {}, fallback: '' };

            const serverData = await this.execFetch(`${this.apiUrl}/api/theme/episode/servers?episodeId=${epId}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const $server = cheerio.load(serverData?.html || "");
            const sources = {};
            $server('.server-item').each((_, el) => {
                const type = $server(el).attr('data-type');
                if (type === 'sub' || type === 'dub') {
                    const baseName = $server(el).attr('data-server-name') || 'Unknown';
                    const serverName = `${baseName} (${type === 'dub' ? 'Dub' : 'Sub'})`;
                    const h = $server(el).attr('data-hash');
                    if (h) {
                        let embedUrl = "";
                        try {
                            embedUrl = atob(h);
                        } catch(e) {
                            embedUrl = h;
                        }
                        sources[serverName] = embedUrl;
                    }
                }
            });
            
            return {
                sources: sources,
                fallback: `${this.apiUrl}/watch/${showId}?ep=${episodeString}`
            };
        } catch (e) {
            console.error("HiAnime getEpisodeEmbedUrls failed:", e.message);
            return { sources: {}, fallback: '' };
        }
    }

    async getVideoLinks(embedUrl, provider) {
        if (!embedUrl) return [];
        return await this.generateLinks({ [provider || 'HiAnime']: embedUrl });
    }

    async generateLinks(sources) {
        let s = sources;
        if (typeof s === 'string') {
            try { s = JSON.parse(s); } catch (e) {}
        }
        let links = [];
        for (const [provider, url] of Object.entries(s || {})) {
            try {
                let refererUrl = url.startsWith('//') ? 'https:' + url : url;
                if (refererUrl.includes('.m3u8') || refererUrl.includes('.mp4')) {
                    links.push({
                        quality: 'auto',
                        url: refererUrl,
                        provider: provider,
                        subtitles: []
                    });
                    continue;
                }

                const embedHtml = await this.execFetch(refererUrl);
                if (typeof embedHtml === 'string') {
                    const match = embedHtml.match(/window\.__P="([^"]*)"/);
                    if (match) {
                        const blobB64 = match[1];
                        const key = "otaku-embed-v1";
                        const decoded = atob(blobB64);
                        let decrypted = "";
                        for (let i = 0; i < decoded.length; i++) {
                            decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
                        }
                        
                        const json = JSON.parse(decrypted);
                        const masterUrl = (json.src.match(/.*\.m3u8/) && json.src.match(/.*\.m3u8/)[0]) || json.src;
                        
                        let subLinks = [];
                        if (json.subtitles) {
                           for (const sub of json.subtitles) {
                               if (sub.src) {
                                   subLinks.push({ url: sub.src, lang: sub.label || "English", label: sub.label || "English" });
                               }
                           }
                        }
                        
                        links.push({
                            quality: 'auto',
                            url: masterUrl,
                            provider: provider,
                            headers: { referer: refererUrl },
                            subtitles: subLinks
                        });
                        continue;
                    }

                    const m3u8Match = embedHtml.match(/(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/);
                    if (m3u8Match) {
                        links.push({
                            quality: 'auto',
                            url: m3u8Match[1],
                            provider: provider,
                            headers: { referer: refererUrl },
                            subtitles: []
                        });
                        continue;
                    }
                }

                // If not directly decryptable, return the embed URL for iframe/WebView player (matching Desktop)
                links.push({
                    quality: 'auto',
                    url: refererUrl,
                    provider: provider,
                    subtitles: []
                });
            } catch (e) {
                console.error("Failed to decrypt link for", provider, url, e.message);
                links.push({
                    quality: 'auto',
                    url: url.startsWith('//') ? 'https:' + url : url,
                    provider: provider,
                    subtitles: []
                });
            }
        }
        return links;
    }
}

globalThis.activePlugin = new HiAnimeAPI();
