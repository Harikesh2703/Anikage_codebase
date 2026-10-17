import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class AniCliRsPlugin {
  constructor() {
    this.id = 'anikoto';
    this.name = 'Anikoto (Rust Core / ani-cli-rs)';
    this.version = '0.11.0';
    this.referer = 'https://megaplay.buzz/';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
    this.binaryPath = this.getBinaryPath();
    console.log(`[AniCliRsPlugin] Initialized with binary: ${this.binaryPath}`);
  }

  getBinaryPath() {
    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'ani-cli-rs.exe' : 'ani-cli-rs';
    const candidates = [
      path.join(process.cwd(), 'rust-scraper/target/release', binaryName),
      path.join(__dirname, '../../rust-scraper/target/release', binaryName),
      path.join(process.resourcesPath || __dirname, 'app.asar.unpacked/rust-scraper/target/release', binaryName),
      path.join(process.cwd(), 'rust-scraper/target/debug', binaryName),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return binaryName;
  }

  execRust(args) {
    return new Promise((resolve, reject) => {
      execFile(this.binaryPath, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(stderr || error.message));
        }
        try {
          const jsonStart = stdout.indexOf('[');
          const jsonEnd = stdout.lastIndexOf(']') + 1;
          if (jsonStart !== -1 && jsonEnd !== -1) {
            return resolve(JSON.parse(stdout.substring(jsonStart, jsonEnd)));
          }
          const objStart = stdout.indexOf('{');
          const objEnd = stdout.lastIndexOf('}') + 1;
          if (objStart !== -1 && objEnd !== -1) {
            return resolve(JSON.parse(stdout.substring(objStart, objEnd)));
          }
          resolve([]);
        } catch (e) {
          reject(new Error(`Failed to parse ani-cli-rs JSON output: ${e.message}`));
        }
      });
    });
  }

  async searchAnime(query, opts = {}) {
    try {
      const q = (!query || query.trim() === '') ? 'top' : query.trim();
      const args = ['search', '--json', q];
      if (opts.mode === 'dub' || process.env.ANIKAGE_MODE === 'dub') {
        args.push('--mode', 'dub');
      }
      const results = await this.execRust(args);
      return results.map(item => ({
        id: item.id,
        name: item.name,
        thumbnail: item.poster || '',
        banner: item.poster || '',
        description: '',
        score: 0,
        genres: [],
        tags: [],
        type: 'TV',
        episodes: Math.floor(item.episodes) || 0,
        provider: item.provider || 'anikoto'
      }));
    } catch (err) {
      console.error(`[AniCliRsPlugin] Search failed: ${err.message}`);
      return [];
    }
  }

  async getTrending() {
    return this.searchAnime('top');
  }

  async getEpisodesList(showId) {
    try {
      const args = [];
      let targetId = showId;
      if (typeof showId === 'string' && showId.startsWith('anikoto2:')) {
        args.push('-p', 'anikoto2');
        targetId = showId.replace('anikoto2:', '');
      } else if (typeof showId === 'string' && showId.startsWith('anikoto:')) {
        args.push('-p', 'anikoto');
        targetId = showId.replace('anikoto:', '');
      }
      args.push('episodes', '--json', targetId);
      return await this.execRust(args);
    } catch (err) {
      console.error(`[AniCliRsPlugin] Failed to get episodes: ${err.message}`);
      return [];
    }
  }

  async getEpisodeEmbedUrls(showId, episodeString) {
    return {
      sources: {
        'Anikoto (Rust)': `${showId}||${episodeString}`
      },
      fallback: ''
    };
  }

  async generateLinks(sources) {
    const allLinks = [];
    for (const [provider, raw] of Object.entries(sources)) {
      if (!raw || !raw.includes('||')) continue;
      const [showId, episode] = raw.split('||');
      try {
        const args = [];
        let targetId = showId;
        if (typeof showId === 'string' && showId.startsWith('anikoto2:')) {
          args.push('-p', 'anikoto2');
          targetId = showId.replace('anikoto2:', '');
        } else if (typeof showId === 'string' && showId.startsWith('anikoto:')) {
          args.push('-p', 'anikoto');
          targetId = showId.replace('anikoto:', '');
        }
        args.push('links', '--json', targetId, episode);
        if (process.env.ANIKAGE_MODE === 'dub') {
          args.push('--mode', 'dub');
        }
        const links = await this.execRust(args);
        for (const l of links) {
          allLinks.push({
            quality: l.resolution || 'auto',
            url: l.url,
            provider: l.provider || 'Anikoto (Rust)',
            headers: {
              referer: l.headers?.referer || 'https://megaplay.buzz/',
              origin: l.headers?.origin || 'https://megaplay.buzz',
              ...(l.headers?.extra || {})
            },
            subtitles: (l.subtitles || []).map(s => ({
              label: s.label || 'English',
              url: s.url,
              default: s.default || false
            }))
          });
        }
      } catch (err) {
        console.error(`[AniCliRsPlugin] Failed to generate links: ${err.message}`);
      }
    }
    return allLinks;
  }
}

export default new AniCliRsPlugin();

