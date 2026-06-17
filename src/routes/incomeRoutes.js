const { Router } = require("express");
const ctrl = require("../controllers/incomeController");
const auth = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");
const schema = require("../schemas/incomeSchema");

const router = Router();

router.use(auth);

router.get("/",         schema.listQuery, validate, ctrl.list);
router.get("/summary",  ctrl.summary);
router.get("/export",   ctrl.exportCSV);
router.post("/",        schema.create,    validate, ctrl.create);
router.put("/:id",      schema.update,    validate, ctrl.update);
router.delete("/:id",   schema.idParam,   validate, ctrl.remove);

module.exports = router;