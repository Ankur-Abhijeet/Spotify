'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Pause, Music, Heart, LogIn } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePlayer, Track } from '../../hooks/usePlayer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function LibraryPage() {
  const { isAuthenticated } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const [libraryData, setLibraryData] = useState<{
    playlists: any[];
    likedTracks: Track[];
  }>({
    playlists: [],
    likedTracks: [],
  });
  
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const getSafeAccessToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  };

  useEffect(() => {
    if (isAuthenticated) {
      const fetchLibrary = async () => {
        try {
          const token = getSafeAccessToken();
          if (!token) return;
          const res = await fetch(`${API_BASE}/library`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setLibraryData(data);
          }
        } catch (err) {
          console.error('Failed to fetch library', err);
        } finally {
          setLoading(false);
        }
      };
      fetchLibrary();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handlePlayLiked = () => {
    if (libraryData.likedTracks.length === 0) return;
    
    // Toggle play if already playing a liked track
    if (currentTrack && libraryData.likedTracks.some((t) => t.id === currentTrack.id)) {
      togglePlay();
    } else {
      playTrack(libraryData.likedTracks[0], libraryData.likedTracks);
    }
  };

  const handlePlayTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, libraryData.likedTracks);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Heart className="h-16 w-16 text-zinc-600 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Enjoy your Library in Spotify</h2>
        <p className="text-sm text-muted mb-6 max-w-sm">
          Log in to view your liked songs, custom playlists, and follow artists.
        </p>
        <Link
          href="/login"
          className="flex items-center gap-2 rounded-full bg-spotify px-6 py-2.5 text-sm font-bold text-black transition-transform hover:scale-105 active:scale-95"
        >
          <LogIn className="h-4 w-4" />
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
        <h2 className="text-2xl font-bold text-white">Your Library</h2>

        {loading ? (
          <p className="text-sm text-muted">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left: Liked Songs Card */}
            <div className="rounded-xl bg-gradient-to-br from-indigo-900 to-purple-950 p-6 flex flex-col justify-between min-h-[220px] shadow-lg relative group">
              <div className="flex flex-col gap-2">
                <Heart className="h-10 w-10 text-white" fill="white" />
                <h3 className="text-2xl font-black text-white mt-4">Liked Songs</h3>
                <p className="text-sm text-indigo-200">
                  {libraryData.likedTracks.length} song{libraryData.likedTracks.length !== 1 && 's'}
                </p>
              </div>

              {libraryData.likedTracks.length > 0 && (
                <button
                  onClick={handlePlayLiked}
                  className="absolute bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-spotify text-black shadow-xl transition-transform hover:scale-105 active:scale-95 opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  {currentTrack &&
                  isPlaying &&
                  libraryData.likedTracks.some((t) => t.id === currentTrack.id) ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 fill-current ml-0.5" />
                  )}
                </button>
              )}
            </div>

            {/* Right: Liked Tracks List */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <h3 className="text-lg font-bold text-white">Songs you liked</h3>
              <div className="flex flex-col gap-1 bg-zinc-900/10 rounded-lg p-2 max-h-[300px] overflow-y-auto">
                {libraryData.likedTracks.length > 0 ? (
                  libraryData.likedTracks.map((track, idx) => (
                    <div
                      key={track.id}
                      onClick={() => handlePlayTrack(track)}
                      className="group flex items-center justify-between rounded-md p-2 hover:bg-zinc-800/50 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center text-xs text-muted">{idx + 1}</span>
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
                      <button className="hidden rounded-full p-2 hover:bg-zinc-700 text-muted hover:text-white transition-colors group-hover:block">
                        {currentTrack?.id === track.id && isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4 fill-current ml-0.5" />
                        )}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-xs text-muted text-center">
                    Songs you like will appear here. Start exploring!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
