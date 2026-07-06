'use client';

import React, { useEffect, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { usePlayer, Track } from '../hooks/usePlayer';
import { useSpotify } from '../hooks/useSpotify';

export default function HomePage() {
  const [popularTracks, setPopularTracks] = useState<Track[]>([]);
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const [greeting, setGreeting] = useState('Welcome');
  const { getNewReleases, hasPremiumError } = useSpotify();

  useEffect(() => {
    // Dynamic greeting based on user's timezone/local hour
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    // Fetch popular tracks directly from Spotify API!
    const initCatalog = async () => {
      try {
        const data = await getNewReleases(12);
        setPopularTracks(data || []);
      } catch (err) {
        console.error('Failed to fetch Spotify new releases', err);
      }
    };
    initCatalog();
  }, []);

  const handlePlayClick = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, popularTracks);
    }
  };

  return (
    <div className="flex flex-col gap-8">
        {/* Hero Banner Grid */}
        <section>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-6">
            {greeting}
          </h2>

          {hasPremiumError && (
            <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 shadow-md backdrop-blur-md">
              <div className="flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-semibold text-white mb-1">Spotify Sandbox Premium Required</p>
                  <p className="leading-relaxed">
                    Spotify API returned a <strong>403 Forbidden</strong>. Under Spotify's developer policy, the developer account owner credentials used in <code>.env</code> must have an active paid <strong>Spotify Premium subscription</strong> to use the API in developer sandbox mode.
                  </p>
                  <p className="mt-2 text-xs text-amber-300">
                    To fix this, log in to the Spotify Developer Dashboard with a Premium account, or upgrade the owner's subscription.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularTracks.slice(0, 6).map((track) => (
              <div
                key={track.id}
                className="group relative flex items-center gap-4 overflow-hidden rounded-md bg-zinc-900/60 p-2 pr-12 transition-all hover:bg-zinc-800/80 cursor-pointer"
              >
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-zinc-800">
                  {track.album?.artUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={track.album.artUrl}
                      alt={track.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">🎵</div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-bold text-white">{track.title}</p>
                  <p className="truncate text-xs text-muted">{track.artist?.name}</p>
                </div>
                {/* Float play button */}
                <button
                  onClick={() => handlePlayClick(track)}
                  className="absolute right-4 hidden h-10 w-10 items-center justify-center rounded-full bg-spotify text-black shadow-lg transition-transform hover:scale-105 active:scale-95 group-hover:flex"
                >
                  {currentTrack?.id === track.id && isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Standard Shelf Section */}
        <section>
          <h3 className="text-xl font-bold text-white mb-4">Recommended For You</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {popularTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => handlePlayClick(track)}
                className="group rounded-lg bg-zinc-900/40 p-4 transition-all hover:bg-zinc-900/80 cursor-pointer"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded bg-zinc-800 mb-4 shadow-md">
                  {track.album?.artUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={track.album.artUrl}
                      alt={track.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl">🎵</div>
                  )}
                  {/* Overlay play button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayClick(track);
                    }}
                    className="absolute bottom-2 right-2 hidden h-10 w-10 items-center justify-center rounded-full bg-spotify text-black shadow-lg transition-transform hover:scale-105 active:scale-95 group-hover:flex"
                  >
                    {currentTrack?.id === track.id && isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    )}
                  </button>
                </div>
                <p className="truncate text-sm font-bold text-white mb-1">{track.title}</p>
                <p className="truncate text-xs text-muted">{track.artist?.name}</p>
              </div>
            ))}
          </div>
        </section>
    </div>
  );
}
