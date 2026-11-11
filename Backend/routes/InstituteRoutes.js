const express = require("express");
const router = express.Router();
const {
  createInstitute,
  getAllInstitutes,
  getInstituteById,
  updateInstitute,
  deleteInstitute,
  getPublicInstitutes,
  instituteLogin,
  instituteRefreshToken
} = require("../controllers/InstituteController");
const { protect, authorize } = require("../middlewares/auth");

router.post("/register", createInstitute);
router.post("/login", instituteLogin);
router.post("/refresh-token", instituteRefreshToken);
router.get("/public", getPublicInstitutes);

// Protected routes
router.get("/", protect, authorize("admin"), getAllInstitutes);
router.get("/:instituteId", protect, getInstituteById);
router.put("/:instituteId", protect, authorize("admin"), updateInstitute);
router.delete("/:instituteId", protect, authorize("admin"), deleteInstitute);

module.exports = router;
