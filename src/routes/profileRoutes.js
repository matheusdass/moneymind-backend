const { Router } = require("express");
const ctrl = require("../controllers/profileController");
const auth = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");
const schema = require("../schemas/profileSchema");

const router = Router();

router.use(auth);

router.get("/",   ctrl.getProfile);
router.patch("/", schema.updateProfile, validate, ctrl.updateProfile);

module.exports = router;