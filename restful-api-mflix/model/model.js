const mongoose = require("mongoose");

// Movie Schema
const movieSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    year: {
        type: Number
    },
    released: {
        type: Date
    },
    runtime: {
        type: Number // Runtime in minutes
    },
    genres: {
        type: [String]
    },
    directors: {
        type: [String]
    },
    writers: {
        type: [String]
    },
    actors: {
        type: [String]
    },
    plot: {
        type: String
    },
    languages: {
        type: [String]
    },
    countries: {
        type: [String]
    },
    awards: {
        wins: { type: Number },
        nominations: { type: Number },
        text: { type: String }
    },
    poster: {
        type: String // URL to poster image
    },
    ratings: [{
        source: { type: String },
        value: { type: String }
    }],
    metascore: {
        type: Number
    },
    imdb: {
        rating: { type: Number },
        votes: { type: Number },
        id: { type: Number }
    },
    tomatoes: {
        viewer: {
            rating: { type: Number },
            numReviews: { type: Number },
            meter: { type: Number }
        },
        fresh: { type: Number },
        critic: {
            rating: { type: Number },
            numReviews: { type: Number },
            meter: { type: Number }
        },
        rotten: { type: Number },
        lastUpdated: { type: Date }
    },
    plot_embedding: {
        type: [Number] // Vector embedding for Atlas Search
    },
    type: {
        type: String // e.g., "movie", "series"
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    }]
}, { collection: "movies" });

// User Schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    }]
}, { collection: "users" });

// Comment Schema
const commentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    movie: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Movie",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { collection: "comments" });


// Create Models
let Movie = mongoose.model("Movie", movieSchema);
let User = mongoose.model("User", userSchema);
let Comment = mongoose.model("Comment", commentSchema);

module.exports = { Movie, User, Comment };