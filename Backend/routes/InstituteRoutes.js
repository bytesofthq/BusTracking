const express = require("express");
const router = express.Router();
const {
  createInstitute,
  getAllInstitutes,
  getInstituteById,
  updateInstitute,
  deleteInstitute,
} = require("../controllers/InstituteController");

router.post("/register", createInstitute);
router.get("/", getAllInstitutes);
router.get("/:instituteId", getInstituteById);
router.put("/:instituteId", updateInstitute);
router.delete("/:instituteId", deleteInstitute);

module.exports = router;
