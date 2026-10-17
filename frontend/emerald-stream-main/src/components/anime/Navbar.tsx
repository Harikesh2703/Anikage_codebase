import { useState, useRef, useEffect } from 'react';
import { Search, Home, BarChart3, Bell, X, Loader2, Settings, Download } from 'lucide-react';
import type { AppView } from '@/components/anime/types';
import { api } from '@/lib/api';
import type { AnimeItem } from '@/lib/api';
import { AnimeCard } from '@/components/anime/AnimeCard';

interface NavbarProps {
  view: AppView;
  onNavigate: (view: AppView) => void;
  onCardClick?: (anime: AnimeItem) => void;
  onSignOut?: () => void;
  hasNotifications?: boolean;
}

export function Navbar({ view, onNavigate, onCardClick, hasNotifications }: NavbarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setResults([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.search(value);
        setResults(res.slice(0, 8));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="flex items-center gap-6 px-6 md:px-10 h-16">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 group shrink-0"
        >
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-[var(--shadow-glow)]">
            <span className="text-primary-foreground font-black text-sm">愛</span>
          </div>
          <span className="text-lg font-black tracking-tight text-foreground">Anikage</span>
        </button>

        {/* Search */}
        {view === 'home' && (
          <div className="flex-1 max-w-xl mx-auto hidden md:flex relative" ref={dropdownRef}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleInput(e.target.value)}
                onFocus={() => results.length > 0 && setOpen(true)}
                placeholder="Search anime..."
                className="w-full bg-card border border-border rounded-full pl-10 pr-8 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary transition"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
              )}
              {!searching && query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown results */}
            {open && results.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-card border border-border rounded-2xl shadow-[var(--shadow-card)] overflow-hidden z-50">
                <div className="p-3 flex flex-wrap gap-3 max-h-[420px] overflow-y-auto">
                  {results.map(anime => (
                    <AnimeCard 
                      key={anime.id} 
                      anime={anime} 
                      className="!w-[130px]" 
                      onCardClick={(a) => {
                        onCardClick?.(a);
                        setOpen(false);
                        setQuery('');
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <nav className="flex items-center gap-1 ml-auto">
          <NavIcon label="Home" active={view === 'home'} onClick={() => onNavigate('home')}>
            <Home className="w-5 h-5" />
          </NavIcon>
          <NavIcon label="Analytics" active={view === 'analytics'} onClick={() => onNavigate('analytics')}>
            <BarChart3 className="w-5 h-5" />
          </NavIcon>
          <NavIcon label="Downloads" active={view === 'downloads'} onClick={() => onNavigate('downloads')}>
            <Download className="w-5 h-5" />
          </NavIcon>
          <NavIcon 
            label="Notifications" 
            active={view === 'notifications'} 
            onClick={() => onNavigate('notifications')}
          >
            <div className="relative">
              <Bell className="w-5 h-5" />
              {hasNotifications && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-red-500 rounded-full border border-background shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              )}
            </div>
          </NavIcon>
          <NavIcon label="Settings" active={view === 'settings'} onClick={() => onNavigate('settings')}>
            <Settings className="w-5 h-5" />
          </NavIcon>
        </nav>
      </div>
    </header>
  );
}

interface NavIconProps {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function NavIcon({ label, active, onClick, children }: NavIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative h-10 w-10 rounded-full flex items-center justify-center transition ${
        active
          ? 'text-primary bg-primary/10'
          : 'text-muted-foreground hover:text-primary hover:bg-card'
      }`}
    >
      {children}
      {active && (
        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_var(--primary-glow)]" />
      )}
    </button>
  );
}
