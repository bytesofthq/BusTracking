const express = require("express");
const router = express.Router();
const {
  createParent,
  getParentsByInstitute,
  getParentsByBus,
  updateParent,
  deleteParent,
  parentLogin,
  parentRefreshToken
} = require("../controllers/ParentController");

router.post("/register", createParent);
router.post("/login", parentLogin);
router.post("/refresh-token", parentRefreshToken);
router.get("/institute/:instituteId", getParentsByInstitute);
router.get("/bus/:busId", getParentsByBus);
router.put("/:parentId", updateParent);
router.delete("/:parentId", deleteParent);

module.exports = router;
