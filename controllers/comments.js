const Blog = require('../models/blog');
const Comment = require('../models/comment');
const date = require('../public/javascripts/currentDate');

module.exports.createComment = async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    const comment = new Comment(req.body.comment);
    //set author of new comment as current user
    comment.author = req.user._id;
    comment.date = date; //set current date
    blog.comments.push(comment);
    await comment.save();
    await blog.save();
    res.redirect(`/blog/${blog._id}#comments`);
}

module.exports.renderEditCommentForm = async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    const comment = await Comment.findById(req.params.commentId)
    res.render('blog/editComment', {blog, comment});
}

module.exports.updateComment = async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    const commentId = req.params.commentId;
    const comment = await Comment.findByIdAndUpdate(commentId, { body: req.body.comment.body });
    comment.editDate = date; //set current date
    await comment.save();
    res.redirect(`/blog/${blog._id}`);
}

module.exports.deleteComment = async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    const { id, commentId } = req.params;
    await Blog.findByIdAndUpdate(id, { $pull: { comments: commentId } });
    await Comment.findByIdAndDelete(commentId);
    res.redirect(`/blog/${blog._id}`);
}