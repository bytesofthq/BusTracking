const express = require("express");
const router = express.Router();
const {
  createSubscription,
  getSubscriptionsByInstitute,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
} = require("../controllers/SubscriptionController");

router.post("/", createSubscription);
router.get("/institute/:instituteId", getSubscriptionsByInstitute);
router.get("/:subscriptionId", getSubscriptionById);
router.put("/:subscriptionId", updateSubscription);
router.delete("/:subscriptionId", deleteSubscription);

module.exports = router;
