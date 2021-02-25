const express = require('express');
//access route params
const router = express.Router({ mergeParams: true });
const { validateComment, isLoggedIn, isCommentAuthor } = require('../middleware');
const Blog = require('../models/blog');
const Comment = require('../models/comment');
const comments = require('../controllers/comments');
const ExpressError = require('../utils/ExpressError');
const catchAsync = require('../utils/catchAsync');


//create blog comment
router.post('/', isLoggedIn, validateComment, catchAsync(comments.createComment));

router.route('/:commentId')
    //render edit comment form
    .get(isLoggedIn, isCommentAuthor, catchAsync(comments.renderEditCommentForm))
    //update blog comment
    .put(isLoggedIn, isCommentAuthor, catchAsync(comments.updateComment))
    //delete blog comment
    .delete(isLoggedIn, isCommentAuthor, catchAsync(comments.deleteComment))



module.exports = router;