const User = require('../models/User')

const updateProfilePicture = async (req, res) => {
  try {
    const { profilePicture } = req.body

    if (!profilePicture) {
      return res.status(400).json({ message: 'No profile picture provided' })
    }

    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

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

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

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

module.exports = { updateProfilePicture, updateBio }
