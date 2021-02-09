//check if user is logged in
module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl //store url user was on
        req.flash('error', 'You must be signed in first!');
        return res.redirect('/login');
    }
    next();
}