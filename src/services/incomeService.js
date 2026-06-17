const incomeRepo = require("../repositories/incomeRepository");
const AppError = require("../utils/AppError");
const MSG = require("../constants/messages");
const HTTP = require("../constants/httpStatus");

async function listIncomes(userId, filters) {
  const { rows, total, page, limit } = await incomeRepo.findAll(userId, filters);
  return {
    data: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
}

async function getSummary(userId, month, year) {
  const now = new Date();
  const m = parseInt(month) || now.getMonth() + 1;
  const y = parseInt(year)  || now.getFullYear();

  const { summary, by_category } = await incomeRepo.getSummary(userId, m, y);
  const evolution = await incomeRepo.getEvolution(userId, 6);

  return { period: { month: m, year: y }, summary, by_category, evolution };
}

async function createIncome(userId, data) {
  return incomeRepo.create({
    userId,
    description: data.description.trim(),
    amount: parseFloat(data.amount),
    category: data.category.trim(),
    date: data.date,
    notes: data.notes?.trim() || null,
  });
}

async function updateIncome(userId, incomeId, data) {
  const existing = await incomeRepo.findById(incomeId, userId);
  if (!existing) throw new AppError(MSG.TRANSACTION.NOT_FOUND, HTTP.NOT_FOUND, "INCOME_NOT_FOUND");

  const updated = await incomeRepo.update(incomeId, userId, data);
  if (!updated) throw new AppError(MSG.TRANSACTION.NO_FIELDS, HTTP.BAD_REQUEST, "NO_FIELDS");

  return updated;
}

async function deleteIncome(userId, incomeId) {
  const deleted = await incomeRepo.remove(incomeId, userId);
  if (!deleted) throw new AppError(MSG.TRANSACTION.NOT_FOUND, HTTP.NOT_FOUND, "INCOME_NOT_FOUND");
  return { message: MSG.TRANSACTION.DELETED };
}

async function exportToCSV(userId, filters) {
  const rows = await incomeRepo.exportAll(userId, filters);

  const header = "Descrição,Valor,Categoria,Data,Notas\n";
  const body = rows.map((r) =>
    [
      `"${r.description}"`,
      r.amount.toFixed(2),
      `"${r.category}"`,
      new Date(r.date).toISOString().split("T")[0],
      `"${r.notes || ""}"`,
    ].join(",")
  ).join("\n");

  return header + body;
}

module.exports = { listIncomes, getSummary, createIncome, updateIncome, deleteIncome, exportToCSV };