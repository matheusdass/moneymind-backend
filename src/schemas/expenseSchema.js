const { body, param, query } = require("express-validator");
const { EXPENSE_CATEGORIES } = require("../constants/categories");

const create = [
  body("description").trim().notEmpty().withMessage("obrigatória").isLength({ max: 255 }),
  body("amount").isFloat({ gt: 0 }).withMessage("deve ser um número positivo"),
  body("category")
    .trim().notEmpty().withMessage("obrigatória")
    .isIn(EXPENSE_CATEGORIES).withMessage(`deve ser uma das categorias válidas: ${EXPENSE_CATEGORIES.join(", ")}`),
  body("date").isISO8601().withMessage("formato inválido (YYYY-MM-DD)").toDate(),
  body("notes").optional().trim().isLength({ max: 500 }),
];

const update = [
  param("id").isInt({ gt: 0 }).withMessage("ID inválido"),
  body("description").optional().trim().notEmpty().isLength({ max: 255 }),
  body("amount").optional().isFloat({ gt: 0 }).withMessage("deve ser positivo"),
  body("category").optional().trim().isIn(EXPENSE_CATEGORIES),
  body("date").optional().isISO8601().withMessage("formato inválido").toDate(),
  body("notes").optional().trim().isLength({ max: 500 }),
];

const idParam = [
  param("id").isInt({ gt: 0 }).withMessage("ID inválido"),
];

const listQuery = [
  query("page").optional().isInt({ gt: 0 }),
  query("limit").optional().isInt({ gt: 0, max: 100 }),
  query("category").optional().isIn(EXPENSE_CATEGORIES),
  query("start_date").optional().isISO8601(),
  query("end_date").optional().isISO8601(),
  query("sort").optional().isIn(["date", "amount", "category", "created_at"]),
  query("order").optional().isIn(["ASC", "DESC", "asc", "desc"]),
];

module.exports = { create, update, idParam, listQuery };