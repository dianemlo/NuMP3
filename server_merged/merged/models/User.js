const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    profilePicture: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    likedSongs: [
      {
        songId: String,
        title: String,
        artist: String,
        image: String,
      }
    ],
    likedAlbums: [
      {
        albumId: mongoose.Schema.Types.ObjectId,
        title: String,
      }
    ],
    likedProfiles: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        username: String,
      }
    ]
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('User', userSchema)
