const { User, Comment } = require("../model/model");

const userController = {
    // ADD USER
    addUser: async (req, res) => {
        try {
            const newUser = new User(req.body);
            const savedUser = await newUser.save();
            res.status(200).json(savedUser);
        } catch (err) {
            res.status(500).json({ message: "Error adding user", error: err.message });
        }
    },

    // GET ALL USERS
    getAllUsers: async (req, res) => {
        try {
            // Parse query parameters
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            if (page < 1 || limit < 1) {
                return res.status(400).json({ message: "Page and limit must be positive numbers" });
            }
            const skip = (page - 1) * limit;

            // Sorting
            const sortField = req.query.sort ? req.query.sort.split(":")[0] : "name";
            const sortOrder = req.query.sort && req.query.sort.split(":")[1] === "desc" ? -1 : 1;
            const validSortFields = ["name", "email"];
            if (!validSortFields.includes(sortField)) {
                return res.status(400).json({ message: "Invalid sort field. Use 'name' or 'email'" });
            }
            const sortOption = { [sortField]: sortOrder };

            // Filtering
            const query = {};
            if (req.query.email) {
                query.email = { $regex: req.query.email, $options: "i" }; // Case-insensitive search
            }

            // Execute query
            const totalUsers = await User.countDocuments(query);
            const users = await User.find(query)
                .sort(sortOption)
                .skip(skip)
                .limit(limit);

            res.status(200).json({
                data: users,
                pagination: {
                    totalUsers,
                    totalPages: Math.ceil(totalUsers / limit),
                    currentPage: page,
                    limit
                }
            });
        } catch (err) {
            res.status(500).json({ message: "Error fetching users", error: err.message });
        }
    },

    // GET A USER
    getAUser: async (req, res) => {
        try {
            const user = await User.findById(req.params.id).populate("comments");
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            res.status(200).json(user);
        } catch (err) {
            res.status(500).json({ message: "Error fetching user", error: err.message });
        }
    },

    // UPDATE USER
    updateUser: async (req, res) => {
        try {
            const user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            await user.updateOne({ $set: req.body });
            res.status(200).json("Updated successfully");
        } catch (err) {
            res.status(500).json({ message: "Error updating user", error: err.message });
        }
    },

    // DELETE USER
    deleteUser: async (req, res) => {
        try {
            await Comment.updateMany(
                { user: req.params.id },
                { $set: { user: null } }
            );
            await User.findByIdAndDelete(req.params.id);
            res.status(200).json("Deleted successfully");
        } catch (err) {
            res.status(500).json({ message: "Error deleting user", error: err.message });
        }
    }
};

module.exports = userController;