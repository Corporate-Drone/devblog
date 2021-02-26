const { blogSchema, commentSchema } = require('./schemas.js');
const ExpressError = require('./utils/ExpressError');
const Blog = require('./models/blog');
const Comment = require('./models/comment');


//check if user is logged in
module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl //store url user was on
        req.flash('error', 'You must be signed in first!');
        return res.redirect('/login');
    }
    next();
}

//check for error when validating blog Joi schema when creating a new blog 
module.exports.validateBlog = (req, res, next) => {
    const { error } = blogSchema.validate(req.body);
    if (error) {
        //map over details to create single string message
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }
}

//check if viewed blog belongs to the current user
module.exports.isAuthor = async (req, res, next) => {
    const { id } = req.params; //take id from URL
    const blog = await Blog.findById(id); //lookup blog wth ID

    if (!blog.author.equals(req.user._id) && req.user.username !== 'admin') { //check if logged in user ID is equal to blog author ID
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/blog/${id}`);
    }
    next();
}

//check if account belongs to the current user
module.exports.isAccount = async (req, res, next) => {
    const { username } = req.params; //take username from URL
    if (username !== req.user.username && req.user.username !== 'admin') { //check if logged in user is equal to account name
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/users/${username}`);
    }
    next();
}

//check if viewed blog comments belong to the current user
module.exports.isCommentAuthor = async (req, res, next) => {
    const { id, commentId } = req.params; //take id from URL get comment ID
    const comment = await Comment.findById(commentId); //lookup comment wth ID
    if (!comment.author.equals(req.user._id) && req.user.username !== 'admin') { //check if logged in user ID is equal to comment author ID
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/blog/${id}`);
    }
    next();
}

//validate schema from req.body (Joi schema)
module.exports.validateComment = (req, res, next) => {
    const { error } = commentSchema.validate(req.body);
    if (error) {
        //map over details to create single string message
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }
}