import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import os from 'os';
import { db_helper } from './db.mjs';

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id) {
  if (id.startsWith('../utils/') && this.filename && (this.filename.includes('patches') || this.filename.includes('allanime.js'))) {
    const bundleSrcPath = process.env.NODE_PATH ? join(process.env.NODE_PATH, '../src') : join(__dirname, '../src');
    const resolvedPath = join(bundleSrcPath, 'utils', id.replace(/^\.\.\/utils\//, ''));
    return originalRequire.call(this, resolvedPath);
  }
  return originalRequire.apply(this, arguments);
};

const app = express();
const PORT = process.env.PORT || 3001;

// CORS middleware - allow local origins, loopback and direct requests
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    try {
      const parsed = new URL(origin);
      if (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.protocol === 'app:' ||
        parsed.protocol === 'file:'
      ) {
        return callback(null, true);
      }
    } catch (e) {}
    callback(null, false);
  }
}));
app.use(express.json());

// Health check

app.get('/api/ping', async (req, res) => {
  const fs = await import('fs');
  if (req.query.msg) fs.appendFileSync('telemetry.log', req.query.msg + '\n');
  res.json({ status: 'ok' });
});

import pluginManager from './pluginManager.mjs';
import { enrichAnimeList, getCatalogAnime, getAnimeTitleById } from './metadata.mjs';

function getApi() {
  return pluginManager.getActivePlugin();
}

/**
 * Probe video metadata for resolution
 */
async function probeMetadata(url) {
  // Check cache first
  try {
    const cached = await db_helper.getMetadata(url);
    if (cached) return cached;
  } catch (e) {
    console.error('Cache read error:', e.message);
  }

  return new Promise((resolve) => {
    // ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0
    // We add a 2s timeout to prevent hanging
    const timeout = setTimeout(() => {
      resolve('unknown');
    }, 2000);

    execFile('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', url], (error, stdout) => {
      clearTimeout(timeout);
      if (error || !stdout.trim()) {
        resolve('unknown');
      } else {
        const [width, height] = stdout.trim().split(',').map(n => parseInt(n));
        let res = 'unknown';
        if (height >= 1080) res = '1080p';
        else if (height >= 720) res = '720p';
        else if (height >= 480) res = '480p';
        else if (height >= 360) res = '360p';
        else if (height > 0) res = height + 'p';

        // Save to cache
        db_helper.saveMetadata(url, res).catch(e => console.error('Cache write error:', e.message));
        resolve(res);
      }
    });
  });
}

