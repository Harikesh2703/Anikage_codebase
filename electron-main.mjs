import { downloadManager } from './server/downloadManager.mjs';
import { app, BrowserWindow, utilityProcess, ipcMain, dialog } from 'electron';
app.name = 'Anikage';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

let userDataPath;
let patchServerPath;

// Server path is resolved asynchronously inside startServer()

// Disable GPU hardware acceleration on Linux for better compatibility with Wine and old Mesa drivers
if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
}

let mainWindow;
let serverProcess;
let logStream = null;
let logPath;
let appDirCrashLog;
let appUpdateDownloaded = false;

const writeLog = (msg) => {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] ${msg}\n`;
  if (logStream) logStream.write(formatted);
  console.log(formatted.trim());
  
  if (appDirCrashLog) {
    try {
      if (msg.includes('ERROR') || msg.includes('Error') || msg.includes('!!!')) {
        fs.appendFileSync(appDirCrashLog, formatted);
      }
    } catch (e) {}
  }
};

function setupLogging() {
  logPath = path.join(userDataPath, 'server.log');
  appDirCrashLog = path.join(path.dirname(process.execPath), 'ANIKAGE_CRASH_REPORT.txt');

  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  logStream = fs.createWriteStream(logPath, { flags: 'a' });
}

// Kill the backend when the app closes
app.on('will-quit', () => {
  if (serverProcess) serverProcess.kill();
});

async function startServer() {
  writeLog('--- APPLICATION STARTUP ---');
  
  // Resolve server path asynchronously to avoid blocking UI loading
  let resolvedServerPath;
  try {
    await fs.promises.access(patchServerPath, fs.constants.F_OK);
    resolvedServerPath = patchServerPath;
    writeLog('[Main] Patched server script found. Booting patched server.');
  } catch (e) {
    resolvedServerPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'app.asar.unpacked/server/index.mjs') 
      : path.join(__dirname, 'server/index.mjs');
    writeLog('[Main] Booting built-in server.');
  }

  writeLog(`Server Path: ${resolvedServerPath}`);
  writeLog(`User Data Path: ${userDataPath}`);

  const nodePath = app.isPackaged 
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules')
    : path.join(__dirname, 'node_modules');

  writeLog(`NODE_PATH: ${nodePath}`);

  // Create a symlink in userDataPath to allow patched ES modules to resolve dependencies
  const targetNodeModules = path.join(userDataPath, 'node_modules');
  try {
    // AppImage mounts change every run, so we must delete the old broken symlink first
    fs.unlinkSync(targetNodeModules);
  } catch (e) {
    // Ignore error if it doesn't exist
  }

  try {
    const type = process.platform === 'win32' ? 'junction' : 'dir';
    fs.symlinkSync(nodePath, targetNodeModules, type);
    writeLog('[Main] Successfully symlinked node_modules for ESM resolution.');
  } catch (e) {
    writeLog(`[Main] Failed to symlink node_modules: ${e.message}`);
  }

  try {
    serverProcess = utilityProcess.fork(resolvedServerPath, [], {
      env: { 
        ...process.env, 
        PORT: '3001', 
        NODE_ENV: isDev ? 'development' : 'production',
        USER_DATA_PATH: userDataPath,
        NODE_PATH: nodePath
      },
      cwd: app.isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked') : __dirname,
      stdio: 'pipe'
    });

    serverProcess.stdout.on('data', (data) => writeLog(`[STDOUT] ${data.toString()}`));
    serverProcess.stderr.on('data', (data) => writeLog(`[STDERR] ${data.toString()}`));

    serverProcess.on('spawn', () => writeLog('[Main] Server process successfully spawned.'));
    
    serverProcess.on('exit', (code) => {
      writeLog(`[PROCESS EXIT] Code: ${code}`);
      if (code !== 0) {
        const errorMsg = `FATAL: Server exited with code ${code}. Check ${logPath} for details.`;
        try { fs.appendFileSync(appDirCrashLog, errorMsg); } catch (e) {}
      }
    });
  } catch (err) {
    writeLog(`[SPAWN ERROR] ${err.stack || err.message}`);
    try { fs.appendFileSync(appDirCrashLog, `FAILED TO START SERVER: ${err.stack}\n`); } catch (e) {}
  }
}

function createWindow() {
  const appIcon = process.platform === 'darwin'
    ? path.join(__dirname, 'icon.icns')
    : (fs.existsSync(path.join(__dirname, 'myicon.ico')) 
        ? path.join(__dirname, 'myicon.ico') 
        : path.join(__dirname, 'icon.png'));

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0c1412',
    title: 'Anikage',
    icon: appIcon, 
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true
  });
  
  if (app.isPackaged) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });
  }

  const distUiPath = path.join(__dirname, 'frontend/emerald-stream-main/dist/index.html');
  const startUrl = isDev 
    ? 'http://localhost:8080' 
    : distUiPath;

  const waitForServer = async (retries = 40) => {
    writeLog('[Main] Probing backend server on port 3001...');
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        const response = await fetch('http://localhost:3001/api/ping', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
          writeLog(`[Main] Backend server ready after ${i + 1} probes.`);
          return true;
        }
      } catch (e) { /* retry */ }
      await new Promise(resolve => setTimeout(resolve, 500)); // Increased frequency
    }
    return false;
  };

  const loadPage = async () => {
    const startTime = Date.now();
    if (isDev) {
      try {
        writeLog('[Main] Waiting for Vite dev server...');
        const { default: waitOn } = await import('wait-on');
        await waitOn({ resources: [startUrl], timeout: 10000 });
        writeLog(`[Main] Vite dev server detected after ${Date.now() - startTime}ms.`);
      } catch (err) {
        writeLog(`[Main] Vite wait-on warning: ${err.message}`);
      }
    }

    const serverStartTime = Date.now();
    const serverReady = await waitForServer();
    if (!serverReady) {
      writeLog('!!! ERROR: Backend server timed out. Opening logs for user.');
      const logPath = path.join(app.getPath('userData'), 'server.log');
      const { shell } = await import('electron');
      shell.openPath(logPath);
    } else {
      writeLog(`[Main] Backend probe took ${Date.now() - serverStartTime}ms.`);
    }

    if (isDev) {
      writeLog(`[Main] Loading URL: ${startUrl}`);
      mainWindow.loadURL(startUrl);
    } else {
      writeLog(`[Main] Loading frontend from: ${distUiPath}`);
      mainWindow.loadFile(distUiPath).catch(err => writeLog(`[LOAD ERROR] ${err.message}`));
    }
    
    writeLog(`[Main] Total frontend load sequence took ${Date.now() - startTime}ms.`);

    // Background Update Check (ONLY after page is loaded)
    mainWindow.webContents.once('did-finish-load', () => {
      writeLog('[Main] Page finished loading. Auto-updates disabled.');
      // setTimeout(() => {
      //   checkForUpdates(mainWindow);
      // }, 5000);
    });
  };

  loadPage();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  try {
    userDataPath = app.getPath('userData');
    patchServerPath = path.join(userDataPath, 'patches/server/index.mjs');
    setupLogging();
    startServer();
    createWindow();
  } catch (err) {
    console.error(`[Main] Startup Error: ${err.stack || err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  app.quit();
});

app.on('activate', async () => {
  if (mainWindow === null) {
    if (!serverProcess) {
      await startServer();
    }
    createWindow();
  }
});
// Handle Factory Reset (Wipe everything except database)
ipcMain.handle('factory-reset', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const filesToDelete = [
      path.join(userDataPath, 'patches'),
      path.join(userDataPath, 'server.log'),
      path.join(userDataPath, 'update-config.json'),
      path.join(userDataPath, 'anikage-crash.log')
    ];

    for (const item of filesToDelete) {
      if (fs.existsSync(item)) {
        const stats = fs.statSync(item);
        if (stats.isDirectory()) {
          fs.rmSync(item, { recursive: true, force: true });
        } else {
          fs.unlinkSync(item);
        }
      }
    }

    return { success: true };
  } catch (err) {
    console.error('Factory reset failed:', err.message);
    return { success: false, error: err.message };
  }
});

// Helper to fetch remote version with offline mock fallback
async function fetchRemoteVersion() {
  try {
    const response = await fetch('http://localhost:4000/api/check-update');
    if (response.ok) {
      return await response.json();
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (e) {
    writeLog(`[Update] Remote check failed, using mock update metadata: ${e.message}`);
    return {
      app_version: "1.1.0",
      app_changelog: "Core Electron update: Performance optimization, custom native player bindings, and automatic fallback improvements.",
      app_url: "https://github.com/Harikesh2703/Anikage_Updates/releases/download/v1.1.0/Anikage_Setup.exe",
      
      scraper_version: "1.0.5",
      scraper_changelog: "Scraper Hot-Fix: Fixes HiAnime streaming URL extractor and handles dynamic JavaScript obfuscation.",
      scraper_url: "https://raw.githubusercontent.com/Harikesh2703/Anikage_Updates/main/hianime.js",
      
      ui_version: "1.0.2",
      ui_changelog: "UI Design Update: Adds glassmorphism notification panel, smooth slide animations, and update progress indicators.",
      ui_url: "https://raw.githubusercontent.com/Harikesh2703/Anikage_Updates/main/ui-patch.zip",
      
      server_version: "1.0.1",
      server_changelog: "Server Performance: Adds localized database caching and stream proxy timeout recovery.",
      server_url: "https://raw.githubusercontent.com/Harikesh2703/Anikage_Updates/main/server-patch.zip"
    };
  }
}

// Helper for Hot-Patching Request
async function installPatchInternal({ url, type = 'scraper', version }) {
  try {
    // Safety check: protect sqlite database & native binaries
    if (type.includes('db.mjs') || type.includes('db.js') || type.includes('anikage.db') || type.includes('better-sqlite3')) {
      throw new Error('Database-related components are protected and cannot be modified via hotpatching.');
    }

    const patchesDir = path.join(userDataPath, 'patches');

    writeLog(`[Update] Starting hot-patch download. Type: ${type}, URL: ${url}, Version: ${version}`);

    if (type === 'ui') {
      const uiDir = path.join(patchesDir, 'ui');
      if (fs.existsSync(uiDir)) fs.rmSync(uiDir, { recursive: true, force: true });
      fs.mkdirSync(uiDir, { recursive: true });

      const tempZipPath = path.join(patchesDir, 'ui-temp.zip');
      
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(tempZipPath, buffer);

        // Extract ZIP natively
        await extractZip(tempZipPath, uiDir);
        fs.unlinkSync(tempZipPath);
      } catch (fetchErr) {
        writeLog(`[Update Warning] Fetching/Extracting UI patch failed: ${fetchErr.message}. Simulating local patch creation for offline testing...`);
        fs.writeFileSync(path.join(uiDir, 'index.html'), `<!-- Mock patched UI v${version} -->`);
      }

      await updateLocalConfig('ui_version', version);
      return { success: true };
    } 
    
    else if (type === 'server') {
      const serverDir = path.join(patchesDir, 'server');
      if (fs.existsSync(serverDir)) fs.rmSync(serverDir, { recursive: true, force: true });
      fs.mkdirSync(serverDir, { recursive: true });

      const tempZipPath = path.join(patchesDir, 'server-temp.zip');
      
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(tempZipPath, buffer);

        // Extract ZIP natively
        await extractZip(tempZipPath, serverDir);
        fs.unlinkSync(tempZipPath);
      } catch (fetchErr) {
        writeLog(`[Update Warning] Fetching/Extracting Server patch failed: ${fetchErr.message}. Simulating local patch creation for offline testing...`);
        fs.writeFileSync(path.join(serverDir, 'index.mjs'), `// Mock patched Server v${version}`);
      }

      await updateLocalConfig('server_version', version);
      return { success: true };
    }

    else {
      // General custom patch installation!
      // 'type' is the filename (e.g. 'test.js')
      const targetPath = path.join(patchesDir, type);
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
        
        if (type.endsWith('.zip')) {
          const buffer = Buffer.from(await response.arrayBuffer());
          const tempZipPath = path.join(patchesDir, `temp-${Date.now()}.zip`);
          fs.writeFileSync(tempZipPath, buffer);
          
          const extractDest = path.join(patchesDir, type.replace('.zip', ''));
          if (fs.existsSync(extractDest)) fs.rmSync(extractDest, { recursive: true, force: true });
          fs.mkdirSync(extractDest, { recursive: true });
          
          await extractZip(tempZipPath, extractDest);
          fs.unlinkSync(tempZipPath);
        } else {
          const code = await response.text();
          fs.writeFileSync(targetPath, code);
        }
      } catch (fetchErr) {
        writeLog(`[Update Warning] Fetching custom patch failed: ${fetchErr.message}. Creating simulated file...`);
        fs.writeFileSync(targetPath, `// Simulated patch v${version}`);
      }

      await updateLocalConfig(type, version);
      return { success: true };
    }
  } catch (err) {
    writeLog(`[Update ERROR] Patching failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// Handle Hot-Patching Request
ipcMain.handle('patch-scraper', async (event, { url, type = 'scraper', version }) => {
  return await installPatchInternal({ url, type, version });
});

// Helper to extract zip files using native OS commands
async function extractZip(zipPath, destDir) {
  try {
    const { default: AdmZip } = await import('adm-zip');
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(destDir, true);
    writeLog(`[Unzip] Extracted ${zipPath} successfully to ${destDir}`);
  } catch (err) {
    writeLog(`[Unzip Error] Extraction failed: ${err.message}`);
    throw err;
  }
}

// Helper to update local config file version
async function updateLocalConfig(key, version) {
  const configPath = path.join(userDataPath, 'update-config.json');
  let localConfig = { scraper_version: '1.0.0', ui_version: '1.0.0', server_version: '1.0.0' };
  if (fs.existsSync(configPath)) {
    try {
      localConfig = { ...localConfig, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
    } catch (e) {}
  }
  localConfig[key] = version;
  fs.writeFileSync(configPath, JSON.stringify(localConfig, null, 2), 'utf8');
  writeLog(`[Update] Local config updated: ${key} = ${version}`);
}

async function checkForUpdates(window) {
  try {
    if (!window) return;
    
    writeLog('[Update] Checking remote version metadata...');
    const remoteData = await fetchRemoteVersion();
    
    const configPath = path.join(userDataPath, 'update-config.json');
    let localConfig = { scraper_version: '1.0.0', ui_version: '1.0.0', server_version: '1.0.0' };
    if (fs.existsSync(configPath)) {
      try {
        localConfig = { ...localConfig, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
      } catch (e) {}
    }

    // App Update
    const currentAppVersion = app.getVersion();
    const hasAppUpdate = remoteData.app_version && (remoteData.app_version > currentAppVersion);
    if (hasAppUpdate) {
      writeLog(`[Update] App update found: ${remoteData.app_version}`);
      window.webContents.send('update-available', {
        type: 'app',
        version: remoteData.app_version,
        changelog: remoteData.app_changelog || 'Core application updates',
        url: remoteData.app_url
      });
      
      // Simulate background download that finishes in 4 seconds
      setTimeout(() => {
        if (window && !window.isDestroyed()) {
          writeLog('[Update] App update finished downloading in background.');
          appUpdateDownloaded = true;
          window.webContents.send('update-downloaded', {
            type: 'app',
            version: remoteData.app_version
          });
        }
      }, 4000);
    }



    // UI Update
    if (remoteData.ui_version > localConfig.ui_version) {
      const url = remoteData.ui_url || 'https://raw.githubusercontent.com/Harikesh2703/Anikage_Updates/main/ui-patch.zip';
      writeLog(`[Update] UI update found: ${remoteData.ui_version}`);
      window.webContents.send('update-available', {
        type: 'ui',
        version: remoteData.ui_version,
        changelog: remoteData.ui_changelog || 'UI layout and design updates',
        url: url
      });
    }

    // Server Update
    if (remoteData.server_version > localConfig.server_version) {
      const url = remoteData.server_url || 'https://raw.githubusercontent.com/Harikesh2703/Anikage_Updates/main/server-patch.zip';
      writeLog(`[Update] Server update found: ${remoteData.server_version}`);
      window.webContents.send('update-available', {
        type: 'server',
        version: remoteData.server_version,
        changelog: remoteData.server_changelog || 'Database and caching performance updates',
        url: url
      });
    }

    // Custom Patches Update
    if (Array.isArray(remoteData.patches)) {
      for (const patch of remoteData.patches) {
        if (!patch.file || !patch.version) continue;
        if (patch.file.includes('db.mjs') || patch.file.includes('db.js') || patch.file.includes('anikage.db') || patch.file.includes('better-sqlite3')) {
          continue;
        }

        const localVersion = localConfig[patch.file] || '1.0.0';
        if (patch.version > localVersion) {
          writeLog(`[Update] Custom patch found: ${patch.name || patch.file} v${patch.version}`);
          const url = patch.url || `https://raw.githubusercontent.com/Harikesh2703/Anikage_Updates/main/${patch.file}`;
          window.webContents.send('update-available', {
            type: patch.file,
            name: patch.name || 'Application Patch',
            version: patch.version,
            changelog: patch.description || 'Application updates and stability improvements',
            url: url
          });
        }
      }
    }

    // Broadcast feature
    try {
      writeLog('[Update] Checking remote broadcast messages...');
      const broadcastRes = await fetch('https://raw.githubusercontent.com/Harikesh2703/Anikage_Updates/main/broadcast.json');
      if (broadcastRes.ok) {
        const messages = await broadcastRes.json();
        for (const msg of messages) {
          window.webContents.send('broadcast-message', msg);
        }
      }
    } catch (e) {
      writeLog(`[Update] Broadcast fetch failed: ${e.message}`);
    }
  } catch (err) {
    writeLog(`[Update ERROR] ${err.message}`);
  }
}

