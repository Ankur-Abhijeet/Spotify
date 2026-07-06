'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Heart,
  Settings,
} from 'lucide-react';
import { usePlayer } from '../hooks/usePlayer';
import { useAuth } from '../hooks/useAuth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    crossfade,
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    setCrossfade,
  } = usePlayer();

  const { isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const checkPremium = () => {
      setIsPremium(localStorage.getItem('is_premium_active') === 'true');
    };
    checkPremium();
    window.addEventListener('storage', checkPremium);
    return () => window.removeEventListener('storage', checkPremium);
  }, []);

  // Check if track is liked when currentTrack changes
  const getSafeAccessToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  };

  useEffect(() => {
    if (isAuthenticated && currentTrack) {
      const checkLiked = async () => {
        try {
          const token = getSafeAccessToken();
          if (!token) return;
          const res = await fetch(`${API_BASE}/library`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const likedList = data.likedTracks || [];
            setIsLiked(likedList.some((t: any) => t.id === currentTrack.id));
          }
        } catch {}
      };
      checkLiked();
    } else {
      setIsLiked(false);
    }
  }, [currentTrack, isAuthenticated]);

  const handleLikeToggle = async () => {
    if (!isAuthenticated || !currentTrack) return;

    try {
      const token = getSafeAccessToken();
      if (!token) return;
      const method = isLiked ? 'DELETE' : 'POST';
      const res = await fetch(`${API_BASE}/library/like/${currentTrack.id}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setIsLiked(!isLiked);
      }
    } catch (err) {
      console.error('Failed to toggle like', err);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!currentTrack) {
    return (
      <div className="flex h-20 items-center justify-center border-t border-zinc-800 bg-zinc-950 px-4 text-xs text-muted">
        Select a song from Home or Search to start playing.
      </div>
    );
  }

  return (
    <footer className="relative flex h-24 items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 select-none">
      {/* Left: Track Details */}
      <div className="flex w-1/3 items-center gap-4">
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded bg-zinc-800">
          {currentTrack.album?.artUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentTrack.album.artUrl}
              alt={currentTrack.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-600">🎵</div>
          )}
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-white hover:underline cursor-pointer">
              {currentTrack.title}
            </p>
            {!isPremium && (
              <span className="rounded bg-spotify/10 border border-spotify/20 px-1 py-0.5 text-[7px] font-black uppercase text-spotify tracking-wide">
                Free
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted hover:text-white hover:underline cursor-pointer">
            {currentTrack.artist?.name || 'Unknown Artist'}
          </p>
        </div>
        {isAuthenticated && (
          <button
            onClick={handleLikeToggle}
            className={`transition-transform hover:scale-105 active:scale-95 ${
              isLiked ? 'text-spotify' : 'text-muted hover:text-white'
            }`}
          >
            <Heart className="h-5 w-5" fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      {/* Center: Playback Controls */}
      <div className="flex w-1/3 flex-col items-center gap-2">
        <div className="flex items-center gap-6">
          <button
            onClick={toggleShuffle}
            className={`transition-colors ${shuffle ? 'text-spotify' : 'text-muted hover:text-white'}`}
          >
            <Shuffle className="h-4 w-4" />
          </button>
          <button onClick={prev} className="text-muted transition-colors hover:text-white">
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            onClick={togglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
          </button>
          <button onClick={next} className="text-muted transition-colors hover:text-white">
            <SkipForward className="h-5 w-5" />
          </button>
          <button
            onClick={toggleRepeat}
            className={`relative transition-colors ${
              repeat !== 'off' ? 'text-spotify' : 'text-muted hover:text-white'
            }`}
          >
            <Repeat className="h-4 w-4" />
            {repeat === 'one' && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-spotify text-[8px] font-black text-black">
                1
              </span>
            )}
          </button>
        </div>

        {/* Scrubber Bar */}
        <div className="flex w-full items-center gap-2 text-xs text-muted">
          <span>{formatTime(position)}</span>
          <div className="relative group flex-1 h-1.5 rounded-full bg-zinc-800 cursor-pointer">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={position}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
              className="h-full rounded-full bg-white group-hover:bg-spotify"
              style={{ width: `${(position / (duration || 1)) * 100}%` }}
            />
          </div>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Audio Settings */}
      <div className="relative flex w-1/3 items-center justify-end gap-4">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`transition-colors ${showSettings ? 'text-spotify' : 'text-muted hover:text-white'}`}
          title="Playback settings"
        >
          <Settings className="h-5 w-5" />
        </button>

        {/* Volume Controls */}
        <div className="flex items-center gap-2">
          <button onClick={toggleMute} className="text-muted transition-colors hover:text-white">
            {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <div className="relative w-24 h-1 rounded-full bg-zinc-800">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
              className="h-full rounded-full bg-white hover:bg-spotify"
              style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
            />
          </div>
        </div>

        {/* Settings Popover */}
        {showSettings && (
          <div className="absolute right-0 bottom-28 w-64 rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
            <h4 className="text-sm font-semibold text-white mb-3">Playback Settings</h4>
            
            {/* Crossfade Config */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs text-muted">
                <span>Crossfade Transition</span>
                <span>{crossfade}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={crossfade}
                onChange={(e) => setCrossfade(parseInt(e.target.value, 10))}
                className="w-full accent-spotify cursor-pointer bg-zinc-800 rounded-lg h-1"
              />
              <p className="text-[10px] text-muted leading-relaxed">
                When enabled, tracks will blend into each other smoothly during transitions. Set to 0 to disable.
              </p>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
