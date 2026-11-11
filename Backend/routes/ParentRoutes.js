const express = require("express");
const router = express.Router();
const {
  createParent,
  getParentsByInstitute,
  getParentsByBus,
  updateParent,
  deleteParent,
  parentLogin,
  parentRefreshToken,
  getParentDashboard
} = require("../controllers/ParentController");
const { protect, authorize } = require("../middlewares/auth");

router.post("/register", createParent);
router.post("/login", parentLogin);
router.post("/refresh-token", parentRefreshToken);

// Protected routes
router.get("/dashboard", protect, authorize("parent"), getParentDashboard);
router.get("/institute/:instituteId", protect, authorize("admin"), getParentsByInstitute);
router.get("/bus/:busId", protect, authorize("admin", "driver"), getParentsByBus);
router.put("/:parentId", protect, authorize("admin", "parent"), updateParent);
router.delete("/:parentId", protect, authorize("admin"), deleteParent);

module.exports = router;
