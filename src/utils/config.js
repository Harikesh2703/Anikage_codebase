const os = require('os');
const path = require('path');
const fs = require('fs');

class Config {
  constructor() {
    this.version = '1.0.0';
    this.agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';
    this.hianimeBase = 'hianime.at';
    
    // Environment variables
    this.mode = process.env.ANIKAGE_MODE || 'sub';
    this.downloadDir = process.env.ANIKAGE_DOWNLOAD_DIR || '.';
    this.logEpisode = process.env.ANIKAGE_LOG_EPISODE !== '0';
    this.quality = process.env.ANIKAGE_QUALITY || 'best';
    this.skipIntro = process.env.ANIKAGE_SKIP_INTRO === '1';
    this.noDetach = process.env.ANIKAGE_NO_DETACH === '1';
    this.skipTitle = process.env.ANIKAGE_SKIP_TITLE || '';
    
    // History directory
    const stateHome = process.env.USER_DATA_PATH || process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state');
    this.histDir = process.env.ANIKAGE_HIST_DIR || path.join(stateHome, 'anikage');
    this.histFile = path.join(this.histDir, 'anikage-hsts');
    
    // Ensure history directory exists
    this.ensureHistoryDir();
    
    // Player function based on platform
    this.playerFunction = this.getDefaultPlayer();
  }
  
  ensureHistoryDir() {
    try {
      if (!fs.existsSync(this.histDir)) {
        fs.mkdirSync(this.histDir, { recursive: true });
      }
      if (!fs.existsSync(this.histFile)) {
        fs.writeFileSync(this.histFile, '');
      }
    } catch (e) {
      console.error('[Config] Failed to create history dir:', e.message);
    }
  }
  
  getDefaultPlayer() {
    if (process.env.ANIKAGE_PLAYER) {
      return process.env.ANIKAGE_PLAYER;
    }
    
    const platform = os.platform();
    
    switch (platform) {
      case 'darwin':
        return 'iina';
      case 'win32':
        return 'mpv.exe';
      case 'linux':
        return 'mpv';
      default:
        return 'mpv';
    }
  }
}

module.exports = new Config();
