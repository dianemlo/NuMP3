const express = require('express')
const router = express.Router()
const { updateProfilePicture, updateBio, getExploreProfiles, getSavedAlbums, saveAlbum, removeAlbum, getTrendingPlaylists } = require('../controllers/userController')
const { protect } = require('../middleware/authMiddleware')

router.get('/albums', protect, getSavedAlbums)
router.post('/albums', protect, saveAlbum)
router.delete('/albums/:id', protect, removeAlbum)

router.put('/profile-picture', protect, updateProfilePicture)
router.put('/bio', protect, updateBio)
router.get('/explore', protect, getExploreProfiles)
router.get('/trending-playlists', getTrendingPlaylists)

module.exports = router