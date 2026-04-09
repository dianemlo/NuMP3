const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Playlist = require('./models/Playlist');
const Track = require('./models/Track');
const { youtubeSearch } = require('./services/youtubeService');
const { getOrEnrichTrack } = require('./utils/getOrEnrichTrack');
const { searchCatalog } = require('./services/searchService');
const { spotifyGetAlbum, spotifyGetAlbumTracks } = require('./services/spotifyService');
const { findBestYouTubeForTrack } = require('./utils/resolveYouTube');
// import likeRoutes from './routes/likes.js';
const likeRoutes = require('./routes/likes');

dotenv.config();
connectDB();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.send('NuMP3 API is running');
});

// Auth
app.use('/api/auth', require('./routes/authRoutes'));

// ── Playlists ─────────────────────────────────────────────────────────────────

app.post('/playlists/create', async (req, res) => {
  try {
    const { name, userId } = req.body;
    const newPlaylist = new Playlist({ name, userId, songs: [] });
    await newPlaylist.save();
    res.status(201).json(newPlaylist);
  } catch (error) {
    res.status(500).json({ message: 'Error creating playlist', error });
  }
});

app.get('/playlists/:userId', async (req, res) => {
  try {
    const playlists = await Playlist.find({ userId: req.params.userId });
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching playlists', error });
  }
});

app.post('/playlists/:playlistId/add-song', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const song = req.body;

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

    const artist = (song.artist || song.channel || '').trim();
    const channel = (song.channel || song.artist || '').trim();
    const title = (song.title || '').trim();

    if (!song.videoId || !title) {
      return res.status(400).json({ message: 'Missing videoId or title' });
    }

    const trackDoc = await getOrEnrichTrack({
      videoId: song.videoId,
      title,
      artist,
      channel,
      thumbnail: song.thumbnail || '',
      viewCount: Number(song.viewCount ?? 0),
      publishedAt: song.publishedAt ?? null,
      spotify: song.spotify || null,
    });

    playlist.songs.push({
      videoId: song.videoId,
      title,
      artist,
      thumbnail: song.thumbnail || '',
      metadata: trackDoc.metadata || null,
      spotify: song.spotify || null,
    });

    await playlist.save();
    res.json(playlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding song', error });
  }
});

app.post('/playlists/:playlistId/add-album', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!items.length) return res.status(400).json({ message: 'Missing items[]' });

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

    const added = [];

    for (const song of items) {
      const artist = (song.artist || song.channel || '').trim();
      const channel = (song.channel || song.artist || '').trim();
      const title = (song.title || '').trim();

      if (!song.videoId || !title) continue;
      if (playlist.songs.some((s) => s.videoId === song.videoId)) continue;

      const trackDoc = await getOrEnrichTrack({
        videoId: song.videoId,
        title,
        artist,
        channel,
        thumbnail: song.thumbnail || '',
        viewCount: Number(song.viewCount ?? song._yt?.viewCount ?? 0),
        publishedAt: song.publishedAt ?? song._yt?.publishedAt ?? null,
        spotify: song.spotify || null,
      });

      const snapshot = {
        videoId: song.videoId,
        title,
        artist,
        thumbnail: song.thumbnail || '',
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
    res.status(500).json({ message: 'Error adding album', error });
  }
});

// ── YouTube ───────────────────────────────────────────────────────────────────

app.get('/api/youtube/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const max = Math.min(Math.max(parseInt(req.query.max || '25', 10), 1), 25);

    if (!q) return res.status(400).json({ message: 'Missing q' });

    const items = await youtubeSearch(q, max);
    res.json(items);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: 'YouTube search failed' });
  }
});

// ── Catalog Search ────────────────────────────────────────────────────────────

app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || '12', 10), 1), 20);

    if (!q) return res.status(400).json({ message: 'Missing q' });

    const items = await searchCatalog(q, limit);
    res.json(items);
  } catch (err) {
    console.error('❌ /api/search failed', err?.message);

    if (err?.code === 'SPOTIFY_RATE_LIMIT') {
      return res.status(429).json({
        message: 'Spotify is rate-limiting requests right now. Please try again shortly.',
        retryAfterSeconds: err.retryAfterSeconds || 0,
      });
    }

    res.status(500).json({ message: 'Search failed' });
  }
});

// ── Track Resolution ──────────────────────────────────────────────────────────

app.post('/api/resolve-track', async (req, res) => {
  try {
    const spotifyTrackId = (req.body?.spotifyTrackId || '').trim();
    const title = (req.body?.title || '').trim();
    const artist = (req.body?.artist || '').trim();
    const spotify = req.body?.spotify || null;

    if (!title || !artist) {
      return res.status(400).json({ message: 'Missing title or artist' });
    }

    let cached = null;

    if (spotifyTrackId) {
      cached = await Track.findOne({ spotifyTrackId }).lean();
    }

    if (!cached && spotifyTrackId) {
      cached = await Track.findOne({ 'metadata.spotifyTrackId': spotifyTrackId }).lean();
    }

    if (cached?.videoId) {
      return res.json({
        videoId: cached.videoId,
        title: cached.title || title,
        artist: cached.artist || artist,
        channel: cached.channel || artist,
        thumbnail: cached.thumbnail || '',
        metadata: cached.metadata || null,
        spotifyTrackId: cached.spotifyTrackId || spotifyTrackId || null,
        cached: true,
      });
    }

    const yt = await findBestYouTubeForTrack({ artist, title });

    if (!yt) return res.status(404).json({ message: 'No playable match found' });

    const trackDoc = await getOrEnrichTrack({
      videoId: yt.videoId,
      title,
      artist,
      channel: yt.channel || artist,
      thumbnail: yt.thumbnail || '',
      viewCount: Number(yt.viewCount ?? 0),
      publishedAt: yt.publishedAt ?? null,
      spotify: spotify
        ? { ...spotify, trackId: spotifyTrackId || spotify.trackId || spotify.spotifyTrackId || null }
        : { trackId: spotifyTrackId || null },
      ytChannel: yt.channel || null,
      ytTitle: yt.title || null,
    });

    return res.json({
      videoId: yt.videoId,
      title,
      artist,
      channel: yt.channel || artist,
      thumbnail: yt.thumbnail || '',
      metadata: trackDoc.metadata || null,
      spotifyTrackId:
        trackDoc.spotifyTrackId || trackDoc.metadata?.spotifyTrackId || spotifyTrackId || null,
      cached: false,
    });
  } catch (err) {
    console.error('❌ /api/resolve-track failed', err?.message);
    res.status(500).json({ message: 'Track resolve failed' });
  }
});

// ── Albums ────────────────────────────────────────────────────────────────────

app.get('/api/album/:albumId', async (req, res) => {
  try {
    const { albumId } = req.params;
    const market = (req.query.market || 'US').toUpperCase();

    const album = await spotifyGetAlbum(albumId, market);
    if (!album) return res.status(404).json({ message: 'Album not found' });

    const tracks = await spotifyGetAlbumTracks(albumId, 50);

    const items = (tracks || []).map((t, idx) => ({
      spotifyTrackId: t.spotifyTrackId || null,
      title: t.title,
      artist: t.artist || '',
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
    console.error('❌ /api/album/:albumId failed', err?.response?.data || err.message);
    res.status(500).json({ message: 'Album fetch failed' });
  }
});

app.get('/api/album/:albumId/resolve', async (req, res) => {
  try {
    const { albumId } = req.params;
    const market = (req.query.market || 'US').toUpperCase();

    const album = await spotifyGetAlbum(albumId, market);
    if (!album) return res.status(404).json({ message: 'Album not found' });

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
    console.error('❌ /api/album/:albumId/resolve failed', err?.response?.data || err.message);
    res.status(500).json({ message: 'Album resolve failed' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ── Likes ────────────────────────────────────────────────────────────────────
app.use('/api/likes', likeRoutes);