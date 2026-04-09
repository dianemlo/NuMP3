const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/**
 * Search catalog (Spotify-first metadata results)
 */
export async function ytSearch(query, opts = {}) {
  const q = String(query || "").trim();
  if (!q) return [];

  const limit = Math.min(Math.max(Number(opts.limit ?? 12) || 12, 1), 20);

  const res = await fetch(
    `${API_BASE}/api/search?q=${encodeURIComponent(q)}&limit=${limit}`
  );

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || text || "Backend search failed");
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Resolve one track to a playable YouTube result
 */
export async function resolveTrack(track) {
  const title = String(track?.title || "").trim();
  const artist = String(track?.artist || track?.channel || "").trim();
  const spotifyTrackId = String(track?.spotifyTrackId || "").trim();

  if (!title || !artist) {
    throw new Error("Missing title or artist");
  }

  const res = await fetch(`${API_BASE}/api/resolve-track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      spotifyTrackId,
      title,
      artist,
      spotify: {
        trackId: spotifyTrackId || null,
        artistId: track?.artistId || null,
        albumId: track?.album?.id || null,
        albumName: track?.album?.name || null,
        release_date: track?.album?.release_date || null,
        albumImages: track?.album?.images || [],
      },
    }),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || text || "Track resolve failed");
  }

  return data;
}

/**
 * Resolve Spotify album -> playable YouTube tracks
 * Returns: { album, items }
 */
export async function resolveAlbum(albumId, opts = {}) {
  const id = String(albumId || "").trim();
  if (!id) throw new Error("Missing albumId");

  const market = String(opts.market || "US").toUpperCase();

  const res = await fetch(
    `${API_BASE}/api/album/${encodeURIComponent(id)}/resolve?market=${encodeURIComponent(market)}`
  );

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || text || "Album resolve failed");
  }

  return data || { album: null, items: [] };
}

/**
 * Playlist: add one track
 */
export async function addSongToPlaylist(playlistId, song) {
  const pid = String(playlistId || "").trim();
  if (!pid) throw new Error("Missing playlistId");

  const res = await fetch(`${API_BASE}/playlists/${encodeURIComponent(pid)}/add-song`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(song),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || text || "Add song failed");
  }

  return data;
}

/**
 * Playlist: add many tracks (album batch)
 */
export async function addAlbumToPlaylist(playlistId, items) {
  const pid = String(playlistId || "").trim();
  if (!pid) throw new Error("Missing playlistId");

  const arr = Array.isArray(items) ? items : [];
  if (!arr.length) throw new Error("Missing items[]");

  const res = await fetch(`${API_BASE}/playlists/${encodeURIComponent(pid)}/add-album`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: arr }),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? text && JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || text || "Add album failed");
  }

  return data;
}

export async function getAlbum(albumId, opts = {}) {
  const id = String(albumId || "").trim();
  if (!id) throw new Error("Missing albumId");

  const market = String(opts.market || "US").toUpperCase();

  const res = await fetch(
    `${API_BASE}/api/album/${encodeURIComponent(id)}?market=${encodeURIComponent(market)}`
  );

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || text || "Album fetch failed");
  }

  return data || { album: null, items: [] };
}

export { API_BASE };