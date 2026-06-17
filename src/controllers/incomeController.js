const incomeService = require("../services/incomeService");
const catchAsync = require("../utils/catchAsync");
const HTTP = require("../constants/httpStatus");

const list = catchAsync(async (req, res) => {
  const result = await incomeService.listIncomes(req.user.id, req.query);
  res.status(HTTP.OK).json({ status: "success", ...result });
});

const summary = catchAsync(async (req, res) => {
  const result = await incomeService.getSummary(req.user.id, req.query.month, req.query.year);
  res.status(HTTP.OK).json({ status: "success", ...result });
});

const create = catchAsync(async (req, res) => {
  const result = await incomeService.createIncome(req.user.id, req.body);
  res.status(HTTP.CREATED).json({ status: "success", data: result });
});

const update = catchAsync(async (req, res) => {
  const result = await incomeService.updateIncome(req.user.id, req.params.id, req.body);
  res.status(HTTP.OK).json({ status: "success", data: result });
});

const remove = catchAsync(async (req, res) => {
  const result = await incomeService.deleteIncome(req.user.id, req.params.id);
  res.status(HTTP.OK).json({ status: "success", ...result });
});

const exportCSV = catchAsync(async (req, res) => {
  const csv = await incomeService.exportToCSV(req.user.id, req.query);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="receitas.csv"');
  res.status(HTTP.OK).send(csv);
});

module.exports = { list, summary, create, update, remove, exportCSV };