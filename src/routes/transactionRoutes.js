// src/routes/transactionRoutes.js
const { Router } = require("express");
const ctrl = require("../controllers/transactionController");
const auth = require("../middlewares/authMiddleware");

const router = Router();
router.use(auth);

// Categories
router.get("/categories",        ctrl.listCategories);
router.post("/categories",       ctrl.createCategory);
router.delete("/categories/:id", ctrl.deleteCategory);

// Transactions
router.get("/",        ctrl.list);
router.get("/summary", ctrl.summary);
router.get("/export",  ctrl.exportCSV);
router.post("/",       ctrl.create);
router.put("/:id",     ctrl.update);
router.delete("/:id",  ctrl.remove);

module.exports = router;