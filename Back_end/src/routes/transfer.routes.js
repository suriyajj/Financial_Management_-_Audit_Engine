const express = require("express");

const transferController = require("../controllers/transfer.controller");

const router = express.Router();

router.post("/transfer", transferController.create);

router.get("/transactions", transferController.list);

module.exports = router;