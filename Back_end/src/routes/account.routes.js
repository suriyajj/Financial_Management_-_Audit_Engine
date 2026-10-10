const express = require("express");

const accountController = require("../controllers/account.controller");

const router = express.Router();

router.post("/create", accountController.create);

router.get("/list", accountController.list);

module.exports = router;