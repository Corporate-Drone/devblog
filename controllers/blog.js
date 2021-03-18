const Blog = require('../models/blog');
const { cloudinary } = require('../cloudinary');
const User = require('../models/user');
const {date} = require('../public/javascripts/currentDate');

//render all blogs
module.exports.index = async (req, res) => {
    const blogs = await Blog.find({}).populate('author');
    res.render('blog/index', { blogs });
}

//render form to create a new campground
module.exports.renderNewForm = (req, res) => {
    res.render('blog/new');
}

//render blogs created by the current user
module.exports.renderUserBlogs = async (req, res) => {
    const blogs = await Blog.find({}).populate('author');
    res.render('blog/index_user', { blogs });
}

//create a new blog
module.exports.createBlog = async (req, res) => {
    const blog = new Blog(req.body.blog)
    blog.author = req.user._id;
    blog.date = date; //get current date
    //map over array added to req.files through multer
    blog.images = req.files.map(f => ({ url: f.path, filename: f.filename }))
    await blog.save();
    res.redirect(`/blog/${blog._id}`)
}

//display blog
module.exports.showBlog = async (req, res) => {
    const blog = await (await Blog.findById(req.params.id).populate({
        path: 'comments',
        populate: {
            path: 'author'
        }
    }).populate('author likes'))

    const user = await User.findOne({ username: blog.author.username });
    res.render('blog/show', { blog, user });
}

//render form to edit blog
module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const blog = await Blog.findById(id).populate('author');
    res.render('blog/edit', { blog });
}

//update a blog post
module.exports.updateBlog = async (req, res) => {
    const { id } = req.params;
    const blog = await Blog.findByIdAndUpdate(id, { ...req.body.blog });

    //map over array added to req.files through multer
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    blog.images.push(...imgs); //add to existing images

    if (req.body.deleteImages) {
        //removes images in cloudinary
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename);
        }
        //remove any images checked off to be deleted
        await blog.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
    }

    await blog.save();
    req.flash('success', 'Successfully updated post!');
    res.redirect(`/blog/${blog._id}`);
}

module.exports.deleteBlog = async (req, res) => {
    const { id } = req.params;
    const foundBlog = await Blog.findById(id)
    //remove blog images in cloudinary
    for (let image of foundBlog.images) {
        console.log(image.filename)
        await cloudinary.uploader.destroy(image.filename);
    }
    //find and delete blog
    await Blog.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted post!');
    res.redirect('/blog');
}

module.exports.likeBlog = async (req, res) => {
    const blog = await Blog.findById(req.params.id);

    //add or remove like from blog
    if (blog.likes.includes(req.user._id)) {
        blog.likes.pull(req.user._id);
    } else {
        blog.likes.push(req.user);
    }

    await blog.save();
    res.redirect(`/blog/${blog._id}`);
}