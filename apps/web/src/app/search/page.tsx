'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Search, Play, Pause, Music, User as UserIcon, Album as AlbumIcon } from 'lucide-react';
import { usePlayer, Track } from '../../hooks/usePlayer';
import { useSpotify } from '../../hooks/useSpotify';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    tracks: Track[];
    artists: any[];
    albums: any[];
    playlists: any[];
  }>({
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
  });
  
  const [loading, setLoading] = useState(false);
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const { searchSpotify, hasPremiumError } = useSpotify();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search trigger (queries Spotify directly from the page!)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim() === '') {
      setResults({ tracks: [], artists: [], albums: [], playlists: [] });
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const data = await searchSpotify(query);
        setResults(data);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  const handlePlayTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, results.tracks);
    }
  };

  return (
    <div className="flex flex-col gap-6">
        {/* Search Input Box */}
        <div className="relative max-w-lg">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="What do you want to listen to?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full bg-zinc-900 py-3 pl-12 pr-4 text-sm text-white placeholder-zinc-500 border border-transparent focus:border-white focus:outline-none focus:bg-zinc-800 transition-colors"
          />
        </div>

        {hasPremiumError && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 shadow-md backdrop-blur-md">
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

        {loading && <p className="text-sm text-muted">Searching...</p>}

        {query && !loading && (
          <div className="flex flex-col gap-8">
            {/* Tracks Section */}
            {results.tracks.length > 0 && (
              <section>
                <h3 className="text-xl font-bold text-white mb-4">Songs</h3>
                <div className="flex flex-col gap-1 rounded-lg bg-zinc-900/20 p-2">
                  {results.tracks.map((track) => (
                    <div
                      key={track.id}
                      onClick={() => handlePlayTrack(track)}
                      className="group flex items-center justify-between rounded-md p-2 hover:bg-zinc-800/50 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded bg-zinc-800 flex items-center justify-center">
                          {track.album?.artUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={track.album.artUrl}
                              alt={track.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Music className="h-5 w-5 text-zinc-600" />
                          )}
                        </div>
                        <div>
                          <p
                            className={`text-sm font-semibold truncate ${
                              currentTrack?.id === track.id ? 'text-spotify' : 'text-white'
                            }`}
                          >
                            {track.title}
                          </p>
                          <p className="text-xs text-muted truncate">{track.artist?.name}</p>
                        </div>
                      </div>
                      
                      <button className="hidden rounded-full p-2 hover:bg-zinc-700 hover:text-white transition-colors group-hover:block text-muted">
                        {currentTrack?.id === track.id && isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4 fill-current ml-0.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Artists Section */}
            {results.artists.length > 0 && (
              <section>
                <h3 className="text-xl font-bold text-white mb-4">Artists</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {results.artists.map((artist) => (
                    <div
                      key={artist.id}
                      className="rounded-lg bg-zinc-900/40 p-4 transition-all hover:bg-zinc-900/80 cursor-pointer"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-full bg-zinc-800 mb-4 flex items-center justify-center">
                        {artist.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={artist.imageUrl}
                            alt={artist.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserIcon className="h-10 w-10 text-zinc-600" />
                        )}
                      </div>
                      <p className="truncate text-sm font-bold text-white text-center">
                        {artist.name}
                      </p>
                      <p className="text-xs text-muted text-center">Artist</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Albums Section */}
            {results.albums.length > 0 && (
              <section>
                <h3 className="text-xl font-bold text-white mb-4">Albums</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {results.albums.map((album) => (
                    <div
                      key={album.id}
                      className="rounded-lg bg-zinc-900/40 p-4 transition-all hover:bg-zinc-900/80 cursor-pointer"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded bg-zinc-800 mb-4 flex items-center justify-center">
                        {album.artUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={album.artUrl}
                            alt={album.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <AlbumIcon className="h-10 w-10 text-zinc-600" />
                        )}
                      </div>
                      <p className="truncate text-sm font-bold text-white">{album.title}</p>
                      <p className="truncate text-xs text-muted">{album.artist?.name}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {results.tracks.length === 0 &&
              results.artists.length === 0 &&
              results.albums.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted">
                  <p className="text-base font-semibold">No results found for &quot;{query}&quot;</p>
                  <p className="text-xs">Please check your spelling or try different keywords.</p>
                </div>
              )}
          </div>
        )}

        {!query && (
          <div className="flex flex-col items-center justify-center py-20 text-muted">
            <p className="text-base font-semibold">Search for songs, artists, or albums</p>
            <p className="text-xs">Your results will populate here as you type.</p>
          </div>
        )}
    </div>
  );
}
