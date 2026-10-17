import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { AnimeRow } from '@/components/anime/AnimeRow';
import { HeroSlideshow } from '@/components/anime/HeroSlideshow';
import { api } from '@/lib/api';
import type { AnimeItem } from '@/lib/api';

interface HomeViewProps {
  onCardClick?: (anime: AnimeItem) => void;
  playerOpen?: boolean;
}

export function HomeView({ onCardClick, playerOpen }: HomeViewProps) {
  const [hero, setHero] = useState<AnimeItem[]>([]);
  const [trending, setTrending] = useState<AnimeItem[]>([]);
  const [shonen, setShonen] = useState<AnimeItem[]>([]);
  const [sliceOfLife, setSliceOfLife] = useState<AnimeItem[]>([]);
  const [sciFi, setSciFi] = useState<AnimeItem[]>([]);
  const [history, setHistory] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [trendList, actionList, solList, fantasyList, historyList] = await Promise.all([
          api.trending({ limit: 20 }),
          api.trending({ limit: 16, genre: 'Action' }),
          api.trending({ limit: 16, genre: 'Slice of Life' }),
          api.trending({ limit: 16, genre: 'Fantasy' }),
          api.history().catch(() => [])
        ]);

        if (cancelled) return;

        const heroSlides = trendList.filter(a => a.banner && a.banner !== a.coverImage).slice(0, 5);

        setHero(heroSlides.length >= 2 ? heroSlides : trendList.slice(0, 3));
        setTrending(trendList);
        setShonen(actionList);
        setSliceOfLife(solList);
        setSciFi(fantasyList);
        setHistory(historyList);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (playerOpen === false) {
      api.history().then(setHistory).catch(console.error);
    }
  }, [playerOpen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-xl font-bold text-foreground">Could not connect to server</p>
        <p className="text-muted-foreground text-sm max-w-md">
          Make sure the API server is running:<br />
          <code className="text-primary">node server/index.mjs</code>
        </p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <HeroSlideshow slides={hero} onCardClick={onCardClick} />


      <div className="-mt-12 relative z-10">
        {history.length > 0 && (
          <AnimeRow 
            title="Continue Watching" 
            subtitle="Resume where you left off"
          >
            {history.map((item) => (
              <AnimeCard key={item.id} anime={item} onCardClick={onCardClick} />
            ))}
          </AnimeRow>
        )}

        <AnimeRow title="Trending Now" subtitle="What everyone is watching">
          {trending.map((item) => (
            <AnimeCard key={item.id} anime={item} onCardClick={onCardClick} />
          ))}
        </AnimeRow>

        <AnimeRow title="Shounen & Action" subtitle="The blades everyone is talking about">
          {shonen.map((item) => (
            <AnimeCard key={item.id} anime={item} onCardClick={onCardClick} />
          ))}
        </AnimeRow>

        <AnimeRow title="Slice of Life" subtitle="Slow afternoons, warm hearts">
          {sliceOfLife.map((item) => (
            <AnimeCard key={item.id} anime={item} onCardClick={onCardClick} />
          ))}
        </AnimeRow>

        <AnimeRow title="Fantasy & Supernatural" subtitle="Neon skies and ancient spirits">
          {sciFi.map((item) => (
            <AnimeCard key={item.id} anime={item} onCardClick={onCardClick} />
          ))}
        </AnimeRow>
      </div>
    </div>
  );
}
