import { useState, useCallback, useEffect } from 'react';
import { AnalyticsView } from '@/components/anime/AnalyticsView';
import { NotificationsView, type AppNotification } from '@/components/anime/NotificationsView';
import { SettingsView } from '@/components/anime/SettingsView';
import { HomeView } from '@/components/anime/HomeView';
import { DownloadsView } from '@/components/anime/DownloadsView';
import { Navbar } from '@/components/anime/Navbar';
import { EpisodeModal } from '@/components/anime/EpisodeModal';
import { VideoPlayer } from '@/components/anime/VideoPlayer';
import type { AppView } from '@/components/anime/types';
import type { AnimeItem, StreamSource } from '@/lib/api';
import { api } from '@/lib/api';

export function AnimeApp() {
  const [view, setView] = useState<AppView>('home');

  // The anime whose episode list modal is open
  const [selectedAnime, setSelectedAnime] = useState<AnimeItem | null>(null);

  // The anime currently playing in the player (persists while player is open)
  const [watchingAnime, setWatchingAnime] = useState<AnimeItem | null>(null);

  // Player state
  const [playerOpen, setPlayerOpen] = useState(false);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [streamUrl, setStreamUrl] = useState('');
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState('');
  const [episodeList, setEpisodeList] = useState<string[]>([]);
  
  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const loadPatches = useCallback(async () => {
    try {
      const patches = await api.getAvailablePatches();
      setNotifications(prev => {
        const nonUpdates = prev.filter(n => n.type !== 'update');
        const newUpdates = patches.map((p: any) => {
          let title = p.name || 'Application Patch';
          if (p.type === 'app') title = 'Core App Update';
          else if (p.type === 'scraper') title = 'Scraper Hot-Fix';
          else if (p.type === 'ui') title = 'UI Design Update';
          else if (p.type === 'server') title = 'Server Performance Update';

          return {
            id: p.id,
            type: 'update' as const,
            title: title,
            message: p.changelog || `A patch version v${p.version} is available.`,
            version: p.version,
            patchUrl: p.url,
            timestamp: new Date(),
            isRead: false,
            isDownloaded: p.isDownloaded
          };
        });
        return [...newUpdates, ...nonUpdates];
      });
    } catch (e) {
      console.error('Failed to load patches:', e);
    }
  }, []);

  const loadUpdates = useCallback(async (force = false) => {
    const lastCheck = localStorage.getItem('anikage_last_update_check');
    const now = Date.now();
    
    if (force || !lastCheck || now - parseInt(lastCheck) > 3600000) {
      localStorage.setItem('anikage_last_update_check', String(now));
      await api.checkUpdates();
    }
  }, []);

  useEffect(() => {
    // Listen for background updates
    // @ts-ignore
    if (window.electron) {
      // @ts-ignore
      const removeListener = window.electron.on('update-available', (data: any) => {
        const notifId = `update-${data.type}-${data.version}`;
        setNotifications(prev => {
          if (prev.some(n => n.id === notifId)) return prev;

          let title = data.name || 'Application Patch Available';
          if (data.type === 'scraper') title = 'Scraper Hot-Fix Available';
          else if (data.type === 'ui') title = 'UI Design Update Available';
          else if (data.type === 'server') title = 'Server Performance Update Available';
          else if (data.type === 'app') title = 'Core App Update Available';

          return [
            {
              id: notifId,
              type: 'update',
              title: title,
              message: data.changelog || `A critical update is available. v${data.version}`,
              version: data.version,
              patchUrl: data.url,
              timestamp: new Date(),
              isRead: false
            },
            ...prev
          ];
        });
      });

      // @ts-ignore
      const removeDownloadedListener = window.electron.on('update-downloaded', (data: any) => {
        const notifId = `update-${data.type}-${data.version}`;
        setNotifications(prev => {
          return prev.map(n => {
            if (n.id === notifId || (data.type === 'app' && n.type === 'update' && n.version === data.version)) {
              return {
                ...n,
                message: 'Update is downloaded and ready to install. Restart the application to apply.',
                isDownloaded: true
              };
            }
            return n;
          });
        });
      });

      // @ts-ignore
      const removeBroadcastListener = window.electron.on('broadcast-message', (data: any) => {
        setNotifications(prev => {
          if (prev.some(n => n.id === data.id)) return prev;

          let type: 'info' | 'error' | 'update' = 'info';
          if (data.type === 'error' || data.type === 'warning') type = 'error';
          if (data.type === 'success') type = 'info'; // Fallback mapping

          return [
            {
              id: data.id,
              type: type,
              title: data.title,
              message: data.message,
              timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
              isRead: false
            },
            ...prev
          ];
        });
      });

      // Initialize
      loadUpdates();
      loadPatches();

      return () => {
        removeListener();
        removeDownloadedListener();
        removeBroadcastListener();
      };
    }
  }, [loadUpdates, loadPatches]);

  const installPatch = async (id: string, url: string) => {
    const parts = id.split('-');
    const type = parts[1] || 'scraper';
    const version = parts[2] || '1.0.0';

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, message: 'Installing patch...' } : n));

    // @ts-ignore
    const result = await api.installPatch(type, version, url);
    if (result.success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, message: 'Update applied successfully! Reloading application...' } : n));
      
      // Clear local caches
      localStorage.removeItem('anikage_last_update_check');
      localStorage.removeItem('anikage_has_updates');
      localStorage.removeItem('anikage_cache_patches');

      // Dispatch event to clear nav dots
      window.dispatchEvent(new Event('anikage_updates_cleared'));

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      alert(`Update failed: ${result.error}`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, message: 'Update failed. Click to retry.' } : n));
    }
  };

  // Called by AnimeCard when user clicks a card
  const openEpisodeModal = useCallback((anime: AnimeItem) => {
    setSelectedAnime(anime);
  }, []);

  // Shared stream-fetch logic
  const fetchStream = useCallback(async (anime: AnimeItem, episode: string) => {
    setStreamLoading(true);
    setStreamError(null);
    setStreamUrl('');
    setSources([]);
    setSourceIndex(0);
    setCurrentEpisode(episode);
    try {
      const response = await api.stream(anime.id, episode, anime.title);
      if (!response.sources || response.sources.length === 0) throw new Error('No stream sources found.');
      
      // Helper to extract numeric quality for sorting
      const getQualityScore = (q: string) => {
        const match = q.match(/(\d+)/);
        if (match) return parseInt(match[1]);
        if (q.toLowerCase().includes('multi') || q.toLowerCase().includes('auto')) return 2000; // Prefer multi-quality
        return 0;
      };

      // Sort sources by quality descending
      const sortedSources = [...response.sources].sort((a, b) => 
        getQualityScore(b.quality) - getQualityScore(a.quality)
      );

      // Helper to validate URL
      const isValidUrl = (u: string) => {
        try {
          const parsed = new URL(u);
          // Check for valid protocol and a hostname that isn't just a number (like '31')
          return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && 
                 parsed.hostname.includes('.') && 
                 !/^\d+$/.test(parsed.hostname);
        } catch (e) {
          return false;
        }
      };

      // Sort and FILTER sources by quality and validity
      const validSortedSources = [...response.sources]
        .filter(s => isValidUrl(s.url))
        .sort((a, b) => getQualityScore(b.quality) - getQualityScore(a.quality))
        .map(source => ({
            ...source,
            subtitles: source.subtitles?.map((sub: any) => ({
                ...sub,
                label: sub.lang || sub.label || 'English',
                url: `http://127.0.0.1:3001/api/proxy?url=${encodeURIComponent(sub.url)}${source.headers?.referer ? `&referer=${encodeURIComponent(source.headers.referer)}` : ''}`
            }))
        }));

      if (validSortedSources.length === 0) throw new Error('No playable stream sources found.');

      console.log('Valid Sorted Sources:', validSortedSources);
      setSources(validSortedSources);
      setSourceIndex(0);
      
      const firstSource = validSortedSources[0];
      const isDirectVideo = 
        firstSource.url.includes('.m3u8') || 
        firstSource.url.includes('.mp4') || 
        firstSource.url.includes('.mkv') ||
        firstSource.url.includes('fast4speed.rsvp') ||
        firstSource.url.includes('googlevideo.com');
      
      if (isDirectVideo) {
        let proxiedUrl = `http://127.0.0.1:3001/api/proxy?url=${encodeURIComponent(firstSource.url)}`;
        if (firstSource.headers?.referer) {
            proxiedUrl += `&referer=${encodeURIComponent(firstSource.headers.referer)}`;
        }
        setStreamUrl(proxiedUrl);
      } else {
        setStreamUrl(firstSource.url);
      }

      // Record this watch in history
      api.recordHistory(anime, episode).catch(e => console.error('Failed to record history:', e));
    } catch (err) {
      setStreamError(err instanceof Error ? err.message : 'Stream fetch failed');
    } finally {
      setStreamLoading(false);
    }
  }, []);

  // Manual source switching or automatic fallback
  const tryNextSource = useCallback(() => {
    if (sourceIndex >= sources.length - 1) {
      setStreamError('All sources failed. Try another episode.');
      return;
    }

    const nextIndex = sourceIndex + 1;
    setSourceIndex(nextIndex);
    const nextSource = sources[nextIndex];
    
    const isDirectVideo = 
      nextSource.url.includes('.m3u8') || 
      nextSource.url.includes('.mp4') || 
      nextSource.url.includes('.mkv') ||
      nextSource.url.includes('fast4speed.rsvp') ||
      nextSource.url.includes('googlevideo.com');

    if (isDirectVideo) {
      let proxiedUrl = `http://127.0.0.1:3001/api/proxy?url=${encodeURIComponent(nextSource.url)}`;
      if (nextSource.headers?.referer) {
          proxiedUrl += `&referer=${encodeURIComponent(nextSource.headers.referer)}`;
      }
      setStreamUrl(proxiedUrl);
    } else {
      setStreamUrl(nextSource.url);
    }
    setStreamError(null);
  }, [sourceIndex, sources]);

  const changeSource = useCallback((index: number) => {
    if (index < 0 || index >= sources.length) return;
    
    setSourceIndex(index);
    const nextSource = sources[index];
    
    const isDirectVideo = 
      nextSource.url.includes('.m3u8') || 
      nextSource.url.includes('.mp4') || 
      nextSource.url.includes('.mkv') ||
      nextSource.url.includes('fast4speed.rsvp') ||
      nextSource.url.includes('googlevideo.com');

    if (isDirectVideo) {
      let proxiedUrl = `http://127.0.0.1:3001/api/proxy?url=${encodeURIComponent(nextSource.url)}`;
      if (nextSource.headers?.referer) {
          proxiedUrl += `&referer=${encodeURIComponent(nextSource.headers.referer)}`;
      }
      setStreamUrl(proxiedUrl);
    } else {
      setStreamUrl(nextSource.url);
    }
    setStreamError(null);
  }, [sources]);

  // Called by EpisodeModal when user picks an episode
  const watchEpisode = useCallback(async (episode: string, episodes: string[]) => {
    if (!selectedAnime) return;
    const anime = selectedAnime;
    setSelectedAnime(null);   // close episode modal
    setWatchingAnime(anime);  // remember who we're watching
    setEpisodeList(episodes);
    setPlayerOpen(true);      // open player immediately (shows loading state)
    await fetchStream(anime, episode);
  }, [selectedAnime, fetchStream]);

  // Called by VideoPlayer prev/next buttons
  const changeEpisode = useCallback(async (episode: string) => {
    if (!watchingAnime) return;
    await fetchStream(watchingAnime, episode);
  }, [watchingAnime, fetchStream]);

  const closePlayer = useCallback(() => {
    setPlayerOpen(false);
    setStreamUrl('');
    setWatchingAnime(null);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar 
        view={view} 
        onNavigate={(v: AppView) => setView(v)} 
        onCardClick={openEpisodeModal} 
        hasNotifications={notifications.some(n => !n.isRead)}
      />

      {view === 'home' && (
        <HomeView onCardClick={openEpisodeModal} playerOpen={playerOpen} />
      )}
      
      {view === 'analytics' && (
        <AnalyticsView onCardClick={openEpisodeModal} />
      )}

      {view === 'notifications' && (
        <NotificationsView 
          notifications={notifications} 
          onInstallPatch={installPatch} 
          onMarkAsRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))}
          onClearAll={() => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))}
          onCheckUpdates={async () => {
            // Force updates check
            localStorage.removeItem('anikage_last_update_check');
            localStorage.removeItem('anikage_has_updates');
            localStorage.removeItem('anikage_cache_patches');
            await loadUpdates(true);
            await loadPatches();
          }}
          onAutoInstallAll={async () => {
            // @ts-ignore
            const result = await api.autoInstallPatches();
            if (result.success) {
              localStorage.removeItem('anikage_last_update_check');
              localStorage.removeItem('anikage_has_updates');
              localStorage.removeItem('anikage_cache_patches');
              window.dispatchEvent(new Event('anikage_updates_cleared'));
              setTimeout(() => {
                window.location.reload();
              }, 2500);
            } else {
              alert(`Auto-installation failed: ${result.error}`);
            }
          }}
        />
      )}

      {view === 'settings' && (
        <SettingsView notifications={notifications} />
      )}
      
      {view === 'downloads' && (
        <DownloadsView />
      )}

      {/* Episode picker modal */}
      {selectedAnime && (
        <EpisodeModal
          anime={selectedAnime}
          onClose={() => setSelectedAnime(null)}
          onWatch={watchEpisode}
        />
      )}

      {/* Fullscreen video player */}
      {playerOpen && watchingAnime && (
        <VideoPlayer
          streamUrl={streamUrl}
          title={watchingAnime.title}
          episode={currentEpisode}
          totalEpisodes={episodeList}
          loading={streamLoading}
          error={streamError}
          onClose={closePlayer}
          onEpisodeChange={changeEpisode}
          onTryNextSource={tryNextSource}
          onSourceChange={changeSource}
          currentSourceIndex={sourceIndex}
          allSources={sources}
          hasMoreSources={sourceIndex < sources.length - 1}
        />
      )}
    </div>
  );
}
