const express = require("express");
const router = express.Router();
const {
  markAttendance,
  getAttendance,
  getAttendanceStats,
  getPlannerMonth,
  updatePlannerAttendance,
  getAbsentStudentsForBus,
  getAbsentStudentsForInstitute
} = require("../controllers/AttendanceController");
const { protect } = require("../middlewares/auth");

router.post("/", markAttendance);
router.get("/", getAttendance);
router.get("/stats", getAttendanceStats);

// Parent Leave Planner (Monthly Attendance Calendar)
router.get("/planner", protect, getPlannerMonth);
router.post("/planner", protect, updatePlannerAttendance);

// Driver & Institute view of absent students
router.get("/planner/bus", protect, getAbsentStudentsForBus);
router.get("/planner/institute", protect, getAbsentStudentsForInstitute);

module.exports = router;
