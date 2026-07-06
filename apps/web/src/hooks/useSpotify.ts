import { useState } from 'react';
import { Track } from './usePlayer';

// Unified iTunes response mapper to standard frontend Track format
export function mapItunesTrack(item: any): Track {
  const artworkUrl = item.artworkUrl100
    ? item.artworkUrl100.replace('100x100bb.jpg', '400x400bb.jpg')
    : 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400';

  return {
    id: item.trackId ? item.trackId.toString() : 'unknown-track',
    title: item.trackName || 'Unknown Track',
    duration: Math.round((item.trackTimeMillis || 180000) / 1000),
    audioUrl: item.previewUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    popularity: 80,
    artistId: item.artistId ? item.artistId.toString() : 'unknown-artist',
    albumId: item.collectionId ? item.collectionId.toString() : 'unknown-album',
    artist: {
      name: item.artistName || 'Unknown Artist',
      imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    },
    album: {
      title: item.collectionName || 'Unknown Album',
      artUrl: artworkUrl,
    },
  };
}

export function useSpotify() {
  // Kept flag for page component compilations, permanently false since iTunes requires no keys/auth
  const hasPremiumError = false;

  const searchSpotify = async (query: string) => {
    if (!query || query.trim() === '') {
      return { tracks: [], artists: [], albums: [], playlists: [] };
    }

    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=18`
      );

      if (!res.ok) {
        throw new Error('iTunes API search request failed');
      }
      const data = await res.json();
      const results = data.results || [];

      const songResults = results.filter((item: any) => item.wrapperType === 'track');
      const tracks = songResults.map((t: any) => mapItunesTrack(t));

      const artists = results
        .filter((item: any) => item.artistName)
        .map((art: any) => ({
          id: art.artistId?.toString() || 'unknown-artist',
          name: art.artistName,
          imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
          popularity: 80,
          bio: `Genre: ${art.primaryGenreName || 'Various'}`,
        }))
        .filter((val: any, index: number, self: any[]) => self.findIndex((a) => a.id === val.id) === index);

      const albums = results
        .filter((item: any) => item.collectionName)
        .map((alb: any) => {
          const artworkUrl = alb.artworkUrl100
            ? alb.artworkUrl100.replace('100x100bb.jpg', '400x400bb.jpg')
            : 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400';
          return {
            id: alb.collectionId?.toString() || 'unknown-album',
            title: alb.collectionName,
            artUrl: artworkUrl,
            releaseDate: alb.releaseDate ? alb.releaseDate.substring(0, 4) : '2026',
            artistId: alb.artistId?.toString() || 'unknown-artist',
            artist: {
              id: alb.artistId?.toString() || 'unknown-artist',
              name: alb.artistName,
            },
          };
        })
        .filter((val: any, index: number, self: any[]) => self.findIndex((a) => a.id === val.id) === index);

      return { tracks, artists, albums, playlists: [] };
    } catch (err) {
      console.error('Direct iTunes search failed:', err);
      return { tracks: [], artists: [], albums: [], playlists: [] };
    }
  };

  const getNewReleases = async (limit = 12): Promise<Track[]> => {
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=lofi&media=music&limit=${limit}`);
      if (!res.ok) {
        throw new Error('iTunes API trending request failed');
      }
      const data = await res.json();
      const results = data.results || [];
      return results.filter((item: any) => item.wrapperType === 'track').map((item: any) => mapItunesTrack(item));
    } catch (err) {
      console.error('Direct iTunes trending failed:', err);
      return [];
    }
  };

  return {
    searchSpotify,
    getNewReleases,
    hasPremiumError,
  };
}
