const express = require("express");
const router = express.Router();
const { createStudent } = require("../controllers/StudentController");

router.post("/register", createStudent);

module.exports = router;
