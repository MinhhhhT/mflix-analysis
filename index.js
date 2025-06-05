const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const dotenv = require("dotenv");
const movieRoute = require("./routes/movie");
const userRoute = require("./routes/user");

dotenv.config();

// CONNECT DATABASE
mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "sample_mflix"
})
.then(() => {
    console.log("Connected to MongoDB sample_mflix");
})
.catch((err) => {
    console.error("Error connecting to MongoDB", err.message);
});

app.use(bodyParser.json({ limit: "500mb" }));
app.use(cors());
app.use(morgan("common"));

// ROUTES
app.use("/v1/movie/", movieRoute);
app.use("/v1/user/", userRoute);

app.listen(8000, () => {
    console.log("Server is running on port 8000...");
});