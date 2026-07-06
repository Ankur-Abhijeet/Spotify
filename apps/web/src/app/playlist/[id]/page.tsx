'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, Music, Trash2, ArrowUp, ArrowDown, Plus, Search } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { usePlayer, Track } from '../../../hooks/usePlayer';
import { cacheTrack, deleteCachedTrack, isTrackCached } from '../../../utils/offlineCache';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PlaylistDetail {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  ownerId: string;
  isPublic: boolean;
  isCollaborative: boolean;
  tracks: Track[];
}

export default function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isAuthenticated, user } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isOfflineAvailable, setIsOfflineAvailable] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const router = useRouter();

  const fetchPlaylist = async () => {
    try {
      const res = await fetch(`${API_BASE}/library/playlists/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlaylist(data);

        // Check if all tracks in playlist are already cached offline
        if (data.tracks && data.tracks.length > 0) {
          const checks = await Promise.all(data.tracks.map((t: Track) => isTrackCached(t.id)));
          setIsOfflineAvailable(checks.every((c) => c === true));
        }
      } else {
        router.push('/library');
      }
    } catch (err) {
      console.error('Failed to load playlist', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylist();
  }, [id, isAuthenticated]);

  // Search catalog to add songs
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    const searchTracks = async () => {
      try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.tracks || []);
        }
      } catch (err) {
        console.error('Search in playlist failed', err);
      }
    };
    const timer = setTimeout(searchTracks, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePlayPlaylist = () => {
    if (!playlist || playlist.tracks.length === 0) return;

    if (currentTrack && playlist.tracks.some((t) => t.id === currentTrack.id)) {
      togglePlay();
    } else {
      playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  const handleToggleOffline = async () => {
    if (!playlist) return;

    if (isOfflineAvailable) {
      // Remove all tracks from cache
      for (const track of playlist.tracks) {
        try {
          await deleteCachedTrack(track.id);
        } catch (e) {
          console.error(e);
        }
      }
      setIsOfflineAvailable(false);
      setDownloadProgress('');
    } else {
      setDownloading(true);
      let count = 0;
      for (const track of playlist.tracks) {
        setDownloadProgress(`Downloading ${count + 1}/${playlist.tracks.length}...`);
        try {
          await cacheTrack(track.id, track.audioUrl);
        } catch (e) {
          console.error('Failed downloading track offline', e);
        }
        count++;
      }
      setDownloading(false);
      setIsOfflineAvailable(true);
    }
  };

  const handlePlayTrack = (track: Track) => {
    if (!playlist) return;
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, playlist.tracks);
    }
  };

  const handleAddTrack = async (trackId: string) => {
    try {
      const res = await fetch(`${API_BASE}/library/playlists/${id}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ trackId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPlaylist(updated);
        setSearchQuery('');
      }
    } catch (err) {
      console.error('Failed to add track to playlist', err);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    try {
      const res = await fetch(`${API_BASE}/library/playlists/${id}/tracks/${trackId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (res.ok) {
        const updated = await res.json();
        setPlaylist(updated);
      }
    } catch (err) {
      console.error('Failed to remove track from playlist', err);
    }
  };

  const handleMoveTrack = async (index: number, direction: 'up' | 'down') => {
    if (!playlist) return;
    const tracks = [...playlist.tracks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= tracks.length) return;

    // Swap tracks
    const temp = tracks[index];
    tracks[index] = tracks[targetIndex];
    tracks[targetIndex] = temp;

    const orderedTrackIds = tracks.map((t) => t.id);

    try {
      const res = await fetch(`${API_BASE}/library/playlists/${id}/tracks/reorder`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ orderedTrackIds }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPlaylist(updated);
      }
    } catch (err) {
      console.error('Failed to reorder playlist tracks', err);
    }
  };

  const isOwner = playlist && user && playlist.ownerId === user.id;

  if (loading) {
    return <p className="text-sm text-muted">Loading playlist...</p>;
  }

  if (!playlist) return null;

  return (
    <div className="flex flex-col gap-6">
        {/* Playlist Header */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="h-44 w-44 flex-shrink-0 overflow-hidden rounded bg-zinc-800 flex items-center justify-center shadow-lg">
            <Music className="h-16 w-16 text-zinc-600" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted">Playlist</p>
            <h2 className="text-4xl font-extrabold tracking-tight text-white mt-2">
              {playlist.title}
            </h2>
            <p className="text-sm text-muted mt-2">{playlist.description}</p>
          </div>
        </div>

        {/* Action Button */}
        {playlist.tracks.length > 0 && (
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={handlePlayPlaylist}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-spotify text-black shadow-xl transition-transform hover:scale-105 active:scale-95"
            >
              {currentTrack &&
              isPlaying &&
              playlist.tracks.some((t) => t.id === currentTrack.id) ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 fill-current ml-1" />
              )}
            </button>

            {/* Offline Download Toggle */}
            <button
              onClick={handleToggleOffline}
              disabled={downloading}
              className={`rounded-full border border-zinc-700 px-5 py-2 text-xs font-bold transition-all hover:border-white disabled:opacity-50 ${
                isOfflineAvailable
                  ? 'bg-spotify text-black border-spotify hover:border-spotify'
                  : 'text-white'
              }`}
            >
              {downloading ? downloadProgress : isOfflineAvailable ? 'Available Offline' : 'Download Playlist'}
            </button>
            {downloadProgress && !downloading && (
              <span className="text-xs text-spotify font-medium">{downloadProgress}</span>
            )}
          </div>
        )}

        {/* Tracks List */}
        <section>
          <div className="flex flex-col gap-1 bg-zinc-900/10 rounded-lg p-2">
            {playlist.tracks.length > 0 ? (
              playlist.tracks.map((track, idx) => (
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

                  {/* Actions for owner */}
                  {(isOwner || playlist.isCollaborative) && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Reorder Buttons */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveTrack(idx, 'up');
                        }}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 text-muted hover:text-white disabled:opacity-30"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveTrack(idx, 'down');
                        }}
                        disabled={idx === playlist.tracks.length - 1}
                        title="Move Down"
                        className="p-1 text-muted hover:text-white disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTrack(track.id);
                        }}
                        title="Remove track"
                        className="p-1 text-muted hover:text-red-500 transition-colors ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="p-8 text-xs text-muted text-center">
                This playlist is empty. Search and add tracks below!
              </p>
            )}
          </div>
        </section>

        {/* Add Songs Section */}
        {(isOwner || playlist.isCollaborative) && (
          <section className="border-t border-zinc-800 pt-8 mt-4">
            <h3 className="text-lg font-bold text-white mb-2">Let&apos;s add some songs to your playlist</h3>
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search for tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md bg-zinc-900 py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 border border-transparent focus:border-zinc-700 focus:outline-none"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="flex flex-col gap-1 bg-zinc-900/20 rounded-lg p-2 max-h-[250px] overflow-y-auto">
                {searchResults.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between rounded-md p-2 hover:bg-zinc-800/40"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                      <p className="text-xs text-muted truncate">{track.artist?.name}</p>
                    </div>
                    <button
                      onClick={() => handleAddTrack(track.id)}
                      className="flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold hover:border-white transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
    </div>
  );
}