// GET /api/stream-local
app.get('/api/stream-local', (req, res) => {
  const videoPath = req.query.path;
  if (!videoPath || !fs.existsSync(videoPath)) {
    return res.status(404).send('File not found');
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  console.log(`[StreamLocal] Request for ${videoPath}, Range: ${range}`);

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    let start = 0;
    let end = fileSize - 1;
    
    if (parts[0] === "") {
      start = fileSize - parseInt(parts[1], 10);
    } else {
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    }
    
    if (start >= fileSize || end >= fileSize) {
      console.log(`[StreamLocal] 416 Range Not Satisfiable: ${start}-${end}`);
      res.status(416).send('Requested range not satisfiable\n'+start+'-'+end);
      return;
    }

    const chunksize = (end - start) + 1;
    console.log(`[StreamLocal] 206 Partial Content: ${start}-${end} (Chunk: ${chunksize})`);
    
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length'
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    console.log(`[StreamLocal] 200 OK (Full File: ${fileSize})`);
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Length'
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

// GET /api/plugins
app.get('/api/plugins', (req, res) => {
  res.json(pluginManager.getAllPlugins());
});

// POST /api/plugins/active
app.post('/api/plugins/active', express.json(), (req, res) => {
  try {
    const { id } = req.body;
    pluginManager.setActivePlugin(id);
    res.json({ success: true, activePlugin: id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/download
app.post('/api/download', express.json(), async (req, res) => {
  try {
    const { url, filename, referer, subtitle } = req.body;
    if (!url || !filename) {
      return res.status(400).json({ error: "Missing url or filename" });
    }
    
    // Fire and forget download
    const downloader = require('../src/download/downloader.js');
    downloader.download(url, filename, { referer, subtitle }).catch(err => {
      console.error("[Downloader Error]:", err.message);
    });
    
    res.json({ success: true, message: "Download started in background" });
  } catch(err) {
    console.error('/api/download error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trending?limit=20&genre=Shounen
app.get('/api/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const genre = req.query.genre || null;

    // 1. First, attempt to fetch high-quality catalog data from AniList
    try {
      const catalogResults = await getCatalogAnime({
        perPage: limit,
        genre: genre || undefined,
        sort: 'TRENDING_DESC'
      });
      if (catalogResults && catalogResults.length > 0) {
        return res.json(catalogResults.slice(0, limit));
      }
    } catch (catalogErr) {
      console.warn('[Catalog] AniList fetch failed, falling back to active scraper:', catalogErr.message);
    }

    // 2. Fallback to active scraper plugin
    let api = getApi();
    let results = [];
    try {
       if (typeof api.getTrending === 'function') {
           results = await api.getTrending();
       } else {
           results = await api.searchAnime('', { sortBy: 'Trending', limit });
       }
       if (results.length === 0 && pluginManager.activePluginId === 'hianime') throw new Error("No results");
    } catch (err) {
       console.error("Primary plugin trending failed, attempting fallback:", err.message);
       if (pluginManager.activePluginId === 'hianime') {
          try {
            api = pluginManager.setActivePlugin('anikoto').instance;
            results = await api.searchAnime('top', { sortBy: 'Trending', limit });
          } catch(fallbackErr) {
             console.error("Fallback plugin also failed:", fallbackErr.message);
          }
       }
    }
    const mapped = results.map(r => ({
      id: r.id.includes(':') ? r.id : `${pluginManager.activePluginId}:${r.id}`,
      title: r.name,
      coverImage: r.thumbnail || '',
      banner: r.banner || r.thumbnail || '',
      tags: r.genres || [],
      synopsis: r.description || '',
      score: r.score || 0,
      type: r.type || 'TV',
      episodes: r.episodes || null,
      provider: r.provider || pluginManager.activePluginId
    }));
    const filtered = genre
      ? mapped.filter(a => a.tags.some(t => t.toLowerCase().includes(genre.toLowerCase())))
      : mapped;
    res.json(filtered);
  } catch (err) {
    console.error('/api/trending error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/search?q=naruto
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) return res.json([]);
    let api = getApi();
    let results = [];
    try {
       results = await api.searchAnime(q);
       if (results.length === 0 && pluginManager.activePluginId === 'hianime') throw new Error("No results");
    } catch (err) {
       console.error("Primary plugin search failed, attempting fallback:", err.message);
       if (pluginManager.activePluginId === 'hianime') {
          try {
            api = pluginManager.setActivePlugin('anikoto').instance;
            results = await api.searchAnime(q);
          } catch(fallbackErr) {
             console.error("Fallback plugin also failed:", fallbackErr.message);
          }
       }
    }
    res.json(results.map(r => ({
      id: r.id.includes(':') ? r.id : `${pluginManager.activePluginId}:${r.id}`,
      title: r.name,
      coverImage: r.thumbnail || '',
      tags: r.genres || [],
      episodes: r.episodes || null,
      score: r.score || 0,
      provider: r.provider || pluginManager.activePluginId
    })));
  } catch (err) {
    console.error('/api/search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Resilient multi-provider episode resolver
 */
async function resolveAnimeEpisodes(showId, titleHint = '') {
  let title = titleHint;
  let targetPluginId = null;
  let actualShowId = showId;

  if (showId.startsWith('anilist:')) {
    const anilistId = showId.replace('anilist:', '');
    const meta = await getAnimeTitleById(anilistId);
    if (meta) {
      title = meta.english || meta.romaji || meta.preferred || title;
    }
  } else if (showId.startsWith('anikoto:') || showId.startsWith('anikoto2:')) {
    targetPluginId = 'anikoto';
    actualShowId = showId;
    try {
      const b64 = showId.replace(/^anikoto2?:/, '');
      const parsed = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      if (parsed.title) title = parsed.title;
    } catch (e) {}
  } else if (showId.startsWith('hianime:')) {
    targetPluginId = 'hianime';
    actualShowId = showId.substring('hianime:'.length);
    const derived = actualShowId.replace(/-\d+$/, '').replace(/-/g, ' ');
    title = title || derived;
  } else if (/^[a-zA-Z0-9_-]+-\d+$/.test(showId)) {
    targetPluginId = 'hianime';
    actualShowId = showId;
    const derived = actualShowId.replace(/-\d+$/, '').replace(/-/g, ' ');
    title = title || derived;
  } else if (showId.includes(':')) {
    const parts = showId.split(':');
    targetPluginId = parts[0];
    actualShowId = parts.slice(1).join(':');
  }

  // Candidate providers to try
  const providersToTry = [];
  if (targetPluginId && pluginManager.plugins.has(targetPluginId)) {
    providersToTry.push(targetPluginId);
  }
  if (pluginManager.activePluginId && !providersToTry.includes(pluginManager.activePluginId)) {
    providersToTry.push(pluginManager.activePluginId);
  }
  for (const [pId] of pluginManager.plugins) {
    if (pId !== 'anikoto2' && !providersToTry.includes(pId)) {
      providersToTry.push(pId);
    }
  }

  // 1. Direct attempt on target provider
  if (targetPluginId && pluginManager.plugins.has(targetPluginId)) {
    const p = pluginManager.plugins.get(targetPluginId);
    try {
      const eps = await p.instance.getEpisodesList(actualShowId);
      if (eps && eps.length > 0) {
        console.log(`[Episodes] Direct ${targetPluginId} returned ${eps.length} episodes for ${actualShowId}`);
        return { episodes: eps, provider: targetPluginId, showId: actualShowId, title };
      }
    } catch (e) {
      console.warn(`[Episodes] Direct ${targetPluginId} failed for ${actualShowId}: ${e.message}`);
    }
  }

  // 2. Search across providers by title
  if (title) {
    const titlesToTry = [title];
    const baseTitle = title.replace(/\s+(?:season|\bpart)\s*\d+/gi, '').replace(/\s+\d+(?:st|nd|rd|th)\s+season/gi, '').trim();
    if (baseTitle && baseTitle.toLowerCase() !== title.toLowerCase()) {
      titlesToTry.push(baseTitle);
    }

    for (const searchTitle of titlesToTry) {
      for (const pId of providersToTry) {
        const p = pluginManager.plugins.get(pId);
        if (!p) continue;
        try {
          console.log(`[Episodes] Searching provider ${pId} for "${searchTitle}"`);
          const searchResults = await p.instance.searchAnime(searchTitle);
          if (searchResults && searchResults.length > 0) {
            const match = searchResults[0];
            const eps = await p.instance.getEpisodesList(match.id);
            if (eps && eps.length > 0) {
              console.log(`[Episodes] Provider ${pId} returned ${eps.length} episodes for "${searchTitle}" (ID: ${match.id})`);
              return { episodes: eps, provider: pId, showId: match.id, title: searchTitle };
            }
          }
        } catch (err) {
          console.warn(`[Episodes] Search on ${pId} for "${searchTitle}" failed: ${err.message}`);
        }
      }
    }
  }

  // 3. Fallback attempt on active provider directly
  try {
    const activeP = getApi();
    const eps = await activeP.getEpisodesList(actualShowId);
    if (eps && eps.length > 0) {
      return { episodes: eps, provider: pluginManager.activePluginId, showId: actualShowId, title };
    }
  } catch (e) {}

  return null;
}

/**
 * Resilient multi-provider stream source resolver
 */
async function resolveStreamSources(showId, episode, titleHint = '') {
  let title = titleHint;
  let targetPluginId = null;
  let actualShowId = showId;

  if (showId.startsWith('anilist:')) {
    const anilistId = showId.replace('anilist:', '');
    const meta = await getAnimeTitleById(anilistId);
    if (meta) {
      title = meta.english || meta.romaji || meta.preferred || title;
    }
  } else if (showId.startsWith('anikoto:') || showId.startsWith('anikoto2:')) {
    targetPluginId = 'anikoto';
    actualShowId = showId;
    try {
      const b64 = showId.replace(/^anikoto2?:/, '');
      const parsed = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      if (parsed.title) title = parsed.title;
    } catch (e) {}
  } else if (showId.startsWith('hianime:')) {
    targetPluginId = 'hianime';
    actualShowId = showId.substring('hianime:'.length);
    const derived = actualShowId.replace(/-\d+$/, '').replace(/-/g, ' ');
    title = title || derived;
  } else if (/^[a-zA-Z0-9_-]+-\d+$/.test(showId)) {
    targetPluginId = 'hianime';
    actualShowId = showId;
    const derived = actualShowId.replace(/-\d+$/, '').replace(/-/g, ' ');
    title = title || derived;
  } else if (showId.includes(':')) {
    const parts = showId.split(':');
    targetPluginId = parts[0];
    actualShowId = parts.slice(1).join(':');
  }

  const providersToTry = [];
  if (targetPluginId && pluginManager.plugins.has(targetPluginId)) {
    providersToTry.push(targetPluginId);
  }
  if (pluginManager.activePluginId && !providersToTry.includes(pluginManager.activePluginId)) {
    providersToTry.push(pluginManager.activePluginId);
  }
  for (const [pId] of pluginManager.plugins) {
    if (pId !== 'anikoto2' && !providersToTry.includes(pId)) {
      providersToTry.push(pId);
    }
  }

  // 1. Direct attempt on target provider
  if (targetPluginId && pluginManager.plugins.has(targetPluginId)) {
    const p = pluginManager.plugins.get(targetPluginId);
    const cacheKey = `${targetPluginId}:${actualShowId}:${episode}`;
    try {
      const cached = await db_helper.getLinksFromCache(cacheKey);
      if (cached) {
        if (cached.referer) p.instance.referer = cached.referer;
        console.log(`[CACHE HIT] Serving sources for ${cacheKey} from SQLite cache`);
        return { links: cached.sources || cached, fallback: cached.fallback || '', provider: targetPluginId };
      }
    } catch (e) {}

    try {
      console.log(`[STREAM] Fetching direct ${targetPluginId} embed URLs for ${actualShowId} ep ${episode}`);
      const { sources, fallback } = await p.instance.getEpisodeEmbedUrls(actualShowId, episode);
      const links = await p.instance.generateLinks(sources);
      if (links && links.length > 0) {
        return { links, fallback, provider: targetPluginId, cacheKey };
      }
    } catch (err) {
      console.warn(`[STREAM] Direct ${targetPluginId} failed for ${actualShowId}: ${err.message}`);
    }
  }

  // 2. Search fallback providers if direct failed or was catalog ID
  if (title) {
    const titlesToTry = [title];
    const baseTitle = title.replace(/\s+(?:season|\bpart)\s*\d+/gi, '').replace(/\s+\d+(?:st|nd|rd|th)\s+season/gi, '').trim();
    if (baseTitle && baseTitle.toLowerCase() !== title.toLowerCase()) {
      titlesToTry.push(baseTitle);
    }

    for (const searchTitle of titlesToTry) {
      for (const pId of providersToTry) {
        if (pId === targetPluginId) continue;
        const p = pluginManager.plugins.get(pId);
        if (!p) continue;

        try {
          console.log(`[STREAM] Fallback searching ${pId} for "${searchTitle}"`);
          const found = await p.instance.searchAnime(searchTitle);
          if (found && found.length > 0) {
            const match = found[0];
            const matchedId = match.id.includes(':')
              ? match.id.split(':').slice(1).join(':')
              : match.id;
            const cacheKey = `${pId}:${matchedId}:${episode}`;
            try {
              const cached = await db_helper.getLinksFromCache(cacheKey);
              if (cached) {
                if (cached.referer) p.instance.referer = cached.referer;
                return { links: cached.sources || cached, fallback: cached.fallback || '', provider: pId };
              }
            } catch (e) {}

            const { sources, fallback } = await p.instance.getEpisodeEmbedUrls(match.id, episode);
            const links = await p.instance.generateLinks(sources);
            if (links && links.length > 0) {
              return { links, fallback, provider: pId, cacheKey };
            }
          }
        } catch (err) {
          console.warn(`[STREAM] Fallback on ${pId} for "${searchTitle}" failed: ${err.message}`);
        }
      }
    }
  }

  return null;
}

// GET /api/episodes/:showId
app.get('/api/episodes/:showId', async (req, res) => {
  try {
    const showId = req.params.showId;
    const titleHint = req.query.title || '';
    const result = await resolveAnimeEpisodes(showId, titleHint);
    if (!result || !result.episodes || result.episodes.length === 0) {
      return res.status(404).json({ error: `No episodes found for this anime on any active provider.` });
    }
    res.json(result.episodes);
  } catch (err) {
    console.error('/api/episodes error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history
app.get('/api/history', async (req, res) => {
  try {
    const history = await db_helper.getRecentHistory(15);
    
    // Deduplicate by title to prevent showing the same anime multiple times from different plugins
    const uniqueHistory = [];
    const titles = new Set();
    for (const item of history) {
      if (!titles.has(item.title)) {
        uniqueHistory.push(item);
        titles.add(item.title);
      }
    }
    
    res.json(uniqueHistory);
  } catch (err) {
    console.error('/api/history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/history
app.post('/api/history', async (req, res) => {
  try {
    const { id, title, coverImage, episode, tags, provider } = req.body;
    if (!id || !title) return res.status(400).json({ error: 'ID and Title required' });
    const effectiveProvider = provider || (id.includes(':') ? id.split(':')[0] : pluginManager.activePluginId);
    await db_helper.saveProgress(id, title, coverImage, episode, tags, effectiveProvider);
    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/history
app.delete('/api/history', async (req, res) => {
  try {
    await db_helper.clearHistory();
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sources/:showId/:episode
app.get('/api/sources/:showId/:episode', async (req, res) => {
  try {
    const { showId, episode } = req.params;
    const titleHint = req.query.title || '';
    const result = await resolveStreamSources(showId, episode, titleHint);

    if (!result || !result.links || result.links.length === 0) {
      return res.status(404).json({ error: `No playable stream links found for episode ${episode}.` });
    }

    const rawLinks = Array.isArray(result.links) ? result.links : (result.links.sources || []);
    const uniqueLinks = [];
    const seenUrls = new Set();
    const linksToProbe = [];

    for (const link of rawLinks) {
      if (seenUrls.has(link.url)) continue;
      seenUrls.add(link.url);
      uniqueLinks.push(link);
      
      if (link.quality === 'unknown' || link.quality === 'hls' || !link.quality) {
        linksToProbe.push(link);
      }
    }

    // Probe resolution in parallel (max 2s wait total)
    await Promise.all(linksToProbe.map(async (link) => {
      try {
        const detected = await probeMetadata(link.url);
        if (detected !== 'unknown') {
          link.quality = detected;
        }
      } catch (e) {}
    }));

    // Sort links by quality (descending)
    const sortedLinks = uniqueLinks.sort((a, b) => {
      const qA = parseInt(a.quality) || 0;
      const qB = parseInt(b.quality) || 0;
      return qB - qA;
    });

    const responsePayload = sortedLinks.length === 0
      ? { 
          sources: [{ url: result.fallback || '', quality: 'browser', provider: 'Fallback' }],
          fallback: result.fallback || '',
          referer: result.referer || 'https://megaplay.buzz/'
        }
      : { 
          sources: sortedLinks,
          fallback: result.fallback || '',
          referer: result.referer || 'https://megaplay.buzz/'
        };

    // Save to cache in the background
    if (result.cacheKey) {
      db_helper.saveLinksToCache(result.cacheKey, responsePayload)
        .then(() => console.log(`[CACHE] Saved links for ${result.cacheKey}`))
        .catch(cacheErr => console.error('[CACHE ERROR] Write failed:', cacheErr.message));
    }

    res.json(responsePayload);
  } catch (err) {
    console.error('/api/sources error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Global agents for proxy to reuse connections (fixes slow loading)
const httpsAgent = new (require('https').Agent)({ keepAlive: true, maxSockets: 50 });
const httpAgent = new (require('http').Agent)({ keepAlive: true, maxSockets: 50 });

// Proxy endpoint to bypass CORS and Referer restrictions
app.get('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('URL required');

  const https = require('https');
  const http = require('http');
  const { URL } = require('url');

  const proxyRequest = (url, depth = 0) => {
    if (depth > 5) {
      if (!res.headersSent) res.status(502).send('Too many redirects');
      return;
    }

    try {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      const agent = parsedUrl.protocol === 'https:' ? httpsAgent : httpAgent;
      const api = getApi();
      const customReferer = req.query.referer || api.referer;

      const headers = {
        'User-Agent': api.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': customReferer || new URL(url).origin + '/',
        'Origin': customReferer ? new URL(customReferer).origin : new URL(url).origin,
        'Accept': '*/*'
      };
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const options = {
        agent,
        headers,
        rejectUnauthorized: false
      };

      protocol.get(url, options, (proxyRes) => {
        // Handle Redirects
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
          let nextUrl = proxyRes.headers.location;
          if (!nextUrl.startsWith('http')) {
            nextUrl = new URL(nextUrl, url).href;
          }
          return proxyRequest(nextUrl, depth + 1);
        }

        // Setup response headers
        res.status(proxyRes.statusCode || 200);
        
        // Essential CORS for Range requests
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
        // Copy safe headers from proxy
        const omitHeaders = ['access-control-allow-origin', 'access-control-expose-headers', 'connection', 'host', 'transfer-encoding', 'origin'];
        for (const [key, value] of Object.entries(proxyRes.headers)) {
          if (!omitHeaders.includes(key.toLowerCase())) {
            res.setHeader(key, value);
          }
        }
        const contentType = proxyRes.headers['content-type'] || '';
        
        // Force VTT content-type if the url ends with .vtt to satisfy browser strict MIME checking
        if (url.includes('.vtt')) {
          res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        }
        
        const isM3u8 = url.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('apple.mpegurl');

        if (isM3u8) {
          let body = '';
          proxyRes.on('data', chunk => body += chunk);
          proxyRes.on('end', () => {
            const refererQuery = req.query.referer ? `&referer=${encodeURIComponent(req.query.referer)}` : '';
            const lines = body.split('\n');
            const rewritten = lines.map(line => {
              let trimmed = line.trim();
              
              if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('http')) {
                const absoluteUrl = new URL(trimmed, url).href;
                return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}${refererQuery}`;
              } else if (trimmed.startsWith('http')) {
                return `/api/proxy?url=${encodeURIComponent(trimmed)}${refererQuery}`;
              }
              
              if (trimmed.includes('URI="')) {
                return trimmed.replace(/URI="([^"]+)"/, (match, p1) => {
                  if (!p1.startsWith('http')) p1 = new URL(p1, url).href;
                  return `URI="/api/proxy?url=${encodeURIComponent(p1)}${refererQuery}"`;
                });
              }
              
              return line;
            }).join('\n');
            
            res.setHeader('Content-Length', Buffer.byteLength(rewritten));
            res.end(rewritten);
          });
        } else {
          // Pipe directly (The Fix for 'Memory Overhead')
          proxyRes.pipe(res);
        }

        proxyRes.on('error', (err) => {
          console.error(`Proxy stream error for [${url}]:`, err.message);
          res.end();
        });
      }).on('error', (err) => {
        console.error(`Proxy request error for [${url}]:`, err.message);
        if (!res.headersSent) res.status(500).send(err.message);
      });
    } catch (err) {
      console.error(`Proxy setup error for [${url}]:`, err.message);
      if (!res.headersSent) res.status(500).send(err.message);
    }
  };

  proxyRequest(targetUrl);
});

// Redirect to best stream (used for direct browser opening)
app.get('/api/watch/:showId/:episode', async (req, res) => {
  try {
    const api = getApi();
    const { showId, episode } = req.params;
    console.log(`[WATCH] Redirect request for ${showId} ep ${episode}`);
    
    const { sources, fallback } = await api.getEpisodeEmbedUrls(showId, episode);
    const links = await api.generateLinks(sources);
    const best = api.selectQuality(links, 'best');
    
    const targetUrl = best ? best.url : fallback;
    console.log(`[WATCH] Redirecting to: ${targetUrl.substring(0, 50)}...`);
    res.redirect(targetUrl);
  } catch (err) {
    res.status(500).send('Error launching stream. Check terminal.');
  }
});

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\x1b[32m✓\x1b[0m Anikage API server running at http://127.0.0.1:${PORT}`);
});

setInterval(() => {
  console.log('Event loop still alive');
}, 5000);
