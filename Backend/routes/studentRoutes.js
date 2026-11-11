const express = require("express");
const router = express.Router();
const {
  createStudent,
  studentLogin,
  studentRefreshToken,
  getStudentDashboard,
  getStudentsByInstitute,
  getStudentByStandard,
  updateStudent,
  deleteStudent
} = require("../controllers/StudentController");
const { protect, authorize } = require("../middlewares/auth");

router.post("/register", createStudent);
router.post("/login", studentLogin);
router.post("/refresh-token", studentRefreshToken);

// Protected routes
router.get("/dashboard", protect, authorize("student"), getStudentDashboard);
router.get("/institute/:instituteId", protect, authorize("admin"), getStudentsByInstitute);
router.get("/standard/:standard", protect, authorize("admin"), getStudentByStandard);
router.put("/:studentId", protect, authorize("admin", "student"), updateStudent);
router.delete("/:studentId", protect, authorize("admin"), deleteStudent);

module.exports = router;
