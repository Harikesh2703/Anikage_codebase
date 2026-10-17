const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const cliProgress = require('cli-progress');
const config = require('../utils/config');
const helpers = require('../utils/helpers');

class Downloader {
  /**
   * Download video
   */
  async download(videoUrl, filename, options = {}) {
    const { subtitle, referer } = options;
    const isMkv = !!subtitle;
    const downloadPath = path.join(config.downloadDir, `${helpers.sanitizeFilename(filename)}.${isMkv ? 'mkv' : 'mp4'}`);
    
    let subtitlePath = null;
    // Download subtitle if provided
    if (subtitle) {
      subtitlePath = await this.downloadSubtitle(subtitle, filename);
    }
    
    // Determine download method based on URL type
    if (videoUrl.includes('m3u8')) {
      return this.downloadM3U8(videoUrl, downloadPath, referer, subtitlePath);
    } else {
      return this.downloadDirect(videoUrl, downloadPath, referer);
    }
  }
  
  /**
   * Download m3u8 stream using yt-dlp or ffmpeg
   */
  async downloadM3U8(url, outputPath, referer, subtitlePath = null) {
    if (subtitlePath) {
      console.log('Subtitle provided, skipping yt-dlp and using ffmpeg for stitching...');
      return this.downloadWithFFmpeg(url, outputPath, referer, subtitlePath);
    }
    
    return new Promise((resolve, reject) => {
      // Try yt-dlp first
      const ytdlp = spawn('yt-dlp', [
        '--referer', referer || '',
        '--no-skip-unavailable-fragments',
        '--fragment-retries', 'infinite',
        '-N', '16',
        '-o', outputPath,
        url
      ]);
      
      let hasError = false;
      
      ytdlp.on('error', (error) => {
        // Fallback to ffmpeg
        console.log('yt-dlp not found, using ffmpeg...');
        this.downloadWithFFmpeg(url, outputPath, referer, subtitlePath)
          .then(resolve)
          .catch(reject);
        hasError = true;
      });
      
      ytdlp.stdout.on('data', (data) => {
        process.stdout.write(data.toString());
      });
      
      ytdlp.stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
      
      ytdlp.on('close', (code) => {
        if (!hasError) {
          if (code === 0) {
            helpers.success(`Downloaded: ${outputPath}`);
            resolve(outputPath);
          } else {
            reject(new Error(`Download failed with code ${code}`));
          }
        }
      });
    });
  }
  
  /**
   * Download with ffmpeg
   */
  async downloadWithFFmpeg(url, outputPath, referer, subtitlePath = null) {
    return new Promise((resolve, reject) => {
      const args = [
        '-loglevel', 'error',
        '-stats',
        '-i', url
      ];
      
      if (subtitlePath) {
        args.push('-i', subtitlePath);
        args.push('-map', '0:v', '-map', '0:a', '-map', '1:s');
        args.push('-c', 'copy', '-c:s', 'srt');
      } else {
        args.push('-c', 'copy');
      }
      
      args.push(outputPath);
      
      if (referer) {
        args.unshift('-referer', referer);
      }
      
      const ffmpeg = spawn('ffmpeg', args);
      
      ffmpeg.stdout.on('data', (data) => {
        process.stdout.write(data.toString());
      });
      
      ffmpeg.stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          helpers.success(`Downloaded: ${outputPath}`);
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });
      
      ffmpeg.on('error', (error) => {
        reject(new Error(`Failed to start ffmpeg: ${error.message}`));
      });
    });
  }
  
  /**
   * Download direct link using aria2c
   */
  async downloadDirect(url, outputPath, referer) {
    return new Promise((resolve, reject) => {
      const outputDir = path.dirname(outputPath);
      const outputFile = path.basename(outputPath);
      
      const args = [
        `--referer=${referer || config.hianimeRefr}`,
        '--enable-rpc=false',
        '--check-certificate=false',
        '--continue',
        '--summary-interval=0',
        '-x', '16',
        '-s', '16',
        url,
        `--dir=${outputDir}`,
        `-o=${outputFile}`,
        '--download-result=hide'
      ];
      
      const aria2c = spawn('aria2c', args);
      
      aria2c.stdout.on('data', (data) => {
        process.stdout.write(data.toString());
      });
      
      aria2c.stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
      
      aria2c.on('close', (code) => {
        if (code === 0) {
          helpers.success(`Downloaded: ${outputPath}`);
          resolve(outputPath);
        } else {
          reject(new Error(`aria2c failed with code ${code}`));
        }
      });
      
      aria2c.on('error', (error) => {
        reject(new Error(`Failed to start aria2c: ${error.message}`));
      });
    });
  }
  
  /**
   * Download subtitle
   */
  async downloadSubtitle(subtitleUrl, filename) {
    const axios = require('axios');
    const subtitlePath = path.join(config.downloadDir, `${helpers.sanitizeFilename(filename)}.vtt`);
    
    try {
      const response = await axios.get(subtitleUrl);
      fs.writeFileSync(subtitlePath, response.data);
      helpers.success(`Subtitle downloaded: ${subtitlePath}`);
      return subtitlePath;
    } catch (error) {
      console.error(`Failed to download subtitle: ${error.message}`);
      return null;
    }
  }
}

module.exports = new Downloader();
