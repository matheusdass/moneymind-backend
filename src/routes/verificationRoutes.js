// src/routes/verificationRoutes.js
const { Router } = require("express");
const ctrl = require("../controllers/verificationController");
const auth = require("../middlewares/authMiddleware");

const router = Router();
router.use(auth);

router.get("/status",          ctrl.getStatus);
router.post("/document",       ctrl.verifyDocument);
router.post("/face/register",  ctrl.registerFace);
router.get("/face/descriptor", ctrl.getFaceDescriptor);

module.exports = router;