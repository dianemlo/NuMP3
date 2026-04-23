// const User = require('../models/User')

// const updateProfilePicture = async (req, res) => {
//   try {
//     const { profilePicture } = req.body

//     if (!profilePicture) {
//       return res.status(400).json({ message: 'No profile picture provided' })
//     }

//     const user = await User.findById(req.user._id)

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' })
//     }

//     user.profilePicture = profilePicture
//     await user.save()

//     res.json({
//       message: 'Profile picture updated',
//       user: {
//         id: user._id,
//         username: user.username,
//         email: user.email,
//         profilePicture: user.profilePicture
//       }
//     })
//   } catch (error) {
//     res.status(500).json({ message: 'Server error updating profile picture' })
//   }
// }

// const updateBio = async (req, res) => {
//   try {
//     const { bio } = req.body

//     const user = await User.findById(req.user._id)

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' })
//     }

//     user.bio = bio || ''
//     await user.save()

//     res.json({
//       message: 'Bio updated',
//       user: {
//         id: user._id,
//         username: user.username,
//         email: user.email,
//         profilePicture: user.profilePicture,
//         bio: user.bio
//       }
//     })
//   } catch (error) {
//     res.status(500).json({ message: 'Server error updating bio' })
//   }
// }

// module.exports = { updateProfilePicture, updateBio }

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
      user: { id: user._id, username: user.username, email: user.email, profilePicture: user.profilePicture }
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
      user: { id: user._id, username: user.username, email: user.email, profilePicture: user.profilePicture, bio: user.bio }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error updating bio' })
  }
}

const exploreUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id

    const users = await User.find({ _id: { $ne: currentUserId } })
      .select('-password')
      .lean()

    const results = await Promise.all(
      users.map(async (u) => {
        let playlists = []
        try {
          playlists = await Playlist.find({ userId: u._id })
            .select('name coverType songs')
            .lean()
        } catch (_) {}

        return {
          _id: u._id,
          username: u.username,
          bio: u.bio || '',
          profilePicture: u.profilePicture || '',
          likedSongs: u.likedSongs || [],
          likedSongCount: (u.likedSongs || []).length,
          playlists,
          playlistCount: playlists.length,
          genreTags: [],
        }
      })
    )

    res.json(results)
  } catch (err) {
    console.error('exploreUsers error:', err)
    res.status(500).json({ message: 'Server error fetching explore users' })
  }
}

module.exports = { updateProfilePicture, updateBio, exploreUsers }