const mongoose = require("mongoose");

const SongSchema = new mongoose.Schema({
  videoId: String,
  title: String,
  artist: String,
  thumbnail: String,

  spotify: mongoose.Schema.Types.Mixed, // Store the entire Spotify track object for flexibility

  metadata: {
    spotifyTrackId: String,
    releaseDate: String,
    releaseDateSource: String,
    era: String,
    genres: [String],
    styles: [String],
    discogsId: String,
    musicbrainzId: String,
    ytViews: Number,
    popularityScore: Number,
    isTopic: Boolean,
  }
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