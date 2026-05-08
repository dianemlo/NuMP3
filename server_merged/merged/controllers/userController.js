const User = require('../models/User')
const Playlist = require('../models/Playlist')

const updateProfilePicture = async (req, res) => {
  try {
    const { profilePicture } = req.body

    if (!profilePicture) {
      return res.status(400).json({ message: 'No profile picture provided' })
    }

    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.profilePicture = profilePicture
    await user.save()

    res.json({
      message: 'Profile picture updated',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error updating profile picture' })
  }
}

const updateBio = async (req, res) => {
  try {
    const { bio } = req.body

    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.bio = bio || ''
    await user.save()

    res.json({
      message: 'Bio updated',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error updating bio' })
  }
}

const getExploreProfiles = async (req, res) => {
  try {
    const users = await User.find(
      { _id: { $ne: req.user._id } },
      'username bio profilePicture likedSongs'
    ).limit(10)

    const profiles = await Promise.all(users.map(async (u) => {
      const playlists = await Playlist.find(
        { userId: u._id },
        'name coverType songs'
      )

      // derive genre tags from liked song titles/artists as a rough stand-in
      // until a proper genres field is added to the schema
      const genreTags = []

      return {
        _id: u._id,
        username: u.username,
        bio: u.bio,
        profilePicture: u.profilePicture,
        likedSongs: u.likedSongs,
        likedSongCount: u.likedSongs.length,
        playlists,
        playlistCount: playlists.length,
        genreTags
      }
    }))

    res.json(profiles)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error fetching profiles' })
  }
}

function shapeAlbums(likedAlbums) {
  return likedAlbums.map(a => ({
    id: a.albumId,
    name: a.title,
    artist: a.artist,
    images: a.image ? [{ url: a.image }] : [],
    release_date: a.release_date,
    metadata: a.metadata
  }))
}

const getSavedAlbums = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(shapeAlbums(user.likedAlbums))
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching albums' })
  }
}

const saveAlbum = async (req, res) => {
  try {
    const { albumId, title, artist, image, release_date, metadata } = req.body
    if (!albumId) return res.status(400).json({ message: 'albumId required' })

    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const exists = user.likedAlbums.find(a => a.albumId === albumId)
    if (!exists) {
      user.likedAlbums.unshift({ albumId, title, artist, image, release_date, metadata })
      await user.save()
    }

    res.json(shapeAlbums(user.likedAlbums))
  } catch (error) {
    res.status(500).json({ message: 'Server error saving album' })
  }
}

const removeAlbum = async (req, res) => {
  try {
    const { id } = req.params

    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.likedAlbums = user.likedAlbums.filter(a => a.albumId !== id)
    await user.save()

    res.json(shapeAlbums(user.likedAlbums))
  } catch (error) {
    res.status(500).json({ message: 'Server error removing album' })
  }
}

const getTrendingPlaylists = async (req, res) => {
  try {
    const playlists = await Playlist.find({})
      .sort({ createdAt: -1 })
      .limit(8)

    const withUsers = await Promise.all(playlists.map(async (pl) => {
      let username = 'unknown'
      try {
        const user = await User.findById(pl.userId, 'username')
        username = user?.username || 'unknown'
      } catch (e) {
        // userId was not a valid ObjectId (e.g. "demo-user"), skip
      }
      return {
        _id: pl._id,
        name: pl.name,
        coverType: pl.coverType,
        songCount: pl.songs.length,
        username,
        songs: pl.songs
      }
    }))

    res.json(withUsers)
  } catch (error) {
    console.error('getTrendingPlaylists error:', error)
    res.status(500).json({ message: 'Server error fetching playlists' })
  }
}

module.exports = { updateProfilePicture, updateBio, getExploreProfiles, getSavedAlbums, saveAlbum, removeAlbum, getTrendingPlaylists }
