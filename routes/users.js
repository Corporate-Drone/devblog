const express = require('express');
const router = express.Router({ mergeParams: true });
const catchAsync = require('../utils/catchAsync');
const users = require('../controllers/users');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const { isLoggedIn, isAccount } = require('../middleware');

//show all registered users
router.get('/', users.renderAllUsers);

//individual user profile
router.route('/:username')
    .get(catchAsync(users.renderUserProfile))
    .delete(isLoggedIn, isAccount, catchAsync(users.deleteUser))
    
router.route('/:username/edit')
    .get(isLoggedIn, isAccount, catchAsync(users.renderUserEdit))
    .put(isLoggedIn, isAccount, upload.single('image'), catchAsync(users.updateUser))


module.exports = router;