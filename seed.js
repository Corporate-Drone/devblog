const mongoose = require('mongoose');
const Blog = require('./models/blog');
const date = require('./public/javascripts/currentDate');

mongoose.connect('mongodb://localhost:27017/blog', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("MONGO CONNECTION OPEN!!!")
    })
    .catch(err => {
        console.log("MONGO CONNECTION ERROR!!!")
        console.log(err)
    });


const seedBlogs = new Blog({
    title: 'Plastic Onslaught',
    images: [{
        url:
            'https://res.cloudinary.com/dw2bqpmjv/image/upload/v1612319805/samples/sheep.jpg',
        filename: 'YelpCamp/jhmd2okanqpinkwqehqc'
    },
    {
        url:
            'https://res.cloudinary.com/dw2bqpmjv/image/upload/v1612319805/samples/sheep.jpg',
        filename: 'YelpCamp/t0o6rexg4tvtou6c9mel'
        }],
    date: date,
    description: 'Coming soon!',
    text: 'This game is inspired by the Army Men series of the early 2000s. It is still very much a work in progress.',
    author: '601e0f05fe33a20ab046a6e7'
})

Blog.insertMany(seedBlogs)
    .then(res => {
        console.log(res)
        mongoose.connection.close();
    })
    .catch(e => {
        console.log(e)
    })