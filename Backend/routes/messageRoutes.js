const express = require("express");
const router = express.Router();
const { sendMessage, sendEmergencyMessage } = require("../controllers/MessageController");

// Route to send messages to parents and students of a specific bus
router.post("/send/:busId", sendMessage);

// Route to send emergency messages to the institute of a specific bus
router.post("/emergency/:busId", sendEmergencyMessage);

module.exports = router;
