'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, AlertTriangle, FastForward } from 'lucide-react';
import { Track, usePlayer } from '../hooks/usePlayer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DiscoveryPromptProps {
  candidateA: Track;
  candidateB: Track;
  sessionId: string;
  onResolve: (chosenTrackId?: string) => void;
}

export function DiscoveryPrompt({
  candidateA,
  candidateB,
  sessionId,
  onResolve,
}: DiscoveryPromptProps) {
  const [promptId] = useState(() => Math.random().toString(36).substring(7));
  const startTimeRef = useRef<number>(0);
  const [playingSide, setPlayingSide] = useState<'A' | 'B' | null>(null);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Track preview durations for analytics
  const previewStartRef = useRef<{ side: 'A' | 'B'; time: number } | null>(null);
  const previewDurationsRef = useRef<{ A: number; B: number }>({ A: 0, B: 0 });

  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);

  const handleChoice = React.useCallback(async (chosenTrackId?: string) => {
    // Flush current hover timings
    if (previewStartRef.current) {
      const side = previewStartRef.current.side;
      const duration = Date.now() - previewStartRef.current.time;
      previewDurationsRef.current[side] += duration;
    }

    const latencyMs = Date.now() - startTimeRef.current;

    // Call choice endpoint
    try {
      const res = await fetch(`${API_BASE}/discovery/choice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          sessionId,
          promptId,
          candidateAId: candidateA.id,
          candidateBId: candidateB.id,
          chosenTrackId,
          latencyMs,
          previewBehavior: {
            previewDurationAMs: previewDurationsRef.current.A,
            previewDurationBMs: previewDurationsRef.current.B,
          },
        }),
      });

      if (res.ok) {
        onResolve(chosenTrackId);
      }
    } catch (err) {
      console.error('Failed to submit choice', err);
      // Fallback local resolve if API fails
      onResolve(chosenTrackId);
    }
  }, [candidateA.id, candidateB.id, onResolve, promptId, sessionId]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    
    // Instantiate separate hidden audio previews
    audioARef.current = new Audio(candidateA.audioUrl);
    audioBRef.current = new Audio(candidateB.audioUrl);

    // Close on escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        void handleChoice(candidateA.id);
      } else if (e.key === 'ArrowRight') {
        void handleChoice(candidateB.id);
      } else if (e.key === 'Escape' || e.key === 'ArrowDown') {
        void handleChoice(undefined); // skip
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      audioARef.current?.pause();
      audioBRef.current?.pause();
    };
  }, [candidateA, candidateB, handleChoice]);

  // Track hover preview timing
  const handleHoverStart = (side: 'A' | 'B') => {
    // Pause other side
    if (side === 'A') {
      audioBRef.current?.pause();
      audioARef.current?.play().catch(() => {});
      setPlayingSide('A');
    } else {
      audioARef.current?.pause();
      audioBRef.current?.play().catch(() => {});
      setPlayingSide('B');
    }

    previewStartRef.current = { side, time: Date.now() };
  };

  const handleHoverEnd = (side: 'A' | 'B') => {
    if (side === 'A') {
      audioARef.current?.pause();
    } else {
      audioBRef.current?.pause();
    }
    setPlayingSide(null);

    if (previewStartRef.current && previewStartRef.current.side === side) {
      const duration = Date.now() - previewStartRef.current.time;
      previewDurationsRef.current[side] += duration;
      previewStartRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-fade-in text-white select-none">
      {/* Header bar */}
      <header className="flex h-16 items-center justify-between px-8 bg-zinc-950/40">
        <span className="text-sm font-bold tracking-widest text-spotify uppercase">ADAPTIVE DISCOVERY</span>
        <button
          onClick={() => handleChoice(undefined)}
          className="flex items-center gap-2 text-xs font-bold text-muted hover:text-white transition-colors uppercase border border-zinc-800 px-4 py-1.5 rounded-full hover:border-white"
        >
          <FastForward className="h-3.5 w-3.5" />
          Skip Both
        </button>
      </header>

      {/* Main Choice Section */}
      <div className={`flex flex-1 overflow-hidden ${isPortrait ? 'flex-col' : 'flex-row'}`}>
        {/* Left Side: Candidate A */}
        <div
          onMouseEnter={() => handleHoverStart('A')}
          onMouseLeave={() => handleHoverEnd('A')}
          onClick={() => handleChoice(candidateA.id)}
          className="flex flex-1 flex-col items-center justify-center p-8 border-b sm:border-b-0 sm:border-r border-zinc-800/50 cursor-pointer transition-all hover:bg-zinc-900/40 group relative overflow-hidden"
        >
          <div className="relative aspect-square w-48 overflow-hidden rounded-xl shadow-2xl bg-zinc-900 group-hover:scale-105 transition-transform duration-300">
            {candidateA.album?.artUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={candidateA.album.artUrl}
                alt={candidateA.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl">🎵</div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {playingSide === 'A' ? (
                <Pause className="h-10 w-10 text-spotify fill-current" />
              ) : (
                <Play className="h-10 w-10 text-white fill-current ml-1" />
              )}
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-white mt-6 text-center group-hover:text-spotify transition-colors">
            {candidateA.title}
          </h3>
          <p className="text-sm text-muted mt-1 text-center">
            {candidateA.artist?.name || 'Unknown Artist'}
          </p>

          <span className="absolute bottom-6 text-[10px] uppercase font-semibold text-muted tracking-widest sm:hidden group-hover:block">
            Hover to Preview · Click to Choose
          </span>
        </div>

        {/* Right Side: Candidate B */}
        <div
          onMouseEnter={() => handleHoverStart('B')}
          onMouseLeave={() => handleHoverEnd('B')}
          onClick={() => handleChoice(candidateB.id)}
          className="flex flex-1 flex-col items-center justify-center p-8 cursor-pointer transition-all hover:bg-zinc-900/40 group relative overflow-hidden"
        >
          <div className="relative aspect-square w-48 overflow-hidden rounded-xl shadow-2xl bg-zinc-900 group-hover:scale-105 transition-transform duration-300">
            {candidateB.album?.artUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={candidateB.album.artUrl}
                alt={candidateB.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl">🎵</div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {playingSide === 'B' ? (
                <Pause className="h-10 w-10 text-spotify fill-current" />
              ) : (
                <Play className="h-10 w-10 text-white fill-current ml-1" />
              )}
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mt-6 text-center group-hover:text-spotify transition-colors">
            {candidateB.title}
          </h3>
          <p className="text-sm text-muted mt-1 text-center">
            {candidateB.artist?.name || 'Unknown Artist'}
          </p>

          <span className="absolute bottom-6 text-[10px] uppercase font-semibold text-muted tracking-widest sm:hidden group-hover:block">
            Hover to Preview · Click to Choose
          </span>
        </div>
      </div>

      {/* Footer / Instructions */}
      <footer className="h-16 flex items-center justify-center bg-zinc-950/40 text-xs text-muted">
        Use keyboard arrows: ← Left Choice · Right Choice → · Esc / ↓ to Skip
      </footer>
    </div>
  );
}
