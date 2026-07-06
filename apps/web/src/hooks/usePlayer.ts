'use client';

import { create } from 'zustand';
import { getCachedTrackUrl } from '../utils/offlineCache';

export interface Track {
  id: string;
  title: string;
  duration: number;
  audioUrl: string;
  popularity: number;
  artistId: string;
  albumId?: string;
  artist?: { name: string; imageUrl?: string };
  album?: { title: string; artUrl?: string };
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  crossfade: number; // in seconds
  audioElement: HTMLAudioElement | null;
  
  // Actions
  init: () => void;
  playTrack: (track: Track, newQueue?: Track[]) => void;
  setQueue: (tracks: Track[]) => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setCrossfade: (seconds: number) => void;
  clearQueue: () => void;
  handleCrossfadeNext: () => void;
  
  // Discovery Additions
  sessionId: string;
  showDiscoveryPrompt: boolean;
  discoveryPair: { candidateA: Track; candidateB: Track } | null;
  playChoiceImmediately: boolean;
  triggerDiscoveryPrompt: (force?: boolean, playChoiceImmediately?: boolean) => Promise<void>;
  resolveDiscoveryPrompt: (chosenTrackId?: string) => void;
  proceedToNext: () => void;
}

export const usePlayer = create<PlayerState>((set, get) => {
  // Helper to handle standard audio instance creation
  const getAudio = () => {
    if (typeof window === 'undefined') return null;
    let audio = get().audioElement;
    if (!audio) {
      const activeAudio = new Audio();
      activeAudio.volume = get().isMuted ? 0 : get().volume;
      
      // Wire event listeners
      activeAudio.addEventListener('timeupdate', () => {
        set({ position: activeAudio.currentTime });
        
        // Handle crossfade trigger near the end
        const state = get();
        if (
          state.currentTrack &&
          state.crossfade > 0 &&
          activeAudio.duration - activeAudio.currentTime <= state.crossfade &&
          !activeAudio.dataset.fading
        ) {
          activeAudio.dataset.fading = 'true';
          state.handleCrossfadeNext();
        }
      });

      activeAudio.addEventListener('durationchange', () => {
        set({ duration: activeAudio.duration || 0 });
      });

      activeAudio.addEventListener('ended', () => {
        const state = get();
        // If crossfade handled it, do nothing, otherwise standard next
        if (!activeAudio.dataset.fading) {
          if (state.repeat === 'one') {
            activeAudio.currentTime = 0;
            activeAudio.play().catch(() => {});
          } else {
            state.next();
          }
        }
        delete activeAudio.dataset.fading;
      });

      audio = activeAudio;
      set({ audioElement: activeAudio });
    }
    return audio;
  };

  return {
    currentTrack: null,
    queue: [],
    queueIndex: -1,
    isPlaying: false,
    position: 0,
    duration: 0,
    volume: 0.7,
    isMuted: false,
    shuffle: false,
    repeat: 'off',
    crossfade: 0, // default crossfade off
    audioElement: null,
    discoveryPair: null,
    showDiscoveryPrompt: false,
    playChoiceImmediately: false,
    sessionId: '',

    init: () => {
      getAudio();
    },

    playTrack: (track, newQueue) => {
      const audio = getAudio();
      if (!audio) return;

      const currentQueue = newQueue || get().queue;
      let idx = currentQueue.findIndex((t) => t.id === track.id);
      
      if (idx === -1) {
        currentQueue.push(track);
        idx = currentQueue.length - 1;
      }

      const isFirstPlay = get().currentTrack === null;

      const setupPlayback = async () => {
        let playUrl = track.audioUrl;
        try {
          const cachedUrl = await getCachedTrackUrl(track.id);
          if (cachedUrl) {
            playUrl = cachedUrl;
          }
        } catch (e) {}

        audio.src = playUrl;
        audio.load();
        
        set({
          currentTrack: track,
          queue: currentQueue,
          queueIndex: idx,
          isPlaying: true,
          position: 0,
          duration: track.duration || 0,
        });

        audio.play().catch(() => {
          set({ isPlaying: false });
        });

        if (isFirstPlay) {
          setTimeout(() => {
            get().triggerDiscoveryPrompt(true, false);
          }, 300);
        }
      };

      void setupPlayback();
    },

    setQueue: (tracks) => {
      set({ queue: tracks });
    },

    addToQueue: (track) => {
      set((state) => {
        if (state.queue.some((t) => t.id === track.id)) return state;
        return { queue: [...state.queue, track] };
      });
    },

    playNext: (track) => {
      set((state) => {
        const filtered = state.queue.filter((t) => t.id !== track.id);
        const idx = state.queueIndex;
        const newQueue = [...filtered];
        newQueue.splice(idx + 1, 0, track);
        return { queue: newQueue };
      });
    },

    togglePlay: () => {
      const audio = getAudio();
      if (!audio || !get().currentTrack) return;

      if (get().isPlaying) {
        audio.pause();
        set({ isPlaying: false });
      } else {
        audio.play().catch(() => {});
        set({ isPlaying: true });
      }
    },

    next: () => {
      const { queue } = get();
      if (queue.length === 0) return;

      // Force trigger the A/B choice prompt on track skip!
      get().triggerDiscoveryPrompt(true, true).then(() => {
        if (get().showDiscoveryPrompt) {
          return; // halt next song playback, prompt overlay takes over
        }
        get().proceedToNext();
      });
    },

    proceedToNext: () => {
      const { queue, queueIndex, repeat, shuffle } = get();
      let nextIndex = queueIndex + 1;

      if (shuffle) {
        nextIndex = Math.floor(Math.random() * queue.length);
      } else if (nextIndex >= queue.length) {
        if (repeat === 'all') {
          nextIndex = 0;
        } else {
          // Playback finished, reset player state
          set({ isPlaying: false, position: 0 });
          return;
        }
      }

      const nextTrack = queue[nextIndex];
      if (nextTrack) {
        get().playTrack(nextTrack, queue);
      }
    },

    prev: () => {
      const { queue, queueIndex, position } = get();
      if (queue.length === 0) return;

      // If playing for more than 3 seconds, restart current track
      if (position > 3) {
        const audio = getAudio();
        if (audio) {
          audio.currentTime = 0;
          set({ position: 0 });
        }
        return;
      }

      let prevIndex = queueIndex - 1;
      if (prevIndex < 0) {
        prevIndex = queue.length - 1; // loop back to end
      }

      const prevTrack = queue[prevIndex];
      if (prevTrack) {
        get().playTrack(prevTrack, queue);
      }
    },

    seek: (seconds) => {
      const audio = getAudio();
      if (!audio) return;
      audio.currentTime = seconds;
      set({ position: seconds });
    },

    setVolume: (vol) => {
      const audio = getAudio();
      if (audio) {
        audio.volume = vol;
      }
      set({ volume: vol, isMuted: vol === 0 });
    },

    toggleMute: () => {
      const { isMuted, volume } = get();
      const audio = getAudio();
      if (audio) {
        audio.volume = !isMuted ? 0 : volume;
      }
      set({ isMuted: !isMuted });
    },

    toggleShuffle: () => {
      set((state) => ({ shuffle: !state.shuffle }));
    },

    toggleRepeat: () => {
      set((state) => {
        const nextRepeat =
          state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off';
        return { repeat: nextRepeat };
      });
    },

    setCrossfade: (seconds) => {
      set({ crossfade: seconds });
    },

    clearQueue: () => {
      set({ queue: [], queueIndex: -1, currentTrack: null, isPlaying: false });
      const audio = getAudio();
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    },
    
    // Custom crossfade loader helper
    handleCrossfadeNext: () => {
      const state = get();
      const { queue, queueIndex, repeat, shuffle, crossfade } = state;
      if (queue.length === 0) return;

      let nextIndex = queueIndex + 1;
      if (shuffle) {
        nextIndex = Math.floor(Math.random() * queue.length);
      } else if (nextIndex >= queue.length) {
        if (repeat === 'all') {
          nextIndex = 0;
        } else {
          return;
        }
      }

      const nextTrack = queue[nextIndex];
      if (!nextTrack) return;

      // Spawn second audio element for crossfading
      const nextAudio = new Audio(nextTrack.audioUrl);
      nextAudio.volume = 0;
      nextAudio.load();
      
      // Fade out current audio and fade in next audio
      const currentAudio = get().audioElement;
      if (!currentAudio) return;

      nextAudio.play().then(() => {
        let elapsed = 0;
        const intervalTime = 100; // ms
        const steps = (crossfade * 1000) / intervalTime;
        const volumeStep = get().volume / steps;

        const fadeInterval = setInterval(() => {
          elapsed += intervalTime;
          if (elapsed >= crossfade * 1000) {
            clearInterval(fadeInterval);
            
            // Swap audio elements
            currentAudio.pause();
            currentAudio.src = '';
            delete currentAudio.dataset.fading;

            nextAudio.volume = get().isMuted ? 0 : get().volume;
            
            // Wire listeners to new audio element
            set({
              audioElement: nextAudio,
              currentTrack: nextTrack,
              queueIndex: nextIndex,
              position: nextAudio.currentTime,
              duration: nextAudio.duration || nextTrack.duration || 0,
            });

            // Re-bind listeners for timeupdate/duration/ended
            getAudio();
          } else {
            // Linear fade step
            const currentVol = Math.max(0, currentAudio.volume - volumeStep);
            const nextVol = Math.min(get().volume, nextAudio.volume + volumeStep);
            
            currentAudio.volume = get().isMuted ? 0 : currentVol;
            nextAudio.volume = get().isMuted ? 0 : nextVol;
          }
        }, intervalTime);
      }).catch(() => {
        // Fallback: normal next without crossfade if error occurs
        state.next();
      });
    },

    triggerDiscoveryPrompt: async (force = false, playImmediately = false) => {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      let sid = get().sessionId;
      if (!sid) {
        sid = Math.random().toString(36).substring(7);
        set({ sessionId: sid });
      }

      try {
        const token = localStorage.getItem('access_token');
        let showPrompt = force;

        if (!showPrompt) {
          const res = await fetch(`${API_BASE}/discovery/should-prompt?sessionId=${sid}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const check = await res.json();
            showPrompt = check.prompt;
          }
        }

        if (showPrompt) {
          // Pause current playback first so preview audio doesn't clash
          const audio = getAudio();
          if (audio) {
            audio.pause();
          }
          set({ isPlaying: false, playChoiceImmediately: playImmediately });

          // Fetch pair
          const pairRes = await fetch(`${API_BASE}/discovery/pair`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (pairRes.ok) {
            const pair = await pairRes.json();
            set({
              discoveryPair: { candidateA: pair.candidateA, candidateB: pair.candidateB },
              showDiscoveryPrompt: true,
            });
          }
        }
      } catch (err) {
        console.error('Failed triggering discovery check', err);
      }
    },

    resolveDiscoveryPrompt: (chosenTrackId?: string) => {
      const { discoveryPair, playChoiceImmediately } = get();
      set({ showDiscoveryPrompt: false, discoveryPair: null });

      if (chosenTrackId && discoveryPair) {
        const chosenTrack = chosenTrackId === discoveryPair.candidateA.id
          ? discoveryPair.candidateA
          : discoveryPair.candidateB;

        // Inject track as next in queue
        get().playNext(chosenTrack);
        
        if (playChoiceImmediately) {
          get().proceedToNext();
        } else {
          // Resume current track
          const audio = getAudio();
          if (audio) {
            audio.play().catch(() => {});
            set({ isPlaying: true });
          }
        }
      } else {
        if (playChoiceImmediately) {
          get().proceedToNext();
        } else {
          // Resume current track
          const audio = getAudio();
          if (audio) {
            audio.play().catch(() => {});
            set({ isPlaying: true });
          }
        }
      }
    },
  };
});
