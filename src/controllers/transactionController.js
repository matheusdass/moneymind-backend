// src/controllers/transactionController.js
const transactionService = require("../services/transactionService");
const catchAsync = require("../utils/catchAsync");
const HTTP = require("../constants/httpStatus");

// ── Categories ─────────────────────────────────────────────────
const listCategories = catchAsync(async (req, res) => {
  const { type } = req.query;
  const data = await transactionService.listCategories(req.user.id, type);
  res.status(HTTP.OK).json({ status: "success", data });
});

const createCategory = catchAsync(async (req, res) => {
  const result = await transactionService.createCategory(req.user.id, req.body);
  res.status(HTTP.CREATED).json({ status: "success", data: result });
});

const deleteCategory = catchAsync(async (req, res) => {
  const result = await transactionService.deleteCategory(req.user.id, req.params.id);
  res.status(HTTP.OK).json({ status: "success", ...result });
});

// ── Transactions ───────────────────────────────────────────────
const list = catchAsync(async (req, res) => {
  const result = await transactionService.listTransactions(req.user.id, req.query);
  res.status(HTTP.OK).json({ status: "success", ...result });
});

const summary = catchAsync(async (req, res) => {
  const result = await transactionService.getSummary(req.user.id, req.query.month, req.query.year);
  res.status(HTTP.OK).json({ status: "success", ...result });
});

const create = catchAsync(async (req, res) => {
  const result = await transactionService.createTransaction(req.user.id, req.body);
  res.status(HTTP.CREATED).json({ status: "success", data: result });
});

const update = catchAsync(async (req, res) => {
  const result = await transactionService.updateTransaction(req.user.id, req.params.id, req.body);
  res.status(HTTP.OK).json({ status: "success", data: result });
});

const remove = catchAsync(async (req, res) => {
  const result = await transactionService.deleteTransaction(req.user.id, req.params.id);
  res.status(HTTP.OK).json({ status: "success", ...result });
});

const exportCSV = catchAsync(async (req, res) => {
  const csv = await transactionService.exportToCSV(req.user.id, req.query);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="transactions.csv"');
  res.status(HTTP.OK).send(csv);
});

module.exports = { listCategories, createCategory, deleteCategory, list, summary, create, update, remove, exportCSV };