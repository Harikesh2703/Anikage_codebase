import { useEffect, useState } from 'react';
import { X, Play, Loader2, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import type { AnimeItem } from '@/lib/api';

interface EpisodeModalProps {
  anime: AnimeItem;
  onClose: () => void;
  onWatch: (episode: string, episodes: string[]) => void;
}

export function EpisodeModal({ anime, onClose, onWatch }: EpisodeModalProps) {
  const [episodes, setEpisodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.episodes(anime.id, anime.title)
      .then(eps => setEpisodes(eps))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [anime.id, anime.title]);

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-2xl max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--color-card)', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Header */}
        <div className="flex items-start gap-4 p-5"
          style={{ background: 'linear-gradient(135deg, rgba(var(--primary-rgb),0.15) 0%, transparent 60%)' }}>
          <img
            src={anime.coverImage}
            alt={anime.title}
            className="w-16 h-24 object-cover rounded-lg shrink-0 shadow-lg"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${anime.id}/160/240`; }}
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{anime.title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {anime.tags.slice(0, 3).join(' • ')}
            </p>
            {!loading && !error && (
              <p className="text-xs text-primary mt-2 font-medium">{episodes.length} episodes</p>
            )}
            {/* Quick-start button */}
            {!loading && !error && episodes.length > 0 && (
              <button
                onClick={() => onWatch(episodes[0], episodes)}
                className="mt-3 flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold text-primary-foreground transition-all hover:scale-105 active:scale-95"
                style={{ background: 'var(--color-primary)' }}>
                <Play className="w-3.5 h-3.5 fill-current" />
                Watch from Ep 1
              </button>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Episode grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-10 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-muted-foreground text-sm">Loading episodes…</span>
            </div>
          )}

          {error && (
            <div className="text-center py-10">
              <p className="text-red-400 text-sm font-medium">Failed to load episodes</p>
              <p className="text-muted-foreground text-xs mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && episodes.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-10">No episodes found.</p>
          )}

          {!loading && !error && episodes.length > 0 && (
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {episodes.map((ep) => (
                <button
                  key={ep}
                  onClick={() => onWatch(ep, episodes)}
                  className="aspect-square rounded-lg text-sm font-medium transition-all hover:scale-110 active:scale-95 hover:ring-2 hover:ring-primary/60"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--color-foreground)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                >
                  {ep}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
