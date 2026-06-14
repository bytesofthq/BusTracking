const express = require("express");
const router = express.Router();
const {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  deletePlan,
} = require("../controllers/PlanController");

router.post("/", createPlan);
router.get("/", getAllPlans);
router.get("/:planId", getPlanById);
router.put("/:planId", updatePlan);
router.delete("/:planId", deletePlan);

module.exports = router;
