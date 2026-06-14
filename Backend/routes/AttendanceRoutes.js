const express = require("express");
const router = express.Router();
const {
  markAttendance,
  getAttendance,
  getAttendanceStats,
} = require("../controllers/AttendanceController");

router.post("/", markAttendance);
router.get("/", getAttendance);
router.get("/stats", getAttendanceStats);

module.exports = router;
