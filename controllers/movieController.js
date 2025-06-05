const { Movie, Comment } = require("../model/model");

const movieController = {
    // ADD A MOVIE
    addAMovie: async (req, res) => {
        try {
            const newMovie = new Movie(req.body);
            const savedMovie = await newMovie.save();
            res.status(200).json(savedMovie);
        } catch (err) {
            res.status(500).json({ message: "Error adding movie", error: err.message });
        }
    },

    // GET ALL MOVIES
    getAllMovies: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            if (page < 1 || limit < 1) {
                return res.status(400).json({ message: "Page and limit must be positive numbers" });
            }
            const skip = (page - 1) * limit;

            const sortField = req.query.sort ? req.query.sort.split(":")[0] : "title";
            const sortOrder = req.query.sort && req.query.sort.split(":")[1] === "desc" ? -1 : 1;
            const validSortFields = ["title", "year"];
            if (!validSortFields.includes(sortField)) {
                return res.status(400).json({ message: "Invalid sort field. Use 'title' or 'year'" });
            }
            const sortOption = { [sortField]: sortOrder };

            const query = {};
            if (req.query.genre) {
                query.genres = { $in: [req.query.genre] };
            }
            if (req.query.year) {
                const year = parseInt(req.query.year);
                if (isNaN(year)) {
                    return res.status(400).json({ message: "Year must be a valid number" });
                }
                query.year = year;
            }

            const totalMovies = await Movie.countDocuments(query);
            const movies = await Movie.find(query)
                .sort(sortOption)
                .skip(skip)
                .limit(limit);

            res.status(200).json({
                data: movies,
                pagination: {
                    totalMovies,
                    totalPages: Math.ceil(totalMovies / limit),
                    currentPage: page,
                    limit
                }
            });
        } catch (err) {
            res.status(500).json({ message: "Error fetching movies", error: err.message });
        }
    },

    // GET A MOVIE
    getAMovie: async (req, res) => {
        try {
            const movie = await Movie.findById(req.params.id).populate("comments");
            if (!movie) {
                return res.status(404).json({ message: "Movie not found" });
            }
            res.status(200).json(movie);
        } catch (err) {
            res.status(500).json({ message: "Error fetching movie", error: err.message });
        }
    },

    // UPDATE MOVIE
    updateMovie: async (req, res) => {
        try {
            const movie = await Movie.findById(req.params.id);
            if (!movie) {
                return res.status(404).json({ message: "Movie not found" });
            }
            await movie.updateOne({ $set: req.body });
            res.status(200).json("Updated successfully");
        } catch (err) {
            res.status(500).json({ message: "Error updating movie", error: err.message });
        }
    },

    // DELETE MOVIE
    deleteMovie: async (req, res) => {
        try {
            await Comment.updateMany(
                { movie: req.params.id },
                { $set: { movie: null } }
            );
            await Movie.findByIdAndDelete(req.params.id);
            res.status(200).json("Deleted successfully");
        } catch (err) {
            res.status(500).json({ message: "Error deleting movie", error: err.message });
        }
    },

    // GET RUNTIME IMPACT
    getRuntimeImpact: async (req, res) => {
        try {
            const runtimeRanges = [
                { range: "0 - 60 mins", min: 0, max: 60 },
                { range: "60 - 90 mins", min: 60, max: 90 },
                { range: "90 - 120 mins", min: 90, max: 120 },
                { range: "120 - 150 mins", min: 120, max: 150 },
                { range: "150 - 180 mins", min: 150, max: 180 },
                { range: "180 - 210 mins", min: 180, max: 210 },
                { range: "210 - 240 mins", min: 210, max: 240 },
                { range: "240 - Max mins", min: 240, max: Infinity }
            ];

            const result = await Promise.all(
                runtimeRanges.map(async ({ range, min, max }) => {
                    const pipeline = [
                        { $match: { runtime: { $gte: min, $lt: max }, "imdb.rating": { $exists: true }, "tomatoes.viewer.rating": { $exists: true } } },
                        {
                            $group: {
                                _id: null,
                                totalMovies: { $sum: 1 },
                                avgImdbRating: { $avg: "$imdb.rating" },
                                avgTomatoesViewerRating: { $avg: "$tomatoes.viewer.rating" }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                runtimeRange: range,
                                totalMovies: 1,
                                avgImdbRating: { $round: ["$avgImdbRating", 2] },
                                avgTomatoesViewerRating: { $round: ["$avgTomatoesViewerRating", 2] }
                            }
                        }
                    ];
                    const [data] = await Movie.aggregate(pipeline);
                    return data || { runtimeRange: range, totalMovies: 0, avgImdbRating: 0, avgTomatoesViewerRating: 0 };
                })
            );

            res.status(200).json(result);
        } catch (err) {
            res.status(500).json({ message: "Error fetching runtime impact", error: err.message });
        }
    },

    // GET TOP 10 ACTORS
    getTopActors: async (req, res) => {
        try {
            const pipeline = [
                { $unwind: "$cast" },
                {
                    $group: {
                        _id: "$cast",
                        totalMovies: { $sum: 1 },
                        avgImdbRating: { $avg: "$imdb.rating" },
                        avgTomatoesViewerRating: { $avg: "$tomatoes.viewer.rating" }
                    }
                },
                { $sort: { totalMovies: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        _id: 0,
                        actor: "$_id",
                        totalMovies: 1,
                        avgImdbRating: { $round: ["$avgImdbRating", 2] },
                        avgTomatoesViewerRating: { $round: ["$avgTomatoesViewerRating", 2] }
                    }
                }
            ];
            const result = await Movie.aggregate(pipeline);
            res.status(200).json(result);
        } catch (err) {
            res.status(500).json({ message: "Error fetching top actors", error: err.message });
        }
    },

    // GET MONTHLY STATS
    getMonthlyStats: async (req, res) => {
        try {
            const pipeline = [
                { $match: { released: { $exists: true } } },
                {
                    $group: {
                        _id: { $month: "$released" },
                        totalMoviesReleased: { $sum: 1 },
                        avgImdbRating: { $avg: "$imdb.rating" },
                        avgTomatoesViewerRating: { $avg: "$tomatoes.viewer.rating" }
                    }
                },
                {
                    $lookup: {
                        from: "comments",
                        let: { month: "$_id" },
                        pipeline: [
                            { $match: { date: { $exists: true } } },
                            { $group: { _id: { $month: "$date" }, totalCommentsOverall: { $sum: 1 } } },
                            { $match: { $expr: { $eq: ["$_id", "$$month"] } } }
                        ],
                        as: "commentsData"
                    }
                },
                {
                    $project: {
                        _id: 0,
                        month: "$_id",
                        totalMoviesReleased: 1,
                        totalCommentsOverall: { $arrayElemAt: ["$commentsData.totalCommentsOverall", 0] },
                        avgImdbRating: { $round: ["$avgImdbRating", 2] },
                        avgTomatoesViewerRating: { $round: ["$avgTomatoesViewerRating", 2] },
                        avgCommentsPerMovie: {
                            $round: [
                                { $cond: { if: { $eq: ["$totalMoviesReleased", 0] }, then: 0, else: { $divide: [{ $arrayElemAt: ["$commentsData.totalCommentsOverall", 0] }, "$totalMoviesReleased"] } } },
                                2
                            ]
                        },
                        monthName: {
                            $arrayElemAt: [
                                ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
                                "$_id"
                            ]
                        }
                    }
                },
                { $sort: { month: 1 } }
            ];
            const result = await Movie.aggregate(pipeline);
            res.status(200).json(result.map(item => ({ ...item, totalCommentsOverall: item.totalCommentsOverall || 0, avgCommentsPerMovie: item.avgCommentsPerMovie || 0 })));
        } catch (err) {
            res.status(500).json({ message: "Error fetching monthly stats", error: err.message });
        }
    },

    // GET TOP 10 COUNTRIES
    getTopCountries: async (req, res) => {
        try {
            const pipeline = [
                { $unwind: "$countries" },
                {
                    $group: {
                        _id: "$countries",
                        totalMovies: { $sum: 1 },
                        avgImdbRating: { $avg: "$imdb.rating" }
                    }
                },
                { $sort: { totalMovies: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        _id: 0,
                        country: "$_id",
                        totalMovies: 1,
                        avgImdbRating: { $round: ["$avgImdbRating", 2] }
                    }
                }
            ];
            const result = await Movie.aggregate(pipeline);
            res.status(200).json(result);
        } catch (err) {
            res.status(500).json({ message: "Error fetching top countries", error: err.message });
        }
    },

    // GET TOP 10 GENRES
    getTopGenres: async (req, res) => {
        try {
            const pipeline = [
                { $unwind: "$genres" },
                {
                    $group: {
                        _id: "$genres",
                        totalMovies: { $sum: 1 },
                        avgImdbRating: { $avg: "$imdb.rating" },
                        avgTomatoesViewerRating: { $avg: "$tomatoes.viewer.rating" }
                    }
                },
                { $sort: { totalMovies: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        _id: 1,
                        totalMovies: 1,
                        avgImdbRating: { $round: ["$avgImdbRating", 2] },
                        avgTomatoesViewerRating: { $round: ["$avgTomatoesViewerRating", 2] }
                    }
                }
            ];
            const result = await Movie.aggregate(pipeline);
            res.status(200).json(result);
        } catch (err) {
            res.status(500).json({ message: "Error fetching top genres", error: err.message });
        }
    },

    // GET TOP 10 DIRECTORS
    getTopDirectors: async (req, res) => {
        try {
            const pipeline = [
                { $unwind: "$directors" },
                {
                    $group: {
                        _id: "$directors",
                        totalMovies: { $sum: 1 },
                        avgImdbRating: { $avg: "$imdb.rating" },
                        avgTomatoesViewerRating: { $avg: "$tomatoes.viewer.rating" }
                    }
                },
                { $sort: { totalMovies: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        _id: 0,
                        director: "$_id",
                        totalMovies: 1,
                        avgImdbRating: { $round: ["$avgImdbRating", 2] },
                        avgTomatoesViewerRating: { $round: ["$avgTomatoesViewerRating", 2] }
                    }
                }
            ];
            const result = await Movie.aggregate(pipeline);
            res.status(200).json(result);
        } catch (err) {
            res.status(500).json({ message: "Error fetching top directors", error: err.message });
        }
    }
};

module.exports = movieController;