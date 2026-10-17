import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  X, Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Loader2, ChevronLeft, ChevronRight,
  RotateCcw, ShieldAlert, Server, Download, Check
} from 'lucide-react';
import type { StreamSource } from '@/lib/api';

interface VideoPlayerProps {
  streamUrl: string;
  title: string;
  episode: string;
  totalEpisodes: string[];
  onClose: () => void;
  onEpisodeChange: (ep: string) => void;
  onTryNextSource: () => void;
  onSourceChange: (index: number) => void;
  currentSourceIndex: number;
  allSources: StreamSource[];
  hasMoreSources: boolean;
  loading: boolean;
  error: string | null;
}

export function VideoPlayer({
  streamUrl, title, episode, totalEpisodes,
  onClose, onEpisodeChange, onTryNextSource,
  onSourceChange, currentSourceIndex, allSources,
  hasMoreSources, loading, error
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [currentQuality, setCurrentQuality] = useState('Auto');
  const [showSourceGuide, setShowSourceGuide] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentSubtitleLabel, setCurrentSubtitleLabel] = useState('Off');

  useEffect(() => {
    const subs = allSources?.[currentSourceIndex]?.subtitles || [];
    if (subs.length > 0 && currentSubtitleLabel === 'Off') {
      const defSub = subs.find(s => s.default) || 
                     subs.find(s => s.label.toLowerCase().includes('english')) || 
                     subs[0];
      if (defSub) setCurrentSubtitleLabel(defSub.label);
    }
  }, [allSources, currentSourceIndex]);

  const currentEpIndex = totalEpisodes.indexOf(episode);
  const hasPrev = currentEpIndex > 0;
  const hasNext = currentEpIndex < totalEpisodes.length - 1;

  const isIframe = streamUrl && !streamUrl.includes('.m3u8') && !streamUrl.includes('.mp4') && !streamUrl.includes('/api/proxy');

  const parsedCuesRef = useRef<{start: number, end: number, text: string}[]>([]);
  const [activeSubtitleText, setActiveSubtitleText] = useState("");

  // Parse VTT manually to bypass all Chromium MSE <track> bugs completely
  useEffect(() => {
    parsedCuesRef.current = [];
    setActiveSubtitleText("");
    
    if (currentSubtitleLabel === 'Off') return;
    
    const subs = allSources[currentSourceIndex]?.subtitles || [];
    const targetSub = subs.find(s => s.label === currentSubtitleLabel) || subs.find(s => s.default) || subs[0];
    if (!targetSub) return;
    
    let isActive = true;
    
    const loadSubtitles = async () => {
      try {
        let text = '';
        if (targetSub.url.startsWith('file://')) {
          const filePath = targetSub.url.replace('file://', '');
          // @ts-ignore
          const res = await window.electron.invoke('read-local-file', filePath);
          if (!res.success) throw new Error(res.error);
          text = res.data;
        } else {
          const response = await fetch(targetSub.url);
          text = await response.text();
        }
        
        if (!isActive) return;
        const lines = text.split('\n');
        const cues: {start: number, end: number, text: string}[] = [];
        let currentCue: any = null;
        
        const parseTime = (t: string) => {
          const parts = t.replace(',', '.').trim().split(':');
          if (parts.length === 3) return parseFloat(parts[0])*3600 + parseFloat(parts[1])*60 + parseFloat(parts[2]);
          if (parts.length === 2) return parseFloat(parts[0])*60 + parseFloat(parts[1]);
          return 0;
        };
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.includes('-->')) {
            const parts = line.split('-->');
            currentCue = { start: parseTime(parts[0]), end: parseTime(parts[1]), text: '' };
            cues.push(currentCue);
          } else if (currentCue && line && !line.includes('WEBVTT')) {
            currentCue.text += (currentCue.text ? '\n' : '') + line;
          } else if (!line) {
            currentCue = null;
          }
        }
        parsedCuesRef.current = cues;
        
        // Debug telemetry
        fetch(`http://127.0.0.1:3001/api/ping?msg=${encodeURIComponent('VTT Parsed. Count: ' + cues.length + ' First: ' + (cues[0]?.text || 'none'))}`).catch(()=>{});
      } catch (err: any) {
        if (!isActive) return;
        console.error("Failed to parse VTT", err);
        fetch(`http://127.0.0.1:3001/api/ping?msg=${encodeURIComponent('VTT Failed: ' + err.message)}`).catch(()=>{});
      }
    };
    
    loadSubtitles();
      
    return () => { isActive = false; };
  }, [allSources, currentSourceIndex, currentSubtitleLabel]);

  // Auto-select default subtitle when source changes
  useEffect(() => {
    const subs = allSources?.[currentSourceIndex]?.subtitles || [];
    if (subs.length > 0 && currentSubtitleLabel === 'Off') {
      const defSub = subs.find(s => s.default) || subs.find(s => s.label === 'English') || subs[0];
      setCurrentSubtitleLabel(defSub.label);
    } else if (subs.length > 0 && !subs.find(s => s.label === currentSubtitleLabel)) {
      const defSub = subs.find(s => s.default) || subs.find(s => s.label === 'English') || subs[0];
      setCurrentSubtitleLabel(defSub.label);
    }
  }, [allSources, currentSourceIndex]);

  // Enforce subtitle track visibility continuously
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const enforceTracks = () => {
      const tracks = video.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        // Hls.js might inject empty tracks, so match by label instead of index
        if (currentSubtitleLabel === 'Off') {
          tracks[i].mode = 'hidden';
        } else {
          tracks[i].mode = (tracks[i].label === currentSubtitleLabel) ? 'showing' : 'hidden';
        }
      }
    };
    
    enforceTracks();
    const intervalId = setInterval(enforceTracks, 1000);
    return () => clearInterval(intervalId);
  }, [currentSubtitleLabel, allSources, currentSourceIndex, streamUrl]);

  // Load stream into video element with HLS.js
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl || loading) return;

    // Cleanup previous instance
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    setAvailableQualities([]);
    setCurrentQuality('Auto');

    const isHls = streamUrl.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const levels = data.levels.map(l => l.height + 'p');
        setAvailableQualities(['Auto', ...new Set(levels)]);
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('[HLS Error]', data);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !isHls) {
      // Native HLS (Safari) or direct MP4
      video.src = streamUrl;
      video.play().catch(() => {});
    }

    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
  }, [streamUrl, loading]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);
      setProgress(video.duration ? (time / video.duration) * 100 : 0);
      
      if (parsedCuesRef.current.length > 0) {
        const cue = parsedCuesRef.current.find(c => time >= c.start && time <= c.end);
        if (cue && activeSubtitleText !== cue.text) {
           fetch(`http://127.0.0.1:3001/api/ping?msg=${encodeURIComponent('Setting subtitle: ' + cue.text + ' at ' + time)}`).catch(()=>{});
        }
        setActiveSubtitleText(cue ? cue.text : "");
      }
    };
    const onDuration = () => setDuration(video.duration);
    const onWaiting = () => setBuffering(true);
    const onCanPlay = () => setBuffering(false);
    const onError = () => {
      console.error('[Video Error] Playback failed, trying next source...');
      if (hasMoreSources) onTryNextSource();
    };
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('error', onError);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onError);
    };
  }, [onTryNextSource, hasMoreSources]);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Auto-hide the source guide after 8 seconds
  useEffect(() => {
    if (showSourceGuide) {
      const timer = setTimeout(() => {
        setShowSourceGuide(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showSourceGuide]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowRight') { video.currentTime += 10; }
      if (e.key === 'ArrowLeft') { video.currentTime -= 10; }
      if (e.key === 'f') { toggleFullscreen(); }
      if (e.key === 'm') { toggleMute(); }
      if (e.key === 'Escape') { onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing]);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (showSourceGuide) return; // Keep controls visible while guide is active
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }, [showSourceGuide]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    playing ? v.pause() : v.play().catch(() => {});
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * v.duration;
  };

  const handleQualityChange = (q: string) => {
    setCurrentQuality(q);
    if (!hlsRef.current) return;
    if (q === 'Auto') {
      hlsRef.current.currentLevel = -1;
    } else {
      const levelIndex = hlsRef.current.levels.findIndex(l => l.height + 'p' === q);
      if (levelIndex !== -1) hlsRef.current.currentLevel = levelIndex;
    }
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const currentSource = allSources[currentSourceIndex] || { url: streamUrl, headers: {} };
      const currentSub = currentSource.subtitles?.find(s => s.label === currentSubtitleLabel) 
                      || currentSource.subtitles?.find(s => s.default) 
                      || currentSource.subtitles?.[0];
                      
      // @ts-ignore
      const res = await window.electron.invoke('start-download', {
        id: Date.now().toString(),
        videoUrl: currentSource.url || streamUrl,
        subtitleUrl: currentSub ? currentSub.url : undefined,
        title: `${title} - Episode ${episode}`,
        headers: currentSource.headers || {}
      });
      if (res && res.error) {
        console.error('Download start error:', res.error);
      }
      setTimeout(() => setIsDownloading(false), 2000);
    } catch (err) {
      console.error('Failed to trigger download', err);
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" ref={containerRef}
      onMouseMove={resetControlsTimer} onClick={resetControlsTimer}>

      {/* Video element */}
      <div className="flex-1 relative flex items-center justify-center" onClick={!isIframe ? togglePlay : undefined}>
        {isIframe ? (
          <iframe
            src={streamUrl}
            className="w-full h-full border-0 bg-black"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            // More permissive sandbox to avoid 'sad face' errors
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              playsInline
              preload="auto"
            />
            
          </>
        )}

        {/* Loading / Buffering overlay */}
        {(loading || buffering) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-white/70 text-sm">{loading ? 'Fetching stream…' : 'Buffering…'}</p>
          </div>
        )}

        {/* Error overlay */}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-1">
              <p className="text-white font-semibold text-lg">Playback Issue Detected</p>
              <p className="text-white/60 text-sm max-w-sm">{error}</p>
            </div>
            
            {hasMoreSources ? (
              <button
                onClick={onTryNextSource}
                className="mt-2 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 active:scale-95 font-semibold rounded-lg text-sm flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
              >
                <Server className="w-4 h-4" />
                Try Next Mirror / API ({currentSourceIndex + 2}/{allSources.length})
              </button>
            ) : (
              <p className="text-white/40 text-xs">No more sources available for this episode.</p>
            )}
          </div>
        )}

        {/* Big play icon flash (Only for HLS/Direct) */}
        {!playing && !loading && !error && !isIframe && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
              <Play className="w-10 h-10 text-white fill-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Download Started Popup */}
      {isDownloading && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-300">
          <div className="bg-black/80 backdrop-blur-md px-8 py-6 rounded-3xl flex flex-col items-center gap-4 border border-white/10 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
              <Download className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-white font-black text-xl mb-1 tracking-wide">Download Started</p>
              <p className="text-white/60 text-sm font-medium">Check the Downloads Library for progress</p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Subtitle Overlay (Moved outside video container to prevent hardware layer overlap) */}
      {activeSubtitleText && (
        <div className="absolute bottom-[12%] left-0 right-0 pointer-events-none flex justify-center px-8 z-[9999] transform-gpu">
          <div 
            className="text-white text-center font-bold tracking-wide"
            style={{
              fontSize: 'clamp(14px, 2.5vw, 32px)',
              lineHeight: '1.2',
              textShadow: '0px 0px 6px rgba(0,0,0,0.9), 0px 0px 2px rgba(0,0,0,1), 2px 2px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)',
              whiteSpace: 'pre-wrap'
            }}
            dangerouslySetInnerHTML={{ __html: activeSubtitleText }}
          />
        </div>
      )}

      {/* Controls bar — fades in/out (Disabled for iframes) */}
      {!isIframe && (
        <div className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 50%, transparent 100%)' }}>

        {/* Next Mirror Guide Tooltip */}
        {showSourceGuide && allSources.length > 1 && (
          <div className="absolute bottom-20 right-4 lg:right-64 z-[70] max-w-xs animate-bounce bg-gradient-to-br from-primary/95 via-primary/90 to-primary/80 text-primary-foreground p-3.5 rounded-xl shadow-2xl border border-primary/30 backdrop-blur-md">
            {/* Arrow pointing down */}
            <div className="absolute -bottom-1.5 right-12 w-3 h-3 bg-primary/90 rotate-45" />
            <div className="flex flex-col gap-1.5 text-left relative">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[10px] uppercase tracking-wider text-white/90">Tip: Slow Stream?</span>
                <button onClick={(e) => { e.stopPropagation(); setShowSourceGuide(false); }} className="text-white/70 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] font-medium leading-relaxed text-white/95">
                If the video is not playing or loading slowly, switch to the next mirror or API using this button.
              </p>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="px-4 pt-6 pb-2 cursor-pointer" onClick={seek}>
          <div className="relative h-1.5 bg-white/20 rounded-full group hover:h-2.5 transition-all">
            <div
              className="absolute left-0 top-0 h-full bg-primary rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Buttons row */}
        <div className="flex items-center gap-3 px-4 pb-4">
          {/* Prev episode */}
          <button onClick={() => hasPrev && onEpisodeChange(totalEpisodes[currentEpIndex - 1])}
            disabled={!hasPrev}
            className="text-white/70 hover:text-white disabled:opacity-30 transition-colors">
            <SkipBack className="w-5 h-5" />
          </button>

          {/* Play/Pause */}
          <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
            {playing ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 fill-current" />}
          </button>

          {/* Next episode */}
          <button onClick={() => hasNext && onEpisodeChange(totalEpisodes[currentEpIndex + 1])}
            disabled={!hasNext}
            className="text-white/70 hover:text-white disabled:opacity-30 transition-colors">
            <SkipForward className="w-5 h-5" />
          </button>

          {/* Skip buttons */}
          <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }}
            className="text-white/60 hover:text-white text-xs transition-colors flex items-center gap-0.5">
            <ChevronLeft className="w-3 h-3" />10s
          </button>
          <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }}
            className="text-white/60 hover:text-white text-xs transition-colors flex items-center gap-0.5">
            10s<ChevronRight className="w-3 h-3" />
          </button>

          {/* Time */}
          <span className="text-white/60 text-xs ml-1 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          <div className="hidden lg:flex flex-col items-center">
            <span className="text-white/80 text-sm font-medium truncate max-w-[200px]">
              {title} — Ep {episode}
            </span>
            {allSources[currentSourceIndex]?.provider && (
              <span className="text-primary text-[10px] font-semibold uppercase tracking-wider opacity-85 mt-0.5">
                Provider: {allSources[currentSourceIndex].provider}
              </span>
            )}
          </div>

          <div className="flex-1" />



          {/* Next Mirror / API Button */}
          {allSources.length > 1 && (
            <button
              onClick={() => {
                const nextIndex = (currentSourceIndex + 1) % allSources.length;
                onSourceChange(nextIndex);
              }}
              title={`Switch to next mirror/API. Current: ${allSources[currentSourceIndex]?.provider || 'Unknown'} (${allSources[currentSourceIndex]?.quality || 'Auto'})`}
              className="flex items-center gap-1.5 bg-primary/20 hover:bg-primary/30 active:scale-95 text-primary text-[10px] font-bold py-1.5 px-3 rounded border border-primary/30 transition-all uppercase tracking-wider"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Next Mirror ({currentSourceIndex + 1}/{allSources.length})</span>
            </button>
          )}

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            title="Download Episode"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-all text-[10px] font-bold uppercase tracking-wider ${isDownloading ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30'}`}
          >
            {isDownloading ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isDownloading ? 'Downloading' : 'Download'}</span>
          </button>

          {/* Quality Selector (HLS levels or single quality) */}
          {!isIframe && (
            <div className="flex items-center bg-primary/20 hover:bg-primary/30 rounded border border-primary/30 px-2 mr-1 transition-all">
              <span className="text-primary text-[8px] font-black uppercase mr-2 opacity-60">Quality</span>
              <select
                value={currentQuality}
                onChange={(e) => handleQualityChange(e.target.value)}
                className="bg-transparent text-primary text-[10px] font-bold py-1.5 outline-none cursor-pointer appearance-none uppercase tracking-wider"
              >
                {availableQualities.length > 1 ? (
                  availableQualities.map((q) => (
                    <option key={q} value={q} className="bg-black text-white">
                      {q}
                    </option>
                  ))
                ) : (
                  <option value={allSources[currentSourceIndex]?.quality || 'Auto'} className="bg-black text-white">
                    {allSources[currentSourceIndex]?.quality || 'Auto'}
                  </option>
                )}
              </select>
            </div>
          )}

          {/* Subtitles Selector */}
          {!isIframe && allSources[currentSourceIndex]?.subtitles && allSources[currentSourceIndex].subtitles.length > 0 && (
            <div className="flex items-center bg-primary/20 hover:bg-primary/30 rounded border border-primary/30 px-2 mr-1 transition-all">
              <span className="text-primary text-[8px] font-black uppercase mr-2 opacity-60">CC</span>
              <select
                value={currentSubtitleLabel}
                onChange={(e) => setCurrentSubtitleLabel(e.target.value)}
                className="bg-transparent text-primary text-[10px] font-bold py-1.5 outline-none cursor-pointer appearance-none uppercase tracking-wider"
              >
                <option value="Off" className="bg-black text-white">Off</option>
                {allSources[currentSourceIndex].subtitles.map((sub, idx) => (
                  <option key={idx} value={sub.label} className="bg-black text-white">
                    {sub.label}
                  </option>
                ))}
              </select>
            </div>
          )}



          {/* Volume */}
          <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors">
            {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          {/* Close */}
          <button onClick={onClose}
            className="ml-2 text-white/70 hover:text-red-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      )}

      {/* Top bar — title + close (Only for HLS/Direct) */}
      {!isIframe && (
        <div className={`absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)' }}>
        <div className="flex items-center gap-3">
          <div>
            <p className="text-white font-semibold text-sm">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-white/50 text-xs">Episode {episode}</p>
              {allSources[currentSourceIndex]?.provider && (
                <>
                  <span className="text-white/20 text-xs">•</span>
                  <span className="text-primary font-medium text-xs">Mirror: {allSources[currentSourceIndex].provider}</span>
                </>
              )}
            </div>
          </div>

        </div>
        <button onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
      )}

      {/* Persistent Title / Info for Iframes */}
      {isIframe && (
        <div className="absolute top-4 left-4 z-[60] bg-black/60 px-4 py-2 rounded-lg border border-white/10 shadow-xl pointer-events-none">
          <p className="text-white font-semibold text-sm">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-white/50 text-xs">Episode {episode}</p>
            {allSources[currentSourceIndex]?.provider && (
              <>
                <span className="text-white/20 text-xs">•</span>
                <span className="text-primary font-medium text-xs">Mirror: {allSources[currentSourceIndex].provider}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Persistent Controls for Iframes */}
      {isIframe && (
        <div className="absolute top-4 right-4 z-[60] flex items-center gap-2">
          {/* Iframe Guide Tooltip */}
          {showSourceGuide && allSources.length > 1 && (
            <div className="absolute top-12 right-28 z-[70] max-w-xs animate-bounce bg-gradient-to-br from-primary/95 via-primary/90 to-primary/80 text-primary-foreground p-3.5 rounded-xl shadow-2xl border border-primary/30 backdrop-blur-md w-60">
              {/* Arrow pointing right/up */}
              <div className="absolute -top-1.5 right-6 w-3 h-3 bg-primary/90 rotate-45" />
              <div className="flex flex-col gap-1.5 text-left relative">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[10px] uppercase tracking-wider text-white/90">Tip: Slow Stream?</span>
                  <button onClick={(e) => { e.stopPropagation(); setShowSourceGuide(false); }} className="text-white/70 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] font-medium leading-relaxed text-white/95">
                  If the video is not playing or loading slowly, switch to the next mirror or API using this button.
                </p>
              </div>
            </div>
          )}
          {allSources.length > 1 && (
            <button onClick={() => {
              const nextIndex = (currentSourceIndex + 1) % allSources.length;
              onSourceChange(nextIndex);
            }}
              title={`Switch to next mirror/API (Current: ${allSources[currentSourceIndex]?.provider || 'Unknown'})`}
              className="h-10 px-4 rounded-full bg-black/60 hover:bg-primary hover:text-primary-foreground active:scale-95 flex items-center gap-2 text-white font-semibold text-xs transition-all border border-white/20 shadow-xl"
            >
              <Server className="w-4 h-4" />
              <span>Next Mirror ({currentSourceIndex + 1}/{allSources.length})</span>
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            title="Download Episode"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border border-white/20 shadow-xl ${isDownloading ? 'bg-green-500/80' : 'bg-black/60 hover:bg-primary'}`}
          >
            {isDownloading ? <Check className="w-5 h-5 text-white" /> : <Download className="w-5 h-5 text-white" />}
          </button>
          <button onClick={onClose}
            title="Close player"
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-red-500/80 flex items-center justify-center transition-all border border-white/20 shadow-xl"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
