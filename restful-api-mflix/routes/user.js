const userController = require("../controllers/userController");
const router = require("express").Router();

// ADD USER
router.post("/", userController.addUser);

// GET ALL USERS
router.get("/", userController.getAllUsers);

// GET A USER
router.get("/:id", userController.getAUser);

// UPDATE USER
router.put("/:id", userController.updateUser);

// DELETE USER
router.delete("/:id", userController.deleteUser);

module.exports = router;