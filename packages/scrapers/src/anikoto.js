import * as cheerio from 'cheerio';
import CryptoJS from 'crypto-js';

export class AnikotoAPI {
  constructor() {
    this.name = 'Anikoto';
    this.version = '2.1.0';
    this.baseUrl = 'https://anikoto.cz';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
    this.cachedParams = null;
    this.cachedParamsTime = 0;
  }

  execFetch(url, options = {}) {
    const headers = {
      'User-Agent': this.userAgent,
      'Accept': 'text/html,application/json,text/plain,*/*',
      ...(options.headers || {})
    };
    const res = fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body
    });
    const text = (res && typeof res.text === 'function') ? res.text() : (typeof res === 'string' ? res : JSON.stringify(res));
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  }

  searchAnime(query) {
    try {
      const q = (!query || query.trim() === '') ? 'top' : query.trim();
      const url = `${this.baseUrl}/filter?keyword=${encodeURIComponent(q)}`;
      const html = this.execFetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      if (typeof html !== 'string') return [];

      const $ = cheerio.load(html);
      const shows = [];
      const seen = new Set();

      $('a[href*="/watch/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const m = href.match(/\/watch\/([^\/?#]+)/);
        if (!m) return;
        const slug = m[1];
        if (seen.has(slug)) return;
        seen.add(slug);

        const card = $(el).closest('.item, .film-item, .flw-item') || $(el);
        const title = card.find('.name, .d-title, .film-name').text().trim() || slug.replace(/-/g, ' ');
        const poster = card.find('img').attr('src') || card.find('img').attr('data-src') || '';
        const epsText = card.find('.ep-status, .tick-eps, .tick-sub').text().trim();
        const epsCount = parseInt(epsText.replace(/\D/g, ''), 10) || 0;

        shows.push({
          id: `anikoto:${slug}`,
          name: title,
          thumbnail: poster,
          banner: poster,
          type: 'TV',
          episodes: epsCount
        });
      });

      return shows;
    } catch (err) {
      console.error('[Anikoto] searchAnime error:', err.message);
      return [];
    }
  }

  getTrending() {
    return this.searchAnime('top');
  }

  extractSlug(showId) {
    if (!showId) return '';
    let clean = showId;
    if (clean.startsWith('anikoto2:')) clean = clean.substring('anikoto2:'.length);
    if (clean.startsWith('anikoto:')) clean = clean.substring('anikoto:'.length);
    // Base64 JSON slug
    try {
      const parsed = JSON.parse(atob(clean));
      if (parsed.slug) return parsed.slug;
    } catch (e) {}
    // Normal slug e.g. naruto-eybxz
    if (clean.includes(':')) {
      const parts = clean.split(':');
      return parts[parts.length - 1];
    }
    return clean;
  }

  getEpisodesList(showId) {
    try {
      const slug = this.extractSlug(showId);
      if (!slug) return [];

      // 1. Fetch watch page to get show ID
      const watchHtml = this.execFetch(`${this.baseUrl}/watch/${slug}`);
      if (typeof watchHtml !== 'string') return [];
      const $w = cheerio.load(watchHtml);
      const dataId = $w('#watch-main').attr('data-id');
      if (!dataId) return [];

      // 2. Fetch episodes list ajax
      const epData = this.execFetch(`${this.baseUrl}/ajax/episode/list/${dataId}`, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/watch/${slug}`
        }
      });

      const epHtml = epData?.result || epData?.html || (typeof epData === 'string' ? epData : '');
      const $e = cheerio.load(epHtml);
      const episodes = [];

      $e('a[data-num]').each((_, el) => {
        const num = $e(el).attr('data-num');
        if (num && !episodes.includes(num)) {
          episodes.push(num);
        }
      });

      return episodes;
    } catch (err) {
      console.error('[Anikoto] getEpisodesList error:', err.message);
      return [];
    }
  }

  getEpisodeEmbedUrls(showId, episodeString) {
    try {
      const slug = this.extractSlug(showId);
      if (!slug) return { sources: {}, fallback: '' };

      const watchHtml = this.execFetch(`${this.baseUrl}/watch/${slug}`);
      const $w = cheerio.load(watchHtml);
      const dataId = $w('#watch-main').attr('data-id');
      if (!dataId) return { sources: {}, fallback: '' };

      const epData = this.execFetch(`${this.baseUrl}/ajax/episode/list/${dataId}`, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/watch/${slug}`
        }
      });
      const epHtml = epData?.result || epData?.html || '';
      const $e = cheerio.load(epHtml);

      let epToken = '';
      $e('a[data-num]').each((_, el) => {
        const num = $e(el).attr('data-num');
        if (num === String(episodeString) && !epToken) {
          epToken = $e(el).attr('data-ids') || '';
        }
      });

      if (!epToken) return { sources: {}, fallback: '' };

      // Get server list
      const srvData = this.execFetch(`${this.baseUrl}/ajax/server/list?servers=${encodeURIComponent(epToken)}`, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/watch/${slug}`
        }
      });
      const srvHtml = srvData?.result || srvData?.html || '';
      const $s = cheerio.load(srvHtml);

      const sources = {};
      const subItems = $s('.type[data-type="sub"] li, .type[data-type="dub"] li');

      for (let i = 0; i < subItems.length; i++) {
        const el = subItems[i];
        const sName = $s(el).text().trim() || 'Vidstream';
        const type = $s(el).closest('.type').attr('data-type') || 'sub';
        const linkId = $s(el).attr('data-link-id');
        if (!linkId) continue;

        const embedRes = this.execFetch(`${this.baseUrl}/ajax/server?get=${encodeURIComponent(linkId)}`, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': `${this.baseUrl}/watch/${slug}`
          }
        });

        const embedUrl = embedRes?.result?.url || embedRes?.url;
        if (embedUrl) {
          sources[`${sName} (${type.toUpperCase()})`] = embedUrl;
        }
      }

      return { sources, fallback: '' };
    } catch (err) {
      console.error('[Anikoto] getEpisodeEmbedUrls error:', err.message);
      return { sources: {}, fallback: '' };
    }
  }

  getCryptoParams() {
    if (this.cachedParams && (Date.now() - this.cachedParamsTime < 300000)) {
      return this.cachedParams;
    }
    const scriptText = this.execFetch('https://megaplay.buzz/videojs/lib/e1-player.min.js?v=3.19');
    if (typeof scriptText !== 'string') return null;

    const re = /\bconst\s+[\w$]+="((?:\\.|[^"\\])*)",[\w$]+="((?:\\.|[^"\\])*)",[\w$]+="((?:\\.|[^"\\])*)",[\w$]+=(\d+);function\s+[\w$]+\(/g;
    let match;
    while ((match = re.exec(scriptText)) !== null) {
      const end = match.index + match[0].length;
      if (scriptText.substring(end, end + 2500).includes('AES-CBC')) {
        this.cachedParams = {
          key: JSON.parse(`"${match[1]}"`),
          iv: JSON.parse(`"${match[2]}"`),
          secret: JSON.parse(`"${match[3]}"`),
          ttl: parseInt(match[4], 10) || 90
        };
        this.cachedParamsTime = Date.now();
        return this.cachedParams;
      }
    }
    return null;
  }

  getVideoLinks(providerId, providerName) {
    try {
      const embedUrl = providerId;
      if (!embedUrl || !embedUrl.startsWith('http')) return [];

      const embedHtml = this.execFetch(embedUrl, {
        headers: { 'Referer': 'https://anikoto.cz/' }
      });
      if (typeof embedHtml !== 'string') return [];

      const dataIdMatch = embedHtml.match(/data-id=["\x27](\d+)["\x27]/i);
      if (!dataIdMatch) return [];
      const dataId = dataIdMatch[1];

      const sourcesData = this.execFetch(`https://megaplay.buzz/stream/getSources?id=${dataId}`, {
        headers: {
          'Referer': embedUrl,
          'Origin': 'https://megaplay.buzz'
        }
      });

      if (!sourcesData || !sourcesData.enc) return [];

      const params = this.getCryptoParams();
      if (!params) return [];

      const key = CryptoJS.enc.Utf8.parse(params.key.padEnd(32, '\0'));
      const iv = CryptoJS.enc.Utf8.parse(params.iv.padEnd(16, '\0'));
      let b64 = sourcesData.enc.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';

      const decrypted = CryptoJS.AES.decrypt(b64, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      if (!decryptedText) return [];

      const masterObj = JSON.parse(decryptedText);
      const masterUrl = masterObj.file || masterObj.sources?.[0]?.file || '';
      if (!masterUrl) return [];

      // Token signing
      let signedUrl = masterUrl;
      const m = masterUrl.match(/\/([a-f0-9]{32})\/([a-f0-9]{32})\//i);
      if (m && params.secret) {
        const expires = Math.floor(Date.now() / 1000) + params.ttl;
        const message = `${expires}|${m[1].toLowerCase()}/${m[2].toLowerCase()}`;
        const toBase64Url = (wa) => CryptoJS.enc.Base64.stringify(wa).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const sig = toBase64Url(CryptoJS.HmacSHA256(message, params.secret));
        const msgB64 = toBase64Url(CryptoJS.enc.Utf8.parse(message));
        signedUrl = `${masterUrl}?token=${msgB64}.${sig}`;
      }

      const subtitles = (sourcesData.tracks || []).filter(t => t.file).map(t => ({
        url: t.file,
        lang: t.label || 'English',
        label: t.label || 'English',
        isDefault: t.default || false
      }));

      return [{
        quality: '1080p',
        url: signedUrl,
        provider: providerName || 'Vidstream',
        headers: {
          referer: 'https://megaplay.buzz/',
          origin: 'https://megaplay.buzz'
        },
        subtitles
      }];
    } catch (err) {
      console.error('[Anikoto] getVideoLinks error:', err.message);
      return [];
    }
  }

  generateLinks(sources) {
    try {
      let s = sources;
      if (typeof s === 'string') {
        try { s = JSON.parse(s); } catch (e) {}
      }
      const entries = Object.entries(s || {});
      if (entries.length === 0) return [];
      const [providerName, embedUrl] = entries[0];
      return this.getVideoLinks(embedUrl, providerName);
    } catch (e) {
      console.error('[Anikoto] generateLinks error:', e.message);
      return [];
    }
  }
}

globalThis.activePlugin = new AnikotoAPI();
