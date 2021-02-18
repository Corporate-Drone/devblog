const mongoose = require('mongoose');
const Comment = require('./comment');
const Schema = mongoose.Schema;

const ImageSchema = new Schema({
    url: String,
    filename: String
})

//smaller image dislay for edit page
ImageSchema.virtual('thumbnail').get(function () {
    return this.url.replace('/upload', '/upload/w_200');
});

const opts = { toJSON: { virtuals: true } };

const BlogSchema = new Schema({
    title: String,
    images: [ImageSchema],
    date: String,
    description: String,
    text: String,
    likes: [
        {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    author: {
        //acquire author ID & populate using User model
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    comments: [
        {
            //acquire comment ID & populate using Review model
            type: Schema.Types.ObjectId,
            ref: 'Comment'
        }
    ]
}, opts);

//review needs to be deleted (review is linked to Blog) after the corresponding blog has been deleted through middleware (after every findOneAndDelete)
//previously deleted item is passed to middleware function
BlogSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await Comment.deleteMany({
            _id: {
                $in: doc.comments
            }
        })
    }
})

module.exports = mongoose.model('Blog', BlogSchema);