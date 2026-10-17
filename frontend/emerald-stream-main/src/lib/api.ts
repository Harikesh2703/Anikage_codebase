// Central API client — all calls go to the Express server at port 3001
const API_BASE = 'http://localhost:3001/api';

export interface AnimeItem {
  id: string;
  title: string;
  coverImage: string;
  banner?: string;
  tags: string[];
  synopsis?: string;
  score?: number;
  episodes?: number;
  type?: string;
}

export interface Subtitle {
  label: string;
  url: string;
  default?: boolean;
}

export interface StreamSource {
  url: string;
  quality: string;
  provider: string;
  subtitles?: Subtitle[];
  headers?: Record<string, string>;
}

export interface StreamResponse {
  sources: StreamSource[];
  fallback: string;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  search: (q: string) =>
    get<AnimeItem[]>(`/search?q=${encodeURIComponent(q)}`),

  trending: (opts?: { limit?: number; genre?: string }) => {
    const params = new URLSearchParams();
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.genre) params.set('genre', opts.genre);
    return get<AnimeItem[]>(`/trending?${params.toString()}`);
  },

  episodes: (showId: string, title?: string) => {
    const params = new URLSearchParams();
    if (title) params.set('title', title);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return get<string[]>(`/episodes/${encodeURIComponent(showId)}${qs}`);
  },

  stream: (showId: string, episode: string, title?: string) => {
    const params = new URLSearchParams();
    if (title) params.set('title', title);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return get<StreamResponse>(`/sources/${encodeURIComponent(showId)}/${encodeURIComponent(episode)}${qs}`);
  },

  history: () =>
    get<AnimeItem[]>(`/history`),

  recordHistory: (anime: AnimeItem, episode: string) =>
    post<{ success: boolean }>('/history', {
      id: anime.id,
      title: anime.title,
      coverImage: anime.coverImage,
      episode,
      tags: anime.tags
    }),

  checkUpdates: () => {
    // @ts-ignore
    if (window.electron) {
      // @ts-ignore
      return window.electron.invoke('check-for-updates');
    }
    return Promise.resolve({ success: false, error: 'Not in Electron' });
  },

  getAvailablePatches: () => {
    // @ts-ignore
    if (window.electron) {
      // @ts-ignore
      return window.electron.invoke('get-available-patches');
    }
    return Promise.resolve([]);
  },

  installPatch: (type: string, version: string, url: string) => {
    // @ts-ignore
    if (window.electron) {
      // @ts-ignore
      return window.electron.invoke('install-patch', { type, version, url });
    }
    return Promise.resolve({ success: false, error: 'Not in Electron' });
  },

  autoInstallPatches: () => {
    // @ts-ignore
    if (window.electron) {
      // @ts-ignore
      return window.electron.invoke('auto-install-patches');
    }
    return Promise.resolve({ success: false, error: 'Not in Electron' });
  },

  getLocalVersions: () => {
    // @ts-ignore
    if (window.electron) {
      // @ts-ignore
      return window.electron.invoke('get-local-versions');
    }
    return Promise.resolve({ app: '1.0.0', scraper: '1.0.0', ui: '1.0.0', server: '1.0.0' });
  },

  getPlugins: () => 
    get<any[]>(`/plugins`),
    
  setActivePlugin: (id: string) => 
    post<{ success: boolean; activePlugin: string }>(`/plugins/active`, { id }),
};
