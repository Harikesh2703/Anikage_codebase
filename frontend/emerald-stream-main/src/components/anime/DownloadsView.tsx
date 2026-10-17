import { useEffect, useState, useMemo } from 'react';
import { Play, Download as DownloadIcon, Trash2, Folder, Film, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { VideoPlayer } from './VideoPlayer';

interface DownloadItem {
  id: string;
  title: string;
  status: string;
  outputPath?: string;
  subtitlePath?: string;
  progress?: number;
  timemark?: string;
  error?: string;
}

export function DownloadsView() {
  const [downloads, setDownloads] = useState<{ active: DownloadItem[]; completed: DownloadItem[]; failed: DownloadItem[] }>({
    active: [],
    completed: [],
    failed: []
  });
  const [playingItem, setPlayingItem] = useState<DownloadItem | null>(null);

  useEffect(() => {
    fetchDownloads();
    const interval = setInterval(fetchDownloads, 2000);

    // @ts-ignore
    const removeProg = window.electron?.on?.('download-progress', (data: any) => {
      setDownloads(prev => ({
        ...prev,
        active: prev.active.map(dl => dl.id === data.id ? { ...dl, progress: data.progress, timemark: data.timemark } : dl)
      }));
    });

    // @ts-ignore
    const removeComp = window.electron?.on?.('download-completed', () => {
      fetchDownloads();
    });

    // @ts-ignore
    const removeErr = window.electron?.on?.('download-error', (data: any) => {
      fetchDownloads();
    });

    return () => {
      clearInterval(interval);
      if (typeof removeProg === 'function') removeProg();
      if (typeof removeComp === 'function') removeComp();
      if (typeof removeErr === 'function') removeErr();
    };
  }, []);

  const fetchDownloads = async () => {
    try {
      // @ts-ignore
      const data = await window.electron.invoke('get-downloads');
      setDownloads({
        active: data.active || [],
        completed: data.completed || [],
        failed: data.failed || []
      });
    } catch (err) {
      console.error('Failed to fetch downloads:', err);
    }
  };

  const handleDismissFailed = async (id: string) => {
    try {
      // @ts-ignore
      await window.electron.invoke('dismiss-failed-download', { id });
      setDownloads(prev => ({
        ...prev,
        failed: prev.failed.filter(f => f.id !== id)
      }));
    } catch (err) {}
  };

  const handleDeleteDownload = async (item: DownloadItem) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}" from your disk?`)) return;
    try {
      // @ts-ignore
      const res = await window.electron.invoke('delete-download', { id: item.id });
      if (res?.success) {
        fetchDownloads();
      }
    } catch (err) {
      console.error('Failed to delete download:', err);
    }
  };

  const handlePlay = (item: DownloadItem) => {
    setPlayingItem(item);
  };

  const mockSources = useMemo(() => {
    if (!playingItem) return [];
    return [{
      url: `http://127.0.0.1:3001/api/stream-local?path=${encodeURIComponent(playingItem.outputPath || '')}`,
      quality: 'Auto',
      provider: 'Local Offline',
      subtitles: playingItem.subtitlePath ? [
        { url: `file://${playingItem.subtitlePath}`, language: 'English', label: 'English', default: true }
      ] : []
    }];
  }, [playingItem]);

  if (playingItem) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <VideoPlayer
          streamUrl={mockSources[0]?.url}
          title={playingItem.title}
          episode="Offline"
          totalEpisodes={['Offline']}
          onClose={() => setPlayingItem(null)}
          onEpisodeChange={() => {}}
          onTryNextSource={() => {}}
          onSourceChange={() => {}}
          currentSourceIndex={0}
          allSources={mockSources}
          hasMoreSources={false}
          loading={false}
          error={null}
        />
      </div>
    );
  }

  // Group completed by a heuristic (e.g. text before "episode")
  const grouped = downloads.completed.reduce((acc, item) => {
    const parts = item.title.toLowerCase().split('episode');
    const series = parts.length > 1 ? parts[0].trim() : 'Other Anime';
    if (!acc[series]) acc[series] = [];
    acc[series].push(item);
    return acc;
  }, {} as Record<string, DownloadItem[]>);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
          <Folder className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Downloads Library</h1>
          <p className="text-muted-foreground text-sm">Watch your saved episodes completely offline.</p>
        </div>
      </div>

      <div className="space-y-8">
        {downloads.failed.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5" /> Download Errors
            </h2>
            <div className="grid gap-3">
              {downloads.failed.map(dl => (
                <div key={dl.id} className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-red-400">{dl.title}</span>
                    <button
                      onClick={() => handleDismissFailed(dl.id)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded bg-secondary/50"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Dismiss
                    </button>
                  </div>
                  {dl.error && (
                    <pre className="text-xs font-mono bg-black/40 p-2.5 rounded-lg text-red-300 overflow-x-auto whitespace-pre-wrap max-h-32">
                      {dl.error}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {downloads.active.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <DownloadIcon className="w-5 h-5 text-blue-500" /> Downloading
            </h2>
            <div className="grid gap-3">
              {downloads.active.map(dl => {
                const percent = dl.progress != null ? Math.round(dl.progress) : null;
                return (
                  <div key={dl.id} className="p-4 rounded-xl bg-card border border-border flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                        <span className="font-semibold truncate">{dl.title}</span>
                      </div>
                      
                      {/* Right side progress bar and status */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-36 sm:w-48 h-2 bg-secondary rounded-full overflow-hidden border border-border/50">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-300 rounded-full" 
                            style={{ width: `${percent != null ? Math.max(percent, 4) : 8}%` }} 
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-blue-400 min-w-[3.5rem] text-right">
                          {percent != null ? `${percent}%` : (dl.timemark || '0%')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {Object.entries(grouped).map(([series, items]) => (
          <div key={series} className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 capitalize">
              <Film className="w-5 h-5 text-primary" /> {series}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <div key={item.id} className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.05)] transition-all flex flex-col gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg line-clamp-2">{item.title}</h3>
                    {item.subtitlePath && (
                      <span className="inline-flex items-center mt-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-green-500/10 text-green-500">
                        Subtitled
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      onClick={() => handlePlay(item)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors"
                    >
                      <Play className="w-4 h-4 fill-current" /> Play Offline
                    </button>
                    {/* Delete button */}
                    <button 
                      onClick={() => handleDeleteDownload(item)}
                      className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" 
                      title="Delete file from disk"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {downloads.active.length === 0 && downloads.completed.length === 0 && downloads.failed.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-card border border-border flex items-center justify-center mb-4 opacity-20">
              <DownloadIcon className="w-8 h-8" />
            </div>
            <p className="text-muted-foreground font-medium">Your library is empty.</p>
            <p className="text-muted-foreground/60 text-sm">Download episodes to watch them completely offline without buffering.</p>
          </div>
        )}
      </div>
    </div>
  );
}
