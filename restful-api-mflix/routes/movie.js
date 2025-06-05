const movieController = require("../controllers/movieController");
const router = require("express").Router();

// ADD A MOVIE
router.post("/", movieController.addAMovie);

// GET ALL MOVIES
router.get("/", movieController.getAllMovies);

// GET RUNTIME IMPACT
router.get("/runtime-impact", movieController.getRuntimeImpact);

// GET TOP 10 ACTORS
router.get("/top-actors", movieController.getTopActors);

// GET MONTHLY STATS
router.get("/monthly-stats", movieController.getMonthlyStats);

// GET TOP 10 COUNTRIES
router.get("/top-countries", movieController.getTopCountries);

// GET TOP 10 GENRES
router.get("/top-genres", movieController.getTopGenres);

// GET TOP 10 DIRECTORS
router.get("/top-directors", movieController.getTopDirectors);

// GET A MOVIE
router.get("/:id", movieController.getAMovie);

// UPDATE A MOVIE
router.put("/:id", movieController.updateMovie);

// DELETE A MOVIE
router.delete("/:id", movieController.deleteMovie);


module.exports = router;