import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { execFile, execSync } from 'child_process';
import { promisify } from 'util';
import aniCliRsPlugin from './plugins/aniCliRs.mjs';

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Resolve the best curl executable to use
let curlExe = 'curl';
try {
  if (execSync('command -v curl-impersonate-chrome', { encoding: 'utf8' }).trim()) {
    curlExe = 'curl-impersonate-chrome';
  } else if (execSync('command -v curl-impersonate-ff', { encoding: 'utf8' }).trim()) {
    curlExe = 'curl-impersonate-ff';
  } else if (execSync('command -v curl-impersonate', { encoding: 'utf8' }).trim()) {
    curlExe = 'curl-impersonate';
  }
} catch (e) {}

// Custom fetch using curl-impersonate to bypass Cloudflare
async function curlFetch(url, options = {}) {
    const args = ['-s', '-S', '-L'];
    
    if (options.headers) {
        for (const [key, val] of Object.entries(options.headers)) {
            args.push('-H', `${key}: ${val}`);
        }
    }
    
    if (options.method && options.method !== 'GET') {
        args.push('-X', options.method);
        if (options.body) {
            args.push('--data-raw', options.body);
        }
    }
    
    args.push(url);
    
    console.log(`[curlFetch] Executing: ${curlExe} ${url}`);
    
    try {
        const { stdout, stderr } = await execFileAsync(curlExe, args, { maxBuffer: 10 * 1024 * 1024 });
        return {
            ok: true,
            status: 200,
            text: async () => stdout,
            json: async () => JSON.parse(stdout)
        };
    } catch (err) {
        console.error(`[curlFetch] Error fetching ${url}`);
        console.error(`[curlFetch] Exit Code: ${err.code}`);
        console.error(`[curlFetch] stderr: ${err.stderr}`);
        const partialStdout = err.stdout ? err.stdout.substring(0, 200) : '';
        console.error(`[curlFetch] stdout (first 200 chars): ${partialStdout}`);
        throw err;
    }
}

class PluginManager {
  constructor() {
    this.userDataPath = process.env.USER_DATA_PATH || path.join(os.homedir(), '.config/Anikage');
    this.pluginsPath = path.join(this.userDataPath, 'plugins');
    this.plugins = new Map(); // id -> Plugin Instance
    this.activePluginId = null;

    this.init();
  }

  init() {
    if (!fs.existsSync(this.pluginsPath)) {
      fs.mkdirSync(this.pluginsPath, { recursive: true });
    }
    this.seedBundledPlugins();
    this.registerNativePlugins();
    this.loadPlugins();
    // Sync remotely in the background to not block startup too much
    this.syncPlugins().catch(err => console.error(`[PluginManager] Sync failed: ${err.message}`));
  }

  seedBundledPlugins() {
    const candidates = [
      path.join(__dirname, '../packages/scrapers/dist'),
      path.join(process.resourcesPath || __dirname, 'app.asar.unpacked/packages/scrapers/dist')
    ];
    for (const dir of candidates) {
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            if (file.endsWith('.js') && file !== 'anikoto.js' && file !== 'allanime.js' && file !== 'anikoto_cz.js') {
              const dest = path.join(this.pluginsPath, file);
              if (!fs.existsSync(dest)) {
                fs.copyFileSync(path.join(dir, file), dest);
                console.log(`[PluginManager] Seeded bundled plugin: ${file}`);
              }
            }
          }
        } catch (e) {
          console.warn(`[PluginManager] Could not seed plugins from ${dir}:`, e.message);
        }
      }
    }
  }

  registerNativePlugins() {
    try {
      this.plugins.set('anikoto', {
        id: 'anikoto',
        name: aniCliRsPlugin.name,
        version: aniCliRsPlugin.version,
        instance: aniCliRsPlugin,
        isNative: true
      });
      // Alias anikoto2 to anikoto
      this.plugins.set('anikoto2', {
        id: 'anikoto',
        name: aniCliRsPlugin.name,
        version: aniCliRsPlugin.version,
        instance: aniCliRsPlugin,
        isNative: true
      });
      console.log('[PluginManager] Registered native ani-cli-rs plugin.');
    } catch (err) {
      console.error('[PluginManager] Failed to register native ani-cli-rs plugin:', err.message);
    }
  }

  async syncPlugins() {
    try {
      console.log('[PluginManager] Syncing plugins with update server...');
      // Note: in a real environment this would be the remote server address
      const res = await fetch('http://localhost:4000/api/plugins/scrapers');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      let updated = false;

      for (const remotePlugin of data.plugins) {
        if (remotePlugin.id === 'anikoto' || remotePlugin.id === 'allanime' || remotePlugin.id === 'anikoto_cz') continue;
        const localPlugin = this.plugins.get(remotePlugin.id);
        const localVersion = localPlugin ? localPlugin.version : '0.0.0';

        if (remotePlugin.version > localVersion) {
          console.log(`[PluginManager] Updating plugin ${remotePlugin.id} (v${localVersion} -> v${remotePlugin.version})`);
          const fileRes = await fetch(remotePlugin.url);
          if (!fileRes.ok) throw new Error(`Failed to fetch ${remotePlugin.url}`);
          
          const code = await fileRes.text();
          const targetPath = path.join(this.pluginsPath, `${remotePlugin.id}.js`);
          fs.writeFileSync(targetPath, code);
          updated = true;
        }
      }

      if (updated) {
        console.log('[PluginManager] Reloading plugins after update.');
        this.loadPlugins();
      } else {
        console.log('[PluginManager] All plugins are up to date.');
      }
    } catch (err) {
      console.error(`[PluginManager] Plugin sync error: ${err.message}`);
    }
  }

  loadPlugins() {
    console.log(`[PluginManager] Loading plugins from ${this.pluginsPath}...`);
    
    if (fs.existsSync(this.pluginsPath)) {
      const files = fs.readdirSync(this.pluginsPath);
      for (const file of files) {
        if (file.endsWith('.js')) {
          this.loadPlugin(path.join(this.pluginsPath, file));
        }
      }
    }
    
    if (this.plugins.size > 0 && !this.activePluginId) {
      if (this.plugins.has('hianime')) {
          this.activePluginId = 'hianime';
      } else {
          this.activePluginId = Array.from(this.plugins.keys())[0];
      }
      console.log(`[PluginManager] Defaulted active plugin to: ${this.activePluginId}`);
    }
  }

  loadPlugin(filePath) {
    const id = path.basename(filePath, '.js');
    if (id === 'anikoto') {
      // Reserved for native ani-cli-rs plugin
      return;
    }
    if (id === 'allanime' || id === 'anikoto_cz') {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {}
      return;
    }
    const oldInstance = this.plugins.get(id); // Backup old instance
    
    try {
      const code = fs.readFileSync(filePath, 'utf8');
      
      // We create a fresh sandbox with the globals the scraper needs.
      const sandbox = {
          fetch: curlFetch,
          console: console,
          setTimeout: setTimeout,
          clearTimeout: clearTimeout,
          setInterval: setInterval,
          clearInterval: clearInterval,
          URL: URL,
          URLSearchParams: URLSearchParams,
          atob: atob,
          btoa: btoa,
          globalThis: {} // Scraper will attach activePlugin here
      };

      const context = vm.createContext(sandbox);
      const script = new vm.Script(code, { filename: filePath });
      script.runInContext(context);
      
      const pluginInstance = sandbox.globalThis.activePlugin;
      if (!pluginInstance) {
          throw new Error("Plugin did not export globalThis.activePlugin");
      }
      
      if (!pluginInstance.name) {
         pluginInstance.name = id;
      }
      
      this.plugins.set(id, {
         id,
         name: pluginInstance.name,
         version: pluginInstance.version || '1.0.0',
         instance: pluginInstance,
         filePath
      });
      console.log(`[PluginManager] Loaded plugin: ${pluginInstance.name} (${id})`);
    } catch (err) {
      console.error(`[PluginManager] Failed to load plugin ${filePath}:`, err.message);
      // Fallback to old instance if hot-reloading failed
      if (oldInstance) {
        console.log(`[PluginManager] Falling back to previous working instance of ${id}.`);
        this.plugins.set(id, oldInstance);
      }
    }
  }

  getActivePlugin() {
    if (!this.activePluginId || !this.plugins.has(this.activePluginId)) {
       throw new Error("No active plugin selected or installed.");
    }
    return this.plugins.get(this.activePluginId).instance;
  }

  setActivePlugin(id) {
    const targetId = (id === 'anikoto2') ? 'anikoto' : id;
    if (!this.plugins.has(targetId)) {
      throw new Error(`Plugin ${id} not found.`);
    }
    this.activePluginId = targetId;
    console.log(`[PluginManager] Active plugin set to: ${targetId}`);
    return this.plugins.get(targetId);
  }

  getAllPlugins() {
    const seen = new Set();
    const result = [];
    for (const p of this.plugins.values()) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        result.push({
          id: p.id,
          name: p.name,
          version: p.version,
          isActive: p.id === this.activePluginId
        });
      }
    }
    return result;
  }
}

export default new PluginManager();