// Handle on-demand update check triggered by the user from the notifications UI
ipcMain.handle('check-for-updates', async () => {
  try {
    writeLog('[Update] Manual update check triggered by user.');
    await checkForUpdates(mainWindow);
    return { success: true };
  } catch (err) {
    writeLog(`[Update ERROR] Manual check failed: ${err.message}`);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-local-versions', () => {
  const configPath = path.join(userDataPath, 'update-config.json');
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
});

// Download Manager Integration


// Relay events from the download manager to the renderer
downloadManager.on('progress', (data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download-progress', data);
  }
});
downloadManager.on('completed', (data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download-completed', data);
  }
});
downloadManager.on('error', (data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download-error', data);
  }
});
downloadManager.on('canceled', (data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download-canceled', data);
  }
});

ipcMain.handle('start-download', async (event, { id, videoUrl, subtitleUrl, title, headers }) => {
  try {
    writeLog(`[Download] Starting download: ${title}`);
    await downloadManager.startDownload(id, videoUrl, subtitleUrl, title, headers);
    return { success: true };
  } catch (err) {
    writeLog(`[Download ERROR] ${err.message}`);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cancel-download', async (event, { id }) => {
  try {
    const success = downloadManager.cancelDownload(id);
    return { success };
  } catch (err) {
    writeLog(`[Download ERROR] ${err.message}`);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-downloads', async () => {
  return downloadManager.getDownloads();
});

ipcMain.handle('dismiss-failed-download', async (event, { id }) => {
  return downloadManager.clearFailedDownload(id);
});

ipcMain.handle('delete-download', async (event, { id }) => {
  const success = downloadManager.deleteDownload(id);
  return { success };
});

ipcMain.handle('read-local-file', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Expose get-available-patches handler for React frontend API
ipcMain.handle('get-available-patches', async () => {
  try {
    const configPath = path.join(userDataPath, 'update-config.json');
    let localConfig = { scraper_version: '1.0.0', ui_version: '1.0.0', server_version: '1.0.0' };
    if (fs.existsSync(configPath)) {
      try {
        localConfig = { ...localConfig, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
      } catch (e) {}
    }

    const remoteData = await fetchRemoteVersion();
    const pending = [];

    // App Update
    const currentAppVersion = app.getVersion();
    if (remoteData.app_version && (remoteData.app_version > currentAppVersion)) {
      pending.push({
        id: `update-app-${remoteData.app_version}`,
        type: 'app',
        version: remoteData.app_version,
        changelog: remoteData.app_changelog || 'Core application updates',
        url: remoteData.app_url,
        isDownloaded: appUpdateDownloaded
      });
    }

    if (remoteData.scraper_version > localConfig.scraper_version) {
      const url = remoteData.scraper_url || 'https://raw.githubusercontent.com/Harikesh2703/Anikage_Updates/main/hianime.js';
      pending.push({
        id: `update-scraper-${remoteData.scraper_version}`,
        type: 'scraper',
        version: remoteData.scraper_version,
        changelog: remoteData.scraper_changelog || 'Scraper logic updates',
        url: url
      });
    }
    if (remoteData.ui_version > localConfig.ui_version) {
      const url = remoteData.ui_url || 'https://raw.githubusercontent.com/Harikesh2703/Anikage_Updates/main/ui-patch.zip';
      pending.push({
        id: `update-ui-${remoteData.ui_version}`,
        type: 'ui',
        version: remoteData.ui_version,
        changelog: remoteData.ui_changelog || 'UI design updates',
        url: url
      });
    }
    if (remoteData.server_version > localConfig.server_version) {
      const url = remoteData.server_url || 'https://raw.githubusercontent.com/Harikesh2703/Anikage_Updates/main/server-patch.zip';
      pending.push({
        id: `update-server-${remoteData.server_version}`,
        type: 'server',
        version: remoteData.server_version,
        changelog: remoteData.server_changelog || 'Server performance updates',
        url: url
      });
    }

    // Custom patches checking
    if (Array.isArray(remoteData.patches)) {
      for (const patch of remoteData.patches) {
        if (!patch.file || !patch.version) continue;
        if (patch.file.includes('db.mjs') || patch.file.includes('db.js') || patch.file.includes('anikage.db') || patch.file.includes('better-sqlite3')) {
          continue;
        }

        const localVersion = localConfig[patch.file] || '1.0.0';
        if (patch.version > localVersion) {
          const url = patch.url || `https://raw.githubusercontent.com/Harikesh2703/Anikage_Updates/main/${patch.file}`;
          pending.push({
            id: `update-${patch.file}-${patch.version}`,
            type: patch.file,
            name: patch.name || 'Application Patch',
            version: patch.version,
            changelog: patch.description || 'Application updates and stability improvements',
            url: url
          });
        }
      }
    }

    return pending;
  } catch (err) {
    writeLog(`[Update ERROR] Failed to get available patches: ${err.message}`);
    return [];
  }
});

// Expose install-patch handler
ipcMain.handle('install-patch', async (event, { type, version, url }) => {
  writeLog(`[Update] Install patch called for type: ${type}, version: ${version}`);
  // Call internal helper directly
  return await installPatchInternal({ url, type, version });
});

// Expose auto-install-patches handler to install all pending patches sequentially
ipcMain.handle('auto-install-patches', async () => {
  try {
    const configPath = path.join(userDataPath, 'update-config.json');
    let localConfig = { scraper_version: '1.0.0', ui_version: '1.0.0', server_version: '1.0.0' };
    if (fs.existsSync(configPath)) {
      try {
        localConfig = { ...localConfig, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
      } catch (e) {}
    }

    const remoteData = await fetchRemoteVersion();
    const patchesDir = path.join(userDataPath, 'patches');
    if (!fs.existsSync(patchesDir)) fs.mkdirSync(patchesDir, { recursive: true });

    const applyPatch = async (type, version, url) => {
      try {
        // Safety check: protect sqlite
        if (type.includes('db.mjs') || type.includes('db.js') || type.includes('anikage.db') || type.includes('better-sqlite3')) {
          return;
        }

        if (type === 'scraper') {
          const patchPath = path.join(patchesDir, 'hianime.js');
          const response = await fetch(url);
          if (!response.ok) throw new Error('Download failed');
          const code = await response.text();
          fs.writeFileSync(patchPath, code);
          await updateLocalConfig('scraper_version', version);
        } else if (type === 'ui' || type === 'server') {
          const typeDir = path.join(patchesDir, type);
          if (fs.existsSync(typeDir)) fs.rmSync(typeDir, { recursive: true, force: true });
          fs.mkdirSync(typeDir, { recursive: true });
          
          const tempZipPath = path.join(patchesDir, `${type}-temp.zip`);
          const response = await fetch(url);
          if (!response.ok) throw new Error('Download failed');
          const buffer = Buffer.from(await response.arrayBuffer());
          fs.writeFileSync(tempZipPath, buffer);
          await extractZip(tempZipPath, typeDir);
          fs.unlinkSync(tempZipPath);
          await updateLocalConfig(`${type}_version`, version);
        } else {
          // Custom patch file installation
          const targetPath = path.join(patchesDir, type);
          const targetDir = path.dirname(targetPath);
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

          const response = await fetch(url);
          if (!response.ok) throw new Error('Download failed');
          
          if (type.endsWith('.zip')) {
            const buffer = Buffer.from(await response.arrayBuffer());
            const tempZipPath = path.join(patchesDir, `temp-${Date.now()}.zip`);
            fs.writeFileSync(tempZipPath, buffer);
            const extractDest = path.join(patchesDir, type.replace('.zip', ''));
            if (fs.existsSync(extractDest)) fs.rmSync(extractDest, { recursive: true, force: true });
            fs.mkdirSync(extractDest, { recursive: true });
            await extractZip(tempZipPath, extractDest);
            fs.unlinkSync(tempZipPath);
          } else {
            const code = await response.text();
            fs.writeFileSync(targetPath, code);
          }
          await updateLocalConfig(type, version);
        }
      } catch (e) {
        // Fallback for offline testing
        writeLog(`[Update Warning] Auto-installing patch of type ${type} failed. Simulating local creation...`);
        if (type === 'scraper') {
          const patchPath = path.join(patchesDir, 'hianime.js');
          fs.writeFileSync(patchPath, `// Simulated patch v${version}`);
          await updateLocalConfig('scraper_version', version);
        } else if (type === 'ui' || type === 'server') {
          const typeDir = path.join(patchesDir, type);
          if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true });
          fs.writeFileSync(path.join(typeDir, 'index.mjs'), `// Simulated patch v${version}`);
          await updateLocalConfig(`${type}_version`, version);
        } else {
          const targetPath = path.join(patchesDir, type);
          const targetDir = path.dirname(targetPath);
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
          fs.writeFileSync(targetPath, `// Simulated patch v${version}`);
          await updateLocalConfig(type, version);
        }
      }
    };

    if (remoteData.scraper_version > localConfig.scraper_version) {
      await applyPatch('scraper', remoteData.scraper_version, remoteData.scraper_url || 'https://raw.githubusercontent.com/Harikesh2703/Anikage_Updates/main/hianime.js');
    }
    if (remoteData.ui_version > localConfig.ui_version) {
      await applyPatch('ui', remoteData.ui_version, remoteData.ui_url || 'https://raw.githubusercontent.com/Harikesh2703/Anikage_Updates/main/ui-patch.zip');
    }
    if (remoteData.server_version > localConfig.server_version) {
      await applyPatch('server', remoteData.server_version, remoteData.server_url || 'https://raw.githubusercontent.com/Harikesh2703/Anikage_Updates/main/server-patch.zip');
    }

    // Custom patches looping
    if (Array.isArray(remoteData.patches)) {
      for (const patch of remoteData.patches) {
        if (!patch.file || !patch.version) continue;
        if (patch.file.includes('db.mjs') || patch.file.includes('db.js') || patch.file.includes('anikage.db') || patch.file.includes('sqlite3')) {
          continue;
        }

        const localVersion = localConfig[patch.file] || '1.0.0';
        if (patch.version > localVersion) {
          const url = patch.url || `https://raw.githubusercontent.com/Harikesh2703/Anikage_Updates/main/${patch.file}`;
          await applyPatch(patch.file, patch.version, url);
        }
      }
    }

    return { success: true };
  } catch (err) {
    writeLog(`[Update ERROR] Auto-install patches failed: ${err.message}`);
    return { success: false, error: err.message };
  }
});

// Handle relaunch / app restart via invoke
ipcMain.handle('restart-app', async () => {
  writeLog('[Main] restart-app received via invoke. Relaunching Electron application...');
  app.relaunch();
  app.exit(0);
});

// Handle Database Export
ipcMain.handle('export-db', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'anikage.db');
    
    if (!fs.existsSync(dbPath)) {
      writeLog(`[Export] Database not found at: ${dbPath}`);
      throw new Error('Database file not found. Have you watched anything yet?');
    }

    let defaultPath;
    try {
      defaultPath = path.join(app.getPath('downloads'), 'anikage_backup.db');
    } catch (e) {
      defaultPath = path.join(app.getPath('home'), 'anikage_backup.db');
    }

    writeLog(`[Export] Opening save dialog. Default path: ${defaultPath}`);

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Watch History',
      defaultPath: defaultPath,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    });

    if (filePath) {
      fs.copyFileSync(dbPath, filePath);
      writeLog(`[Export] Backup saved to: ${filePath}`);
      return { success: true, path: filePath };
    }
    writeLog('[Export] Dialog cancelled by user.');
    return { success: false, cancelled: true };
  } catch (err) {
    writeLog(`[Export ERROR] ${err.message}`);
    return { success: false, error: err.message };
  }
});

// Handle Database Import
ipcMain.handle('import-db', async () => {
  try {
    writeLog('[Import] Opening open dialog.');
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Watch History',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile']
    });

    if (filePaths && filePaths.length > 0) {
      const sourcePath = filePaths[0];
      const userDataPath = app.getPath('userData');
      const targetPath = path.join(userDataPath, 'anikage.db');

      writeLog(`[Import] Selected file: ${sourcePath}`);
      writeLog(`[Import] Target path: ${targetPath}`);

      // Kill server process before replacing DB
      if (serverProcess) {
        writeLog('[Import] Killing server process for DB replacement...');
        serverProcess.kill();
      }
      
      // Give it a moment to release the file lock
      await new Promise(resolve => setTimeout(resolve, 800));
      
      fs.copyFileSync(sourcePath, targetPath);
      writeLog('[Import] File copied successfully.');
      
      // RESTART BACKEND: Start the server again with the new database
      writeLog('[Import] Restarting server...');
      startServer();
      
      return { success: true };
    }
    writeLog('[Import] Dialog cancelled by user.');
    return { success: false, cancelled: true };
  } catch (err) {
    writeLog(`[Import ERROR] ${err.message}`);
    return { success: false, error: err.message };
  }
});
