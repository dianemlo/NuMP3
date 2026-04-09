const mongoose = require("mongoose");

const ArtistTopicChannelSchema = new mongoose.Schema(
  {
    artistKey: { type: String, required: true, unique: true, index: true },
    artist: { type: String, required: true },
    channelId: { type: String, required: true },
    uploadsPlaylistId: { type: String, default: null },
    channelTitle: { type: String, default: "" },
    source: { type: String, default: "youtube-topic-search" },
    lastVerifiedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ArtistTopicChannel", ArtistTopicChannelSchema);