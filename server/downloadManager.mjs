import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { EventEmitter } from 'events';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';

// Prefer system ffmpeg if available to avoid glibc static build issues, otherwise fallback to ffmpeg-static
let ffmpegBinary = ffmpegStatic;
try {
  const sysFfmpeg = execSync('which ffmpeg', { encoding: 'utf8' }).trim();
  if (sysFfmpeg && fs.existsSync(sysFfmpeg)) {
    ffmpegBinary = sysFfmpeg;
  }
} catch (e) {}

ffmpeg.setFfmpegPath(ffmpegBinary);
console.log(`[DownloadManager] Using ffmpeg binary: ${ffmpegBinary}`);

class DownloadManager extends EventEmitter {
  constructor() {
    super();
    this.downloads = new Map();
    this.failedDownloads = new Map();
    this.downloadsDir = path.join(process.cwd(), 'downloads'); // Default to a downloads folder in the app root
    
    // Ensure downloads directory exists
    if (!fs.existsSync(this.downloadsDir)) {
      fs.mkdirSync(this.downloadsDir, { recursive: true });
    }
  }

  async downloadSubtitle(url, filepath, headers = {}) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      
      const cleanHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'Accept': '*/*'
      };
      if (headers && typeof headers === 'object') {
        for (const [k, v] of Object.entries(headers)) {
          if (typeof v === 'string') {
            const cleanKey = k.replace(/[^\x20-\x7E]/g, '').trim();
            const cleanVal = v.replace(/[^\x20-\x7E]/g, '').trim();
            if (cleanKey && cleanVal) {
              cleanHeaders[cleanKey] = cleanVal;
            }
          }
        }
      }
      
      const options = {
        headers: cleanHeaders
      };
      
      client.get(url, options, (res) => {
        if (res.statusCode !== 200 && res.statusCode !== 206) {
          return reject(new Error(`Failed to download subtitle: ${res.statusCode}`));
        }
        const file = fs.createWriteStream(filepath);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    });
  }

  /**
   * Starts a new download process.
   * @param {string} id - Unique identifier for the download.
   * @param {string} videoUrl - The HLS .m3u8 stream URL.
   * @param {string} subtitleUrl - The .vtt subtitle URL (optional).
   * @param {string} title - The title of the anime/episode to name the file.
   * @param {object} headers - Headers for the request (e.g., referer).
   */
  async startDownload(id, videoUrl, subtitleUrl, title, headers = {}) {
    if (this.downloads.has(id)) {
      throw new Error(`Download with ID ${id} is already in progress.`);
    }

    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const outputPath = path.join(this.downloadsDir, `${safeTitle}.mp4`);
    const subtitlePath = path.join(this.downloadsDir, `${safeTitle}.vtt`);
    // Unwrap proxied video URL if it was routed through local /api/proxy
    let realVideoUrl = videoUrl;
    let effectiveHeaders = { ...(headers || {}) };
    if (videoUrl.includes('/api/proxy')) {
      try {
        const u = new URL(videoUrl, 'http://127.0.0.1:3001');
        const target = u.searchParams.get('url');
        const ref = u.searchParams.get('referer');
        if (target) realVideoUrl = target;
        if (ref && !effectiveHeaders.referer) effectiveHeaders.referer = ref;
      } catch (e) {}
    }

    if (subtitleUrl) {
      let realSubUrl = subtitleUrl;
      if (subtitleUrl.includes('/api/proxy')) {
        try {
          const u = new URL(subtitleUrl, 'http://127.0.0.1:3001');
          const target = u.searchParams.get('url');
          if (target) realSubUrl = target;
        } catch (e) {}
      }
      try {
        await this.downloadSubtitle(realSubUrl, subtitlePath, effectiveHeaders);
      } catch (e) {
        console.error(`Failed to download subtitle: ${e.message}`);
      }
    }

    let command = ffmpeg();

    // Input the video stream directly
    command = command.input(realVideoUrl);

    // Sanitize and format headers strictly as ASCII to prevent ffmpeg SIGSEGV
    const headerLines = [];
    let hasUa = false;

    if (effectiveHeaders && typeof effectiveHeaders === 'object') {
      for (const [rawKey, rawVal] of Object.entries(effectiveHeaders)) {
        if (!rawVal || typeof rawVal !== 'string') continue;
        const cleanKey = rawKey.replace(/[^\x20-\x7E]/g, '').trim();
        const cleanVal = rawVal.replace(/[^\x20-\x7E]/g, '').trim();

        if (cleanKey.toLowerCase() === 'user-agent') {
          hasUa = true;
        }
        // Validate referer is an actual URL
        if (cleanKey.toLowerCase() === 'referer' && !cleanVal.startsWith('http')) {
          continue;
        }

        if (cleanKey && cleanVal) {
          headerLines.push(`${cleanKey}: ${cleanVal}`);
        }
      }
    }

    if (!hasUa) {
      headerLines.push('User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36');
    }

    if (headerLines.length > 0) {
      command = command.inputOptions(['-headers', `${headerLines.join('\r\n')}\r\n`]);
    }

    command = command.outputOptions([
      '-c copy', // Just copy video and audio
      '-movflags +faststart' // Move the moov atom to the beginning so players can start instantly
    ]);

    // Set output format and path
    command = command.output(outputPath);

    // Event listeners
    command.on('start', (commandLine) => {
      console.log(`[DownloadManager] Started download ${id}: ${title}`);
      this.emit('progress', { id, status: 'downloading', progress: 0 });
    });

    command.on('progress', (progress) => {
      let percent = progress.percent != null && !isNaN(progress.percent)
        ? Math.max(0, Math.min(100, progress.percent))
        : null;

      // HLS playlists often don't have container duration in ffmpeg, calculate from timemark
      if (percent == null && progress.timemark) {
        const parts = progress.timemark.split(':');
        if (parts.length === 3) {
          const hours = parseFloat(parts[0]) || 0;
          const mins = parseFloat(parts[1]) || 0;
          const secs = parseFloat(parts[2]) || 0;
          const currentSeconds = hours * 3600 + mins * 60 + secs;
          // Standard anime episode duration is 24 mins (1440 seconds)
          const estimatedTotal = 24 * 60;
          percent = Math.min(99, Math.round((currentSeconds / estimatedTotal) * 100));
        }
      }

      const download = this.downloads.get(id);
      if (download) {
        download.progress = percent;
        download.timemark = progress.timemark;
      }
      this.emit('progress', { id, status: 'downloading', progress: percent, timemark: progress.timemark });
    });

    command.on('end', () => {
      console.log(`[DownloadManager] Download complete ${id}`);
      this.downloads.delete(id);
      this.emit('completed', { id, status: 'completed', path: outputPath });
    });

    command.on('error', (err, stdout, stderr) => {
      const detailedError = stderr ? `${err.message}\n${stderr.trim().split('\n').slice(-5).join('\n')}` : err.message;
      console.error(`[DownloadManager] Error downloading ${id}:`, detailedError);
      this.downloads.delete(id);
      this.failedDownloads.set(id, {
        id,
        title,
        status: 'error',
        error: detailedError,
        timestamp: new Date()
      });
      this.emit('error', { id, status: 'error', error: detailedError, title });
    });

    // Start the process
    command.run();

    // Store the command in case we need to kill it later
    this.downloads.set(id, {
      command,
      title,
      outputPath,
      status: 'downloading'
    });
  }

  cancelDownload(id) {
    const download = this.downloads.get(id);
    if (download) {
      console.log(`[DownloadManager] Canceling download ${id}`);
      download.command.kill('SIGKILL');
      this.downloads.delete(id);
      
      // Cleanup partial file
      if (fs.existsSync(download.outputPath)) {
        try { fs.unlinkSync(download.outputPath); } catch (e) { }
      }
      
      this.emit('canceled', { id, status: 'canceled' });
      return true;
    }
    return false;
  }
  
  getDownloads() {
    const activePaths = new Set();
    const active = Array.from(this.downloads.entries()).map(([id, data]) => {
      if (data.outputPath) activePaths.add(data.outputPath);
      return {
        id,
        title: data.title,
        status: data.status,
        outputPath: data.outputPath,
        progress: data.progress,
        timemark: data.timemark
      };
    });
    
    // Scan completed downloads
    const completed = [];
    if (fs.existsSync(this.downloadsDir)) {
      const files = fs.readdirSync(this.downloadsDir);
      for (const file of files) {
        if (file.endsWith('.mp4')) {
          const outputPath = path.join(this.downloadsDir, file);
          if (activePaths.has(outputPath)) continue;

          const vttFile = file.replace('.mp4', '.vtt');
          const hasSub = fs.existsSync(path.join(this.downloadsDir, vttFile));
          
          completed.push({
            id: file,
            title: file.replace('.mp4', '').replace(/_+/g, ' '),
            status: 'completed',
            outputPath: outputPath,
            subtitlePath: hasSub ? path.join(this.downloadsDir, vttFile) : null
          });
        }
      }
    }
    
    // Collect recent failed downloads (keep last 10)
    const failed = Array.from(this.failedDownloads.values()).slice(-10);

    return { active, completed, failed };
  }

  clearFailedDownload(id) {
    this.failedDownloads.delete(id);
    return true;
  }

  deleteDownload(id) {
    try {
      const targetFile = id.endsWith('.mp4') ? id : `${id}.mp4`;
      const videoPath = path.join(this.downloadsDir, targetFile);
      const subPath = path.join(this.downloadsDir, targetFile.replace('.mp4', '.vtt'));

      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
      if (fs.existsSync(subPath)) {
        fs.unlinkSync(subPath);
      }
      return true;
    } catch (err) {
      console.error(`[DownloadManager] Error deleting download ${id}:`, err.message);
      return false;
    }
  }
}

// Export a singleton instance
export const downloadManager = new DownloadManager();
