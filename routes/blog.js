const express = require('express');
//access route params
const router = express.Router({ mergeParams: true });
const blogs = require('../controllers/blog');
const catchAsync = require('../utils/catchAsync');
const { isLoggedIn, isAuthor, validateBlog } = require('../middleware');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });

router.route('/')
    .get(catchAsync(blogs.index))
    .post(isLoggedIn, upload.array('image'), validateBlog, catchAsync(blogs.createBlog))

router.get('/new', isLoggedIn, blogs.renderNewForm);

//individual blog route
router.route('/:id')
    .get(catchAsync(blogs.showBlog))
    .put(isLoggedIn, isAuthor, upload.array('image'), validateBlog, catchAsync(blogs.updateBlog))
    .delete(isLoggedIn, isAuthor, catchAsync(blogs.deleteBlog));

router.get('/:id/edit', isLoggedIn, isAuthor, blogs.renderEditForm); //edit blog

router.get('/myblogs', blogs.renderUserBlogs); //show currentUser blogs

router.post('/:id/like', isLoggedIn, blogs.likeBlog); //like & unlike blog

router.get('/index_user', blogs.renderUserBlogs); //show all blogs for particular user

module.exports = router;