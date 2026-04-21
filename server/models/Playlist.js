const mongoose = require("mongoose");

const SongSchema = new mongoose.Schema({
  videoId: String,
  title: String,
  artist: String,
  thumbnail: String,
});

const PlaylistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  songs: [SongSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Playlist", PlaylistSchema);
