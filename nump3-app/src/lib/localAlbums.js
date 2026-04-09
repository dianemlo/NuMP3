const LOCAL_ALBUMS_KEY = "nump3_saved_albums";

function safeRead() {
  try {
    const raw = localStorage.getItem(LOCAL_ALBUMS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(albums) {
  try {
    localStorage.setItem(LOCAL_ALBUMS_KEY, JSON.stringify(albums));
  } catch (err) {
    console.error("Failed to write saved albums:", err);
  }
}

function normalizeAlbum(input = {}) {
  return {
    id: input.id || null,
    name: input.name || "Unknown Album",
    images: Array.isArray(input.images) ? input.images : [],
    release_date: input.release_date || null,
    artist: input.artist || "Unknown Artist",
    metadata: input.metadata || null,
    tracks: Array.isArray(input.tracks) ? input.tracks : [],
    savedAt: input.savedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getSavedAlbums() {
  return safeRead();
}

export function getSavedAlbumById(albumId) {
  const id = String(albumId || "").trim();
  if (!id) return null;

  const albums = safeRead();
  return albums.find((a) => a.id === id) || null;
}

export function saveAlbumLocally(album) {
  if (!album?.id) return;

  const incoming = normalizeAlbum(album);
  const existing = safeRead();

  const index = existing.findIndex((a) => a.id === incoming.id);

  if (index === -1) {
    safeWrite([incoming, ...existing]);
    return incoming;
  }

  const current = existing[index];

  const merged = {
    ...current,
    ...incoming,

    images:
      Array.isArray(incoming.images) && incoming.images.length
        ? incoming.images
        : Array.isArray(current.images)
        ? current.images
        : [],

    metadata: incoming.metadata || current.metadata || null,

    tracks:
      Array.isArray(incoming.tracks) && incoming.tracks.length
        ? incoming.tracks
        : Array.isArray(current.tracks)
        ? current.tracks
        : [],

    savedAt: current.savedAt || incoming.savedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const next = [...existing];
  next[index] = merged;
  safeWrite(next);

  return merged;
}

export function updateSavedAlbumTracks(albumId, tracks = []) {
  const id = String(albumId || "").trim();
  if (!id) return null;

  const existing = safeRead();
  const index = existing.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const next = [...existing];
  next[index] = {
    ...next[index],
    tracks: Array.isArray(tracks) ? tracks : [],
    updatedAt: new Date().toISOString(),
  };

  safeWrite(next);
  return next[index];
}

export function updateSavedAlbumMetadata(albumId, metadata = null) {
  const id = String(albumId || "").trim();
  if (!id) return null;

  const existing = safeRead();
  const index = existing.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const next = [...existing];
  next[index] = {
    ...next[index],
    metadata: metadata || next[index].metadata || null,
    updatedAt: new Date().toISOString(),
  };

  safeWrite(next);
  return next[index];
}

export function removeSavedAlbum(albumId) {
  const id = String(albumId || "").trim();
  if (!id) return;

  const existing = safeRead();
  const next = existing.filter((a) => a.id !== id);
  safeWrite(next);
}

export function clearSavedAlbums() {
  safeWrite([]);
}