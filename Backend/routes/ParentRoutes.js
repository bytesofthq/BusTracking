const express = require("express");
const router = express.Router();
const {
  createParent,
  getParentsByInstitute,
  getParentsByBus,
  updateParent,
  deleteParent,
} = require("../controllers/ParentController");

router.post("/register", createParent);
router.get("/institute/:instituteId", getParentsByInstitute);
router.get("/bus/:busId", getParentsByBus);
router.put("/:parentId", updateParent);
router.delete("/:parentId", deleteParent);

module.exports = router;
