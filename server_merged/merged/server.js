const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const Playlist = require('./models/Playlist');
const { youtubeSearch } = require('./services/youtubeService');
const { getOrEnrichTrack } = require('./utils/getOrEnrichTrack');
const { searchCatalog } = require("./services/searchService");
const Track = require("./models/Track");
const { spotifyGetAlbum, spotifyGetAlbumTracks, spotifySearchTracks } = require('./services/spotifyService');
const { findBestYouTubeForTrack, findYouTubeCandidatesForTrack } = require('./utils/resolveYouTube');
const likeRoutes = require('./routes/likes');

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use('/api/users', require('./routes/userRoutes'))

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Atlas connected ☁️💿'))
  .catch((err) => console.error('Connection error:', err));

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

// Test route
app.get('/', (req, res) => {
  res.send('Hello, NuMP3!');
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/likes', likeRoutes);

// Create Playlist
app.post('/playlists/create', async (req, res) => {
  try {
    const { name, userId, coverType } = req.body;

    const newPlaylist = new Playlist({
      name,
      userId,
      coverType: ["vinyl", "cassette", "cd"].includes(coverType)
      ? coverType
      : "vinyl",
      songs: []
    });

    await newPlaylist.save();
    res.status(201).json(newPlaylist);
  } catch (error) {
    res.status(500).json({ message: 'Error creating playlist', error });
  }
});

// Get Playlists by User
app.get('/playlists/:userId', async (req, res) => {
  try {
    const playlists = await Playlist.find({ userId: req.params.userId });
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching playlists', error });
  }
});

// Add Song to Playlist
app.post("/playlists/:playlistId/add-song", async (req, res) => {
  try {
    const { playlistId } = req.params;
    const song = req.body;

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    const artist = (song.artist || song.channel || "").trim();
    const channel = (song.channel || song.artist || "").trim();
    const title = (song.title || "").trim();

    if (!title) {
      return res.status(400).json({ message: "Missing title" });
    }

    const trackDoc = await getOrEnrichTrack({
      videoId: song.videoId,
      title,
      artist,
      channel,
      thumbnail: song.thumbnail || "",
      viewCount: Number(song.viewCount ?? 0),
      publishedAt: song.publishedAt ?? null,
      spotify: song.spotify || null,
    });

    playlist.songs.push({
      videoId: song.videoId,
      title,
      artist,
      thumbnail: song.thumbnail || "",
      metadata: trackDoc.metadata || null,
      spotify: song.spotify || null,
    });

    await playlist.save();
    res.json(playlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding song", error });
  }
});

app.delete("/playlists/:playlistId/songs/:songIndex", async (req, res) => {
  try {
    const { playlistId, songIndex } = req.params;

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    const idx = Number(songIndex);
    if (Number.isNaN(idx) || idx < 0 || idx >= playlist.songs.length) {
      return res.status(400).json({ message: "Invalid song index" });
    }

    playlist.songs.splice(idx, 1);
    await playlist.save();
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: "Error deleting song", error });
  }
});

app.delete("/playlists/:playlistId", async (req, res) => {
  try {
    const { playlistId } = req.params;

    const deleted = await Playlist.findByIdAndDelete(playlistId);

    if (!deleted) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    res.json({ message: "Playlist deleted", playlistId });
  } catch (error) {
    res.status(500).json({ message: "Error deleting playlist", error });
  }
});

// Add Album (batch) to Playlist
app.post("/playlists/:playlistId/add-album", async (req, res) => {
  try {
    const { playlistId } = req.params;

    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!items.length) {
      return res.status(400).json({ message: "Missing items[]" });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    const added = [];

    for (const song of items) {
      const artist = (song.artist || song.channel || "").trim();
      const channel = (song.channel || song.artist || "").trim();
      const title = (song.title || "").trim();

      if (!song.videoId || !title) continue;

      const already = playlist.songs.some((s) => s.videoId === song.videoId);
      if (already) continue;

      const trackDoc = await getOrEnrichTrack({
        videoId: song.videoId,
        title,
        artist,
        channel,
        thumbnail: song.thumbnail || "",
        viewCount: Number(song.viewCount ?? song._yt?.viewCount ?? 0),
        publishedAt: song.publishedAt ?? song._yt?.publishedAt ?? null,
        spotify: song.spotify || null,
      });

      const snapshot = {
        videoId: song.videoId,
        title,
        artist,
        thumbnail: song.thumbnail || "",
        metadata: trackDoc.metadata || null,
        spotify: song.spotify || null,
      };

      playlist.songs.push(snapshot);
      added.push(snapshot);
    }

    await playlist.save();
    res.json({ playlist, addedCount: added.length, added });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding album", error });
  }
});

// YouTube Search
app.get("/api/youtube/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const max = Math.min(Math.max(parseInt(req.query.max || "25", 10), 1), 25);

    if (!q) return res.status(400).json({ message: "Missing q" });

    const items = await youtubeSearch(q, max);
    res.json(items);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "YouTube search failed" });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || "12", 10), 1), 20);

    if (!q) return res.status(400).json({ message: "Missing q" });

    const items = await searchCatalog(q, limit);
    res.json(items);
  } catch (err) {
    console.error("❌ /api/search failed", {
      status: err?.status || err?.response?.status,
      url: err?.response?.config?.url || err?.config?.url,
      params: err?.response?.config?.params || err?.config?.params,
      data: err?.response?.data,
      message: err?.message,
      stack: err?.stack,
    });

    if (err?.code === "SPOTIFY_RATE_LIMIT") {
      return res.status(429).json({
        message: "Spotify is rate-limiting requests right now. Please try again shortly.",
        retryAfterSeconds: err.retryAfterSeconds || 0,
      });
    }

    res.status(500).json({ message: "Search failed" });
  }
});

app.post("/api/resolve-track", async (req, res) => {
  try {
    const spotifyTrackId = (req.body?.spotifyTrackId || "").trim();
    const title = (req.body?.title || "").trim();
    const artist = (req.body?.artist || "").trim();
    const spotify = req.body?.spotify || null;

    if (!title || !artist) {
      return res.status(400).json({ message: "Missing title or artist" });
    }

    let cached = null;

    if (spotifyTrackId) {
      cached = await Track.findOne({
        $or: [
          { spotifyTrackId },
          { "metadata.spotifyTrackId": spotifyTrackId },
        ],
      }).lean();
    }

    if (!cached && title && artist) {
      const titleEsc = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const artistEsc = artist.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cached = await Track.findOne({
        title: { $regex: new RegExp(`^${titleEsc}$`, "i") },
        artist: { $regex: new RegExp(`^${artistEsc}$`, "i") },
        "metadata.enrichmentStatus": "full",
      }).lean();
    }

    if (cached?.videoId) {
      return res.json({
        videoId: cached.videoId,
        title: cached.title || title,
        artist: cached.artist || artist,
        channel: cached.channel || artist,
        thumbnail: cached.thumbnail || "",
        metadata: cached.metadata || null,
        spotifyTrackId:
          cached.spotifyTrackId ||
          cached.metadata?.spotifyTrackId ||
          spotifyTrackId ||
          null,
        cached: true,
      });
    }

    const candidates = await findYouTubeCandidatesForTrack(
      { artist, title },
      { limit: 5 }
    );
    const yt = candidates[0];

    if (!yt) {
      return res.status(404).json({ message: "No playable match found" });
    }

    const trackDoc = await getOrEnrichTrack({
      videoId: yt.videoId,
      title,
      artist,
      channel: yt.channel || artist,
      thumbnail: yt.thumbnail || "",
      viewCount: Number(yt.viewCount ?? 0),
      publishedAt: yt.publishedAt ?? null,
      spotify: spotify
        ? {
            ...spotify,
            trackId:
              spotifyTrackId ||
              spotify.trackId ||
              spotify.spotifyTrackId ||
              null,
          }
        : { trackId: spotifyTrackId || null },
      ytChannel: yt.channel || null,
      ytTitle: yt.title || null,
    });

    const plain = trackDoc?.toObject ? trackDoc.toObject() : trackDoc;

    return res.json({
      videoId: yt.videoId,
      title,
      artist,
      channel: yt.channel || artist,
      thumbnail: yt.thumbnail || "",
      metadata: plain.metadata || null,
      spotifyTrackId:
        plain.spotifyTrackId ||
        plain.metadata?.spotifyTrackId ||
        spotifyTrackId ||
        null,
      cached: false,
      candidates: candidates.map((c) => ({
        videoId: c.videoId,
        title: c.title,
        channel: c.channel,
        thumbnail: c.thumbnail,
      })),
    });
  } catch (err) {
    console.error("❌ /api/resolve-track failed", {
      message: err?.message,
      stack: err?.stack,
    });
    res.status(500).json({ message: "Track resolve failed" });
  }
});

app.get("/api/album/:albumId", async (req, res) => {
  try {
    const { albumId } = req.params;
    const market = (req.query.market || "US").toUpperCase();

    const album = await spotifyGetAlbum(albumId, market);
    if (!album) {
      return res.status(404).json({ message: "Album not found" });
    }

    const tracks = await spotifyGetAlbumTracks(albumId, 50);

    const items = (tracks || []).map((t, idx) => ({
      spotifyTrackId: t.spotifyTrackId || null,
      title: t.title,
      artist: t.artist || "",
      artistId: t.artistId || null,
      trackNumber: t.trackNumber ?? idx + 1,
      discNumber: t.discNumber ?? 1,
      album: {
        id: album.id,
        name: album.name,
        images: album.images || [],
        release_date: album.release_date || null,
      },
    }));

    res.json({ album, items });
  } catch (err) {
    console.error("❌ /api/album/:albumId failed", err?.response?.data || err.message);
    res.status(500).json({ message: "Album fetch failed" });
  }
});

app.get("/api/album/:albumId/resolve", async (req, res) => {
  try {
    const { albumId } = req.params;
    const market = (req.query.market || "US").toUpperCase();

    const album = await spotifyGetAlbum(albumId, market);
    if (!album) return res.status(404).json({ message: "Album not found" });

    const tracks = await spotifyGetAlbumTracks(albumId, 50);

    const items = [];
    for (const t of tracks) {
      const yt = await findBestYouTubeForTrack({ artist: t.artist, title: t.title });
      if (!yt) continue;

      items.push({
        videoId: yt.videoId,
        title: t.title,
        channel: t.artist,
        thumbnail: album.images?.[0]?.url || yt.thumbnail,
        spotify: {
          trackId: t.spotifyTrackId || null,
          artistId: t.artistId || null,
          albumId: album.id,
          albumName: album.name,
          release_date: album.release_date,
          albumImages: album.images || [],
        },
        _yt: yt,
      });
    }

    res.json({ album, items });
  } catch (err) {
    console.error("❌ /api/album/:albumId/resolve failed", err?.response?.data || err.message);
    res.status(500).json({ message: "Album resolve failed" });
  }
});

app.post("/api/generate-playlist", async (req, res) => {
  try {
    const { genre, decade, limit = 15 } = req.body;

    if (!genre || !decade) {
      return res.status(400).json({ message: "Missing genre or decade" });
    }

    const decadeMap = {
      "40s": "1940-1949", "50s": "1950-1959",
      "60s": "1960-1969", "70s": "1970-1979", "80s": "1980-1989",
      "90s": "1990-1999", "00s": "2000-2009", "10s": "2010-2019",
      "20s": "2020-2029",
    };

    const yearRange = decadeMap[decade];
    if (!yearRange) {
      return res.status(400).json({ message: "Invalid decade" });
    }

    const randomOffset = Math.floor(Math.random() * 50)
    const spotifyTracks = await spotifySearchTracks(`genre:${genre} year:${yearRange}`, limit, randomOffset).catch(() => []);

    if (!spotifyTracks?.length) {
      return res.status(404).json({ message: "No tracks found for that genre and decade" });
    }

    const results = spotifyTracks.map((t) => ({
      title: t.title,
      artist: t.artist,
      thumbnail: t.album?.images?.[0]?.url || "",
      spotifyTrackId: t.spotifyTrackId || null,
      artistId: t.artistId || null,
      album: t.album || null,
      metadata: { era: decade },
    }));

    res.json({ tracks: results, genre, decade });
  } catch (err) {
    console.error("❌ /api/generate-playlist failed", err?.message);
    res.status(500).json({ message: "Playlist generation failed" });
  }
});

// Start the server
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});