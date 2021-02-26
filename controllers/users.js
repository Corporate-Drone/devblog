const User = require('../models/user');
const Blog = require('../models/blog');
const Comment = require('../models/comment');
const { cloudinary } = require('../cloudinary');
const { renderNewForm } = require('./blog');

//show all registered blog users
module.exports.renderAllUsers = async (req, res) => {
    const users = await User.find({});
    res.render('users/users', { users });
}

module.exports.renderUserProfile = async (req, res) => {
    const { username } = req.params;
    const blogs = await Blog.find({}).populate('author');
    const user = await User.findOne({ username: username });

    //get blog data only if it matches the username
    const userBlogs = [];
    for (let blog of blogs) {
        if (blog.author.username === username) {
            userBlogs.push(blog);
        }
    }
    res.render('users/username', { userBlogs, user });
}

module.exports.deleteUser = async (req, res) => {
    const { username } = req.params;
    const user = await User.findOne({ username: username });
    // const blogs = await Blog.find({}).populate('author');
    const blogs = await (await Blog.find({}).populate({
        path: 'comments',
        populate: {
            path: 'author'
        }
    }).populate('author likes'))

    for (let blog of blogs) {
        if (blog.author.username === username) {
            //delete cloudinary blog images
            if (blog.images) {
                for (let images of blog.images) {
                    await cloudinary.uploader.destroy(images.filename);
                }
            }
            //find and delete blog
            await Blog.findByIdAndDelete(blog._id);
        }
        //delete all comments made by user
        for (let comments of blog.comments) {
            if (comments.author.username === username) {
                await Blog.findByIdAndUpdate(blog._id, {$pull: {comments: comments._id}})
                await Comment.findByIdAndDelete(comments._id);
            }
        }
        //remove all likes made by user
        for (let likes of blog.likes) {
            if (likes.username === username) {
                await Blog.findByIdAndUpdate(blog._id, {$pull: {likes: likes._id}})
            }
        }
    }
    
    //delete profile picture in cloudinary
    if (user.image && user.image.filename !== null) {
        await cloudinary.uploader.destroy(user.image.filename);
    }
    
    //Finally delete user
    await User.findByIdAndDelete(user._id);

    req.flash('success', 'Successfully deleted account!');
    res.redirect('/blog');
}

//render edit form ot edit user profile picture & about me
module.exports.renderUserEdit = async (req, res) => {
    const { username } = req.params;
    const user = await User.findOne({ username: username });
    res.render('users/setup', { username, user });
}

module.exports.updateUser = async (req, res) => {
    const { username } = req.params;
    const { about } = req.body;
    //remove image if selected to be deleted
    if (req.body.deleteImages) {
        //removes images in cloudinary
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename);
        }
        await User.findByIdAndUpdate(req.user._id, {
            image: {
                url: null,
                filename: null
            }
        });
    }

    //update profile image & about me text
    if (req.file) {
        await User.findByIdAndUpdate(req.user._id, {
            image: {
                url: req.file.path,
                filename: req.file.filename
            },
        });
        await User.findByIdAndUpdate(req.user._id, { about });
        //only update about me
    } else {
        await User.findByIdAndUpdate(req.user._id, { about });
    }


    res.redirect(`/users/${username}`);
}
