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
const userRoutes = require('./routes/users');
const blogRoutes = require('./routes/blog');
const commentRoutes = require('./routes/comments');

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

//express routes
app.use('/users', userRoutes)
app.use('/blog', blogRoutes)
app.use('/blog/:id/comments', commentRoutes)


app.get('/login', (req, res) => {
    res.render('users/login');
})

app.get('/register', (req, res) => {
    res.render('users/register');
})

app.get('/logout', (req, res) => {
    req.logout();
    req.flash('success', 'Come back soon!');
    res.redirect('/blog');
});

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
            req.flash('success', 'Welcome to DevBlog! You can add a profile picture and add information about yourself by clicking "My Profile" in the navbar.');
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
