const mongoose = require("mongoose");

const TrackSchema = new mongoose.Schema(
  {
    trackId: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },

    videoId: {
      type: String,
      index: true,
      default: null,
    },

    spotifyTrackId: {
      type: String,
      index: true,
      default: null,
    },

    artistId: {
      type: String,
      index: true,
      default: null,
    },

    albumId: {
      type: String,
      index: true,
      default: null,
    },

    albumName: {
      type: String,
      default: null,
    },

    title: {
      type: String,
      default: "",
      index: true,
    },

    artist: {
      type: String,
      default: "",
      index: true,
    },

    channel: {
      type: String,
      default: null,
    },

    thumbnail: {
      type: String,
      default: null,
    },

    metadata: {
      spotifyTrackId: {
        type: String,
        index: true,
        default: null,
      },

      releaseDate: {
        type: String,
        default: null,
      },

      releaseDateSource: {
        type: String,
        default: null,
      },

      era: {
        type: String,
        default: null,
      },

      genres: {
        type: [String],
        default: [],
      },

      styles: {
        type: [String],
        default: [],
      },

      popularity: {
        type: Number,
        default: null,
      },

      followers: {
        type: Number,
        default: null,
      },

      discogsId: {
        type: String,
        default: null,
      },

      musicbrainzId: {
        type: String,
        default: null,
      },

      ytViews: {
        type: Number,
        default: null,
      },

      popularityScore: {
        type: Number,
        default: null,
      },

      isTopic: {
        type: Boolean,
        default: false,
      },

      enrichmentStatus: {
        type: String,
        enum: ["none", "partial", "full"],
        default: "none",
        index: true,
      },

      pendingEnrichment: {
        type: Boolean,
        default: false,
      },
    },

    enrichedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

TrackSchema.index({ title: 1, artist: 1 });
TrackSchema.index({ artist: 1, title: 1 });
TrackSchema.index({ enrichedAt: -1 });

module.exports = mongoose.model("Track", TrackSchema);