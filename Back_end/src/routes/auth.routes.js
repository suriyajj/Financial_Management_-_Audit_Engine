const express = require("express");

const {
  authenticate,
} = require("../middleware/auth.middleware");

const authController = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", authController.register);


router.post("/login", authController.login);


router.post("/refresh", authController.refresh);

router.post("/users/refresh-test", authController.refreshUsingBearer);

router.get("/me", authenticate, authController.getCurrentUser);


router.post("/logout", authController.logout);

module.exports = router;