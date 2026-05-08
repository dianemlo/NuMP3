const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function createPlaylist({ name, userId, coverType = "vinyl" }) {
  const res = await fetch(`${API_BASE}/playlists/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, userId, coverType }),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || text || "Failed to create playlist");
  }

  return data;
}

export async function getPlaylists(userId) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId");

  const res = await fetch(`${API_BASE}/playlists/${encodeURIComponent(uid)}`);

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || text || "Failed to fetch playlists");
  }

  return Array.isArray(data) ? data : [];
}

export async function addSongToPlaylist(playlistId, song) {
  const pid = String(playlistId || "").trim();
  if (!pid) throw new Error("Missing playlistId");

  const res = await fetch(
    `${API_BASE}/playlists/${encodeURIComponent(pid)}/add-song`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(song),
    }
  );

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || text || "Failed to add song to playlist");
  }

  return data;
}

export async function addAlbumToPlaylist(playlistId, items) {
  const pid = String(playlistId || "").trim();
  if (!pid) throw new Error("Missing playlistId");

  const arr = Array.isArray(items) ? items : [];
  if (!arr.length) throw new Error("Missing items[]");

  const res = await fetch(
    `${API_BASE}/playlists/${encodeURIComponent(pid)}/add-album`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: arr }),
    }
  );

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || text || "Failed to add album to playlist");
  }

  return data;
}

export async function deleteSongFromPlaylist(playlistId, songIndex) {
  const pid = String(playlistId || "").trim();
  if (!pid) throw new Error("Missing playlistId");

  const idx = Number(songIndex);
  if (Number.isNaN(idx)) throw new Error("Invalid song index");

  const res = await fetch(
    `${API_BASE}/playlists/${encodeURIComponent(pid)}/songs/${idx}`,
    {
      method: "DELETE",
    }
  );

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || text || "Failed to delete song");
  }

  return data;
}

export async function deletePlaylist(playlistId) {
  const pid = String(playlistId || "").trim();
  if (!pid) throw new Error("Missing playlistId");

  const res = await fetch(`${API_BASE}/playlists/${encodeURIComponent(pid)}`, {
    method: "DELETE",
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || text || "Failed to delete playlist");
  }

  return data;
}