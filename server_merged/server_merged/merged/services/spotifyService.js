const axios = require("axios");

console.log("✅ spotifyService loaded from:", __filename);

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

let accessToken = null;
let tokenExpiresAt = 0;

function getClientCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
  }

  return { clientId, clientSecret };
}

async function fetchSpotifyToken() {
  const { clientId, clientSecret } = getClientCredentials();

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");

  const res = await axios.post(SPOTIFY_TOKEN_URL, params.toString(), {
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 10000,
  });

  const token = res?.data?.access_token;
  const expiresIn = Number(res?.data?.expires_in || 3600);

  if (!token) {
    throw new Error("Spotify token response missing access_token");
  }

  accessToken = token;
  tokenExpiresAt = Date.now() + Math.max(0, expiresIn - 60) * 1000;

  return accessToken;
}

async function getSpotifyAccessToken() {
  const stillValid = accessToken && Date.now() < tokenExpiresAt;
  if (stillValid) return accessToken;
  return fetchSpotifyToken();
}

function makeRateLimitError(err) {
  const retryAfterHeader = err?.response?.headers?.["retry-after"];
  const retryAfterSeconds = Number(retryAfterHeader || 0);

  const wrapped = new Error(
    `Spotify rate limit hit${retryAfterSeconds ? `, retry after ${retryAfterSeconds}s` : ""}`
  );

  wrapped.code = "SPOTIFY_RATE_LIMIT";
  wrapped.status = 429;
  wrapped.retryAfterSeconds = Number.isFinite(retryAfterSeconds)
    ? retryAfterSeconds
    : 0;

  return wrapped;
}

async function spotifyRequest(config, attempt = 0) {
  const token = await getSpotifyAccessToken();

  const finalConfig = {
    ...config,
    headers: {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    },
    timeout: config.timeout || 10000,
  };

  try {
    const res = await axios(finalConfig);
    return res;
  } catch (err) {
    const status = err?.response?.status || null;

    console.error("[spotify] request FAILED", {
      method: (finalConfig.method || "get").toUpperCase(),
      url: finalConfig.url,
      status,
      attempt,
      message: err?.message,
      data: err?.response?.data || null,
    });

    if (status === 401 && attempt < 1) {
      accessToken = null;
      tokenExpiresAt = 0;
      await fetchSpotifyToken();
      return spotifyRequest(config, attempt + 1);
    }

    if (status === 429) {
      throw makeRateLimitError(err);
    }

    throw err;
  }
}

function normalizeArtist(artist = {}) {
  return {
    id: artist.id || null,
    name: artist.name || "",
    genres: Array.isArray(artist.genres) ? artist.genres : [],
    popularity: Number(artist.popularity || 0),
    followers: Number(artist.followers?.total || 0),
    images: Array.isArray(artist.images) ? artist.images : [],
  };
}

function normalizeTrack(track = {}) {
  const artists = Array.isArray(track.artists) ? track.artists : [];
  const primaryArtist = artists[0] || {};
  const album = track.album || {};

  return {
    spotifyTrackId: track.id || null,
    title: track.name || "",
    artist: primaryArtist.name || "",
    artistId: primaryArtist.id || null,
    artists: artists.map((a) => ({
      id: a.id || null,
      name: a.name || "",
    })),
    popularity: Number(track.popularity || 0),
    album: {
      id: album.id || null,
      name: album.name || "",
      images: Array.isArray(album.images) ? album.images : [],
      release_date: album.release_date || null,
    },
  };
}

async function spotifySearchArtist(query) {
  const q = String(query || "").trim();
  if (!q) return null;

  const res = await spotifyRequest({
    method: "get",
    url: `${SPOTIFY_API_BASE}/search`,
    params: {
      q,
      type: "artist",
      limit: 1,
    },
    timeout: 10000,
  });

  const items = res?.data?.artists?.items || [];
  const artist = items[0] ? normalizeArtist(items[0]) : null;

  return artist;
}

async function spotifySearchTracks(query, limit = 10, offset = 0) {
  const q = String(query || "").trim();
  if (!q) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 10);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const res = await spotifyRequest({
    method: "get",
    url: `${SPOTIFY_API_BASE}/search`,
    params: {
      q,
      type: "track",
      limit: safeLimit,
      offset: safeOffset,
    },
    timeout: 10000,
  });

  const items = Array.isArray(res?.data?.tracks?.items)
    ? res.data.tracks.items.map(normalizeTrack)
    : [];

  return items;
}

async function spotifySearchTrack(query) {
  const items = await spotifySearchTracks(query, 1, 0);
  return items[0] || null;
}

async function spotifyGetAlbum(albumId, market = "US") {
  const id = String(albumId || "").trim();
  if (!id) return null;

  const res = await spotifyRequest({
    method: "get",
    url: `${SPOTIFY_API_BASE}/albums/${encodeURIComponent(id)}`,
    params: { market: String(market || "US").toUpperCase() },
    timeout: 10000,
  });

  const album = res?.data || null;
  if (!album) return null;

  const normalized = {
    id: album.id || null,
    name: album.name || "",
    images: Array.isArray(album.images) ? album.images : [],
    release_date: album.release_date || null,
    total_tracks: Number(album.total_tracks || 0),
    artists: Array.isArray(album.artists)
      ? album.artists.map((a) => ({
          id: a.id || null,
          name: a.name || "",
        }))
      : [],
  };

  return normalized;
}

async function spotifyGetAlbumTracks(albumId, limit = 50) {
  const id = String(albumId || "").trim();
  if (!id) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 50);

  const res = await spotifyRequest({
    method: "get",
    url: `${SPOTIFY_API_BASE}/albums/${encodeURIComponent(id)}/tracks`,
    params: {
      limit: safeLimit,
      offset: 0,
    },
    timeout: 10000,
  });

  const items = Array.isArray(res?.data?.items)
    ? res.data.items.map((track) => {
        const artists = Array.isArray(track.artists) ? track.artists : [];
        const primaryArtist = artists[0] || {};

        return {
          spotifyTrackId: track.id || null,
          title: track.name || "",
          artist: primaryArtist.name || "",
          artistId: primaryArtist.id || null,
          trackNumber: track.track_number ?? null,
          discNumber: track.disc_number ?? null,
        };
      })
    : [];

  return items;
}

module.exports = {
  spotifySearchArtist,
  spotifySearchTrack,
  spotifySearchTracks,
  spotifyGetAlbum,
  spotifyGetAlbumTracks,
};