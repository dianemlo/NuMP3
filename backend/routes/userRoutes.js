const express = require('express')
const router = express.Router()
const { updateProfilePicture, updateBio } = require('../controllers/userController')
const { protect } = require('../middleware/authMiddleware')

router.put('/profile-picture', protect, updateProfilePicture)
router.put('/bio', protect, updateBio)

module.exports = router
