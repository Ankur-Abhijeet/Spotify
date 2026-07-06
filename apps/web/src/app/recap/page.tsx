'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart2, Heart, Award, ArrowLeft, RefreshCw, Layers, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RecapStats {
  totalPrompts: number;
  totalChoices: number;
  totalSkips: number;
  choiceRate: number;
  avgLatencyMs: number;
  topArtists: Array<{ name: string; count: number }>;
}

export default function RecapPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<RecapStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingMixes, setGeneratingMixes] = useState(false);
  const [mixesResult, setMixesResult] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_BASE}/discovery/recap`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch discovery stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAuthenticated, router]);

  const handleGenerateMixes = async () => {
    setGeneratingMixes(true);
    setMixesResult(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/discovery/mixes/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMixesResult(`Successfully generated personalized mixes! Check your Library.`);
      } else {
        setMixesResult('Failed to generate personalized mixes.');
      }
    } catch (err) {
      console.error('Failed generating mixes', err);
      setMixesResult('Error generating mixes.');
    } finally {
      setGeneratingMixes(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-sm text-muted">Loading your discovery summary...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-spotify" />
            Your Discovery Recap
          </h2>
          <p className="text-sm text-muted">Insights from your adaptive A/B choices</p>
        </div>
      </div>

      {!stats || stats.totalPrompts === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 text-center">
          <Layers className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No discoveries logged yet</h3>
          <p className="text-sm text-muted mb-6 max-w-md mx-auto">
            Play music and skip or select tracks inside the Spotify player to trigger A/B prompt choices!
          </p>
          <button
            onClick={() => router.push('/')}
            className="rounded-full bg-spotify px-6 py-2.5 text-xs font-bold text-black transition-transform hover:scale-105 active:scale-95"
          >
            Start Listening
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Choice Rate */}
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-6 flex flex-col items-center justify-center text-center shadow-lg">
            <div className="relative flex items-center justify-center h-28 w-28 rounded-full border-4 border-zinc-800 mb-4">
              <span className="text-3xl font-black text-white">{stats.choiceRate}%</span>
              <div
                className="absolute inset-0 rounded-full border-4 border-spotify"
                style={{
                  clipPath: `polygon(50% 50%, 50% 0%, ${stats.choiceRate >= 25 ? '100% 0%,' : ''} ${
                    stats.choiceRate >= 50 ? '100% 100%,' : ''
                  } ${stats.choiceRate >= 75 ? '0% 100%,' : ''} ${
                    stats.choiceRate >= 100 ? '0% 0%,' : ''
                  } 50% 0%)`,
                  transform: 'rotate(-45deg)',
                }}
              />
            </div>
            <h4 className="text-sm font-bold text-muted uppercase tracking-wider">Choice Action Rate</h4>
            <p className="text-xs text-muted mt-2 max-w-[180px]">
              Percentage of prompts where you selected a candidate instead of skipping.
            </p>
          </div>

          {/* Card 2: Numeric Counters */}
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-6 flex flex-col justify-between shadow-lg min-h-[200px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Engagement Details</span>
              <BarChart2 className="h-5 w-5 text-spotify" />
            </div>
            <div className="flex flex-col gap-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted">Total Prompts Shown:</span>
                <span className="text-lg font-bold text-white">{stats.totalPrompts}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted">Successful Selections:</span>
                <span className="text-lg font-bold text-white text-spotify">{stats.totalChoices}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted">Skips / Not Now:</span>
                <span className="text-lg font-bold text-white text-red-500">{stats.totalSkips}</span>
              </div>
            </div>
            <div className="border-t border-zinc-800/80 pt-3 text-[10px] text-muted">
              Average decision latency: <span className="font-semibold text-white">{stats.avgLatencyMs}ms</span>
            </div>
          </div>

          {/* Card 3: Top Genres/Artists */}
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-6 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Top Taste Profiles</span>
              <Award className="h-5 w-5 text-spotify" />
            </div>
            <div className="flex flex-col gap-3 mt-4">
              {stats.topArtists.length > 0 ? (
                stats.topArtists.map((artist, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-sm text-white truncate max-w-[160px]">{artist.name}</span>
                    <span className="text-xs text-muted font-bold">
                      {artist.count} selection{artist.count !== 1 && 's'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted py-6 text-center">Select tracks inside prompts to calculate top genres</p>
              )}
            </div>
            <div className="text-[10px] text-muted">Calculated using Bradley-Terry gradient preferences</div>
          </div>
        </div>
      )}

      {/* Made for You generator card */}
      <div className="rounded-xl bg-gradient-to-br from-spotify/10 to-zinc-900 border border-spotify/20 p-8 flex flex-col gap-6 shadow-xl relative overflow-hidden group">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-spotify" />
            Materialize Your Personal Mixes
          </h3>
          <p className="text-sm text-muted max-w-xl">
            Compile your offline preference updates instantly. Generates two custom personalized playlists (Chill Mix & Energy Mix) using vectors calculated from your choices.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleGenerateMixes}
            disabled={generatingMixes}
            className="flex items-center gap-2 rounded-full bg-spotify px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {generatingMixes ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating Mixes...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Generate Daily Mixes
              </>
            )}
          </button>
        </div>

        {mixesResult && (
          <div className="p-4 rounded-lg bg-zinc-950/40 border border-zinc-800 text-xs font-semibold text-spotify animate-fade-in">
            {mixesResult}
          </div>
        )}
      </div>
    </div>
  );
}
