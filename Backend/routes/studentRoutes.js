const express = require("express");
const router = express.Router();
const { createStudent, studentLogin, studentRefreshToken } = require("../controllers/StudentController");

router.post("/register", createStudent);
router.post("/login", studentLogin);
router.post("/refresh-token", studentRefreshToken);

module.exports = router;
