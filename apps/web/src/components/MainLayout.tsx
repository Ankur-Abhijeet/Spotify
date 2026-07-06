'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Library, Plus, Music, LogOut, LogIn, Settings, BarChart2, Users, CreditCard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../hooks/usePlayer';
import { PlayerBar } from './PlayerBar';
import { DiscoveryPrompt } from './DiscoveryPrompt';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, init: initAuth, logout } = useAuth();
  const {
    init: initPlayer,
    clearQueue,
    showDiscoveryPrompt,
    discoveryPair,
    sessionId,
    resolveDiscoveryPrompt,
  } = usePlayer();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [friendActivities, setFriendActivities] = useState<any[]>([]);

  useEffect(() => {
    initAuth();
    initPlayer();
  }, [initAuth, initPlayer]);

  const getSafeItem = (key: string) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  };

  const setSafeItem = (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  };

  // Load user playlists if authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchPlaylists = async () => {
        try {
          const token = getSafeItem('access_token');
          if (!token) return;
          const res = await fetch(`${API_BASE}/library`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setPlaylists(data.playlists || []);
          }
        } catch (err) {
          console.error('Failed to load sidebar playlists', err);
        }
      };
      fetchPlaylists();
    } else {
      setPlaylists([]);
    }
  }, [isAuthenticated, user]);

  // Connect multi-device polling sync loop
  useEffect(() => {
    if (!isAuthenticated) return;

    let deviceId = getSafeItem('connect_device_id');
    if (!deviceId) {
      deviceId = Math.random().toString(36).substring(7);
      setSafeItem('connect_device_id', deviceId);
    }
    const deviceName = `Web Player (Browser)`;

    const connectSync = async () => {
      const playerState = usePlayer.getState();
      const volume = playerState.volume;
      const position = playerState.position;
      const isPlaying = playerState.isPlaying;
      const togglePlay = playerState.togglePlay;
      
      try {
        const token = getSafeItem('access_token');
        if (!token) return;
        const res = await fetch(`${API_BASE}/connect/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: deviceId,
            name: deviceName,
            volume,
            position,
            isActive: isPlaying,
          }),
        });

        if (res.ok) {
          const devRes = await fetch(`${API_BASE}/connect/devices`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (devRes.ok) {
            const list = await devRes.json();
            const activeDev = list.find((d: any) => d.isActive);
            
            // Sync action: Pause our local playback if another device is currently active
            if (activeDev && activeDev.id !== deviceId && isPlaying) {
              togglePlay();
            }
          }
        }
      } catch (err) {
        console.error('Failed to sync Connect device', err);
      }
    };

    const interval = setInterval(connectSync, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Friend Activity polling loop
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchActivity = async () => {
      try {
        const token = getSafeItem('access_token');
        if (!token) return;
        const res = await fetch(`${API_BASE}/social/friend-activity`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const list = await res.json();
          setFriendActivities(list);
        }
      } catch (err) {
        console.error('Failed to fetch friend activity', err);
      }
    };

    fetchActivity();
    const interval = setInterval(fetchActivity, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleCreatePlaylist = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    try {
      const token = getSafeItem('access_token');
      if (!token) return;
      const res = await fetch(`${API_BASE}/library/playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: `My Playlist #${playlists.length + 1}`,
          description: 'A custom playlist created in Spotify.',
        }),
      });

      if (res.ok) {
        const newPlaylist = await res.json();
        setPlaylists([newPlaylist, ...playlists]);
        router.push(`/playlist/${newPlaylist.id}`);
      }
    } catch (err) {
      console.error('Failed to create playlist', err);
    }
  };

  const handleLogout = () => {
    logout();
    clearQueue();
    router.push('/');
  };

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  if (isAuthPage) {
    return <div className="bg-black text-white min-h-screen">{children}</div>;
  }

  return (
    <div className="flex h-screen flex-col bg-black text-white">
      {showDiscoveryPrompt && discoveryPair && (
        <DiscoveryPrompt
          candidateA={discoveryPair.candidateA}
          candidateB={discoveryPair.candidateB}
          sessionId={sessionId}
          onResolve={resolveDiscoveryPrompt}
        />
      )}
      {/* Upper Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col bg-black p-2 md:flex">
          {/* Navigation Card */}
          <nav className="mb-2 flex flex-col gap-4 rounded-xl bg-card p-4">
            <Link
              href="/"
              className={`flex items-center gap-4 text-sm font-semibold transition-colors hover:text-white ${
                pathname === '/' ? 'text-white' : 'text-muted'
              }`}
            >
              <Home className="h-6 w-6" />
              Home
            </Link>
            <Link
              href="/search"
              className={`flex items-center gap-4 text-sm font-semibold transition-colors hover:text-white ${
                pathname === '/search' ? 'text-white' : 'text-muted'
              }`}
            >
              <Search className="h-6 w-6" />
              Search
            </Link>
            <Link
              href="/recap"
              className={`flex items-center gap-4 text-sm font-semibold transition-colors hover:text-white ${
                pathname === '/recap' ? 'text-white' : 'text-muted'
              }`}
            >
              <BarChart2 className="h-6 w-6" />
              Discovery Recap
            </Link>
            <Link
              href="/premium"
              className={`flex items-center gap-4 text-sm font-semibold transition-colors hover:text-white ${
                pathname === '/premium' ? 'text-white' : 'text-muted'
              }`}
            >
              <CreditCard className="h-6 w-6" />
              Go Premium
            </Link>
          </nav>

          {/* Library Card */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl bg-card p-2">
            <div className="flex items-center justify-between px-3 py-2 text-muted">
              <Link
                href="/library"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Library className="h-6 w-6" />
                <span className="text-sm font-semibold">Your Library</span>
              </Link>
              <button
                onClick={handleCreatePlaylist}
                title="Create playlist"
                className="rounded-full p-1 hover:bg-hover hover:text-white transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {/* Playlists List */}
            <div className="mt-4 flex-1 overflow-y-auto px-2">
              <div className="flex flex-col gap-1">
                {playlists.length > 0 ? (
                  playlists.map((pl) => (
                    <Link
                      key={pl.id}
                      href={`/playlist/${pl.id}`}
                      className={`flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-hover ${
                        pathname === `/playlist/${pl.id}` ? 'bg-hover text-white' : 'text-muted'
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-800 text-zinc-400">
                        <Music className="h-5 w-5" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-white">{pl.title}</p>
                        <p className="truncate text-xs">Playlist</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="px-2 text-xs text-muted">
                    {isAuthenticated ? 'No playlists created yet' : 'Log in to view library'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex flex-1 flex-col overflow-hidden p-2">
          <div className="flex flex-1 flex-col overflow-y-auto rounded-xl bg-card">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-zinc-900/50 backdrop-blur sticky top-0 z-10 border-b border-zinc-800/50">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-spotify uppercase">Spotify</span>
              </div>
              <div className="flex items-center gap-4">
                {isAuthenticated && user ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted">
                      {user.firstName ? `Hello, ${user.firstName}` : user.email}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 rounded-full bg-zinc-800 px-4 py-2 text-sm font-semibold transition-colors hover:bg-zinc-700"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link
                      href="/login"
                      className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-transform hover:scale-105 active:scale-95"
                    >
                      <LogIn className="h-4 w-4" />
                      Log in
                    </Link>
                  </div>
                )}
              </div>
            </header>

            {/* Inner Content */}
            <div className="flex-1 p-6">{children}</div>
          </div>
        </main>

        {/* Friend Activity Right Sidebar (Dynamic & Premium fallback) */}
        <aside className="hidden w-60 flex-col bg-black p-2 lg:flex">
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl bg-card p-4">
            <div className="flex items-center gap-2 text-muted pb-3 border-b border-zinc-800/50">
              <Users className="h-5 w-5 text-spotify" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">Friend Activity</span>
            </div>
            
            <div className="mt-4 flex-1 overflow-y-auto flex flex-col gap-4">
              {friendActivities.length > 0 ? (
                friendActivities.map((act, idx) => (
                  <div key={idx} className="flex gap-3 text-xs">
                    <div className="h-8 w-8 rounded-full bg-spotify/20 flex items-center justify-center font-bold text-spotify uppercase">
                      {act.user.email.substring(0, 2)}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-semibold text-white truncate">{act.user.email}</p>
                      <p className="text-[10px] text-muted truncate mt-0.5">
                        listening to <span className="text-white font-medium">{act.track.title}</span>
                      </p>
                      <p className="text-[10px] text-muted truncate mt-0.5">{act.track.artist}</p>
                    </div>
                  </div>
                ))
              ) : (
                // Sandbox fallbacks to show beautiful visual placeholders if DB has no friend activity
                <>
                  <div className="flex gap-3 text-xs">
                    <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 uppercase">
                      JD
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-semibold text-zinc-300 truncate">jane.doe@example.com</p>
                      <p className="text-[10px] text-muted truncate mt-0.5">
                        listening to <span className="text-spotify font-medium">Lofi Dreamer</span>
                      </p>
                      <p className="text-[10px] text-muted truncate mt-0.5">Ambient Moods</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-purple-400 uppercase">
                      AS
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-semibold text-zinc-300 truncate">alex.smith@example.com</p>
                      <p className="text-[10px] text-muted truncate mt-0.5">
                        listening to <span className="text-spotify font-medium">Neon Horizon</span>
                      </p>
                      <p className="text-[10px] text-muted truncate mt-0.5">Synthwave Retro</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center font-bold text-zinc-400 uppercase">
                      BS
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-semibold text-zinc-300 truncate">bob@example.com</p>
                      <p className="text-[10px] text-muted truncate mt-0.5">
                        listening to <span className="text-spotify font-medium">Acoustic Soul</span>
                      </p>
                      <p className="text-[10px] text-muted truncate mt-0.5">Singer Songwriter</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Persistent Player Bar */}
      <PlayerBar />
    </div>
  );
}
