// const express = require('express')
// const router = express.Router()
// const { updateProfilePicture, updateBio } = require('../controllers/userController')
// const { protect } = require('../middleware/authMiddleware')

// router.put('/profile-picture', protect, updateProfilePicture)
// router.put('/bio', protect, updateBio)

// module.exports = router

// const express = require('express')
// const router = express.Router()
// const { updateProfilePicture, updateBio, exploreUsers } = require('../controllers/userController')
// const { protect } = require('../middleware/authMiddleware')

// router.put('/profile-picture', protect, updateProfilePicture)
// router.put('/bio', protect, updateBio)
// router.get('/explore', protect, exploreUsers)

// module.exports = router

const express = require('express')
const router = express.Router()
const { updateProfilePicture, updateBio, exploreUsers } = require('../controllers/userController')
const { protect } = require('../middleware/authMiddleware')

router.put('/profile-picture', protect, updateProfilePicture)
router.put('/bio', protect, updateBio)
router.get('/explore', protect, exploreUsers)

module.exports = router