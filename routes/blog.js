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

router.route('/:id')
    .get(catchAsync(blogs.showBlog))
    .put(isLoggedIn, isAuthor, upload.array('image'), validateBlog, catchAsync(blogs.updateBlog))
    .delete(isLoggedIn, isAuthor, catchAsync(blogs.deleteBlog));

router.get('/:id/edit', isLoggedIn, isAuthor, blogs.renderEditForm);

router.get('/myblogs', blogs.renderUserBlogs);

router.post('/:id/like', isLoggedIn, blogs.likeBlog);

router.get('/index_user', blogs.renderUserBlogs);

module.exports = router;