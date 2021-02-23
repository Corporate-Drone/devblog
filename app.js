if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const ExpressError = require('./utils/ExpressError');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const Blog = require('./models/blog');
const Comment = require('./models/comment');
const { isLoggedIn } = require('./middleware');
const multer = require('multer');
const { storage } = require('./cloudinary');
const upload = multer({ storage });
const { cloudinary } = require('./cloudinary');
const date = require('./public/javascripts/currentDate');
const user = require('./models/user');
// const upload = multer({ dest: 'uploads/' })

mongoose.connect('mongodb://localhost:27017/blog', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const app = express();

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true })); //used to parse req.body
app.use(methodOverride('_method')); //make delete, put, etc requests
app.use(express.static(path.join(__dirname, 'public')));

const secret = process.env.SECRET || 'thishouldbeabettersecret!';

const sessionConfig = {
    name: 'session',
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig))
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

//Add user to session
passport.serializeUser(User.serializeUser());
//Remove user from session
passport.deserializeUser(User.deserializeUser());

// middleware (all views templates have access to currentUser, etc)
app.use((req, res, next) => {
    res.locals.currentUser = req.user; //passport user
    res.locals.success = req.flash('success'); //flash
    res.locals.error = req.flash('error'); //flash
    next();
})

app.get('/', (req, res) => {
    if (!req.user) {
        res.render('home')
    } else {
        res.render('/')
    }
    
})

app.get('/blog', (async (req, res) => {
    const blogs = await Blog.find({}).populate('author');
    res.render('blog/index', { blogs });
}))

app.get('/blog/new', isLoggedIn, (req, res) => {
    res.render('blog/new')
})

app.get('/blog/myblogs', async (req, res) => {
    const blogs = await Blog.find({}).populate('author');
    res.render('blog/index_user', { blogs });
})

app.post('/blog', upload.array('image'), async (req, res) => {
    const blog = new Blog(req.body.blog)
    blog.author = req.user._id;
    blog.date = date; //get current date
    //map over array added to req.files through multer
    blog.images = req.files.map(f => ({ url: f.path, filename: f.filename }))
    await blog.save();
    res.redirect(`/blog/${blog._id}`)
})

app.get('/blog/:id', (async (req, res) => {
    const blog = await (await Blog.findById(req.params.id).populate({
        path: 'comments',
        populate: {
            path: 'author'
        }
    }).populate('author likes'))

    const user = await User.findOne({ username: blog.author.username });
    res.render('blog/show', { blog, user });
}))

//populate comments with author
app.get('/blog/:id/edit', async (req, res) => {
    const { id } = req.params;
    const blog = await Blog.findById(id).populate('author');
    res.render('blog/edit', { blog });
})


app.put('/blog/:id', upload.array('image'), async (req, res) => {
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
})

app.delete('/blog/:id', async (req, res) => {
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
})

app.post('/blog/:id/like', isLoggedIn, async (req, res) => {
    const blog = await Blog.findById(req.params.id);

    //add or remove like from blog
    if (blog.likes.includes(req.user._id)) {
        blog.likes.pull(req.user._id);
    } else {
        blog.likes.push(req.user);
    }

    await blog.save();
    res.redirect(`/blog/${blog._id}`);
})

app.get('/login', (req, res) => {
    res.render('users/login');
})

app.get('/register', (req, res) => {
    res.render('users/register');
})

app.get('/users', async (req, res) => {
    const users = await User.find({});
    res.render('users/users', { users });
})

app.get('/users/:username', async (req, res) => {
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
})

app.delete('/users/:username', async (req, res) => {
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
})

app.get('/users/:username/edit', async (req, res) => {
    const { username } = req.params;
    const user = await User.findOne({ username: username });
    res.render('users/setup', { username, user });
})

app.put('/users/:username/edit', upload.single('image'), async (req, res) => {
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
})

app.get('/logout', (req, res) => {
    req.logout();
    req.flash('success', 'Come back soon!');
    res.redirect('/blog');
});

app.post('/blog/:id/comments', async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    const comment = new Comment(req.body.comment);
    //set author of new review as current user
    comment.author = req.user._id;
    comment.date = date; //set current date
    blog.comments.push(comment);
    await comment.save();
    await blog.save();
    res.redirect(`/blog/${blog._id}`);
})

app.get('/blog/:id/comments/:commentId/', async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    const comment = await Comment.findById(req.params.commentId)
    res.render('blog/editComment', {blog, comment});
})

app.put('/blog/:id/comments/:commentId/', async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    const commentId = req.params.commentId;
    const comment = await Comment.findByIdAndUpdate(commentId, { body: req.body.comment.body });
    comment.editDate = date; //set current date
    await comment.save();
    res.redirect(`/blog/${blog._id}`);
})

app.delete('/blog/:id/comments/:commentId', async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    const { id, commentId } = req.params;
    await Blog.findByIdAndUpdate(id, { $pull: { comments: commentId } });
    await Comment.findByIdAndDelete(commentId);
    res.redirect(`/blog/${blog._id}`);
})

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    req.flash('success', 'Welcome back!');
    //redirect to previous page
    const redirectUrl = req.session.returnTo || '/blog';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
})

app.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);
        //login user after registering
        req.login(registeredUser, err => {
            if (err) return next(err);
            //else
            req.flash('success', 'Welcome to DevBlog! You can add a profile picture and add information about yourself for others to see by clicking "My Profile" in the navbar. ');
            res.redirect('/blog');
        });
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('register')
    }
})




app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Something went wrong!'
    res.status(statusCode).render('error', { err })
})

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Serving on port ${port}`)
})
