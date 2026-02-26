const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const Playlist = require('./models/Playlist');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Atlas connected ☁️💿'))
  .catch((err) => console.error('Connection error:', err));

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

// Test route
app.get('/', (req, res) => {
  res.send('Hello, NumP3!');
});

// Create Playlist
app.post('/playlists/create', async (req, res) => {
  try {
    const { name, userId } = req.body;

    const newPlaylist = new Playlist({
      name,
      userId,
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
app.post('/playlists/:playlistId/add-song', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const song = req.body;

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    playlist.songs.push(song);
    await playlist.save();

    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: "Error adding song", error });
  }
});

// Start the server
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});