const transactionRepo = require("../repositories/transactionRepository");
const AppError = require("../utils/AppError");
const MSG = require("../constants/messages");
const HTTP = require("../constants/httpStatus");

// ── Categories ─────────────────────────────────────────────────
async function listCategories(userId, type) {
  return transactionRepo.findCategories(userId, type);
}

async function createCategory(userId, { name, type }) {
  if (!name?.trim()) throw new AppError("Nome da categoria é obrigatório", HTTP.BAD_REQUEST);
  if (!["income", "expense"].includes(type))
    throw new AppError("Tipo deve ser 'income' ou 'expense'", HTTP.BAD_REQUEST);
  return transactionRepo.createCategory({ userId, name: name.trim(), type });
}

async function deleteCategory(userId, categoryId) {
  const deleted = await transactionRepo.deleteCategory(categoryId, userId);
  if (!deleted) throw new AppError("Categoria não encontrada", HTTP.NOT_FOUND, "CATEGORY_NOT_FOUND");
  return { message: "Categoria removida com sucesso" };
}

// ── Transactions ───────────────────────────────────────────────
async function listTransactions(userId, filters) {
  const { rows, total, page, limit } = await transactionRepo.findAll(userId, filters);
  return {
    data: rows,
    pagination: {
      total, page, limit,
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

  const { summary, by_category } = await transactionRepo.getSummary(userId, m, y);
  const evolution = await transactionRepo.getEvolution(userId, 6);

  return { period: { month: m, year: y }, summary, by_category, evolution };
}

async function createTransaction(userId, data) {
  const { amount, transaction_date, type, description, category_id } = data;

  if (!amount || isNaN(amount) || Number(amount) <= 0)
    throw new AppError("Valor deve ser positivo", HTTP.BAD_REQUEST);
  if (!["income", "expense"].includes(type))
    throw new AppError("Tipo deve ser 'income' ou 'expense'", HTTP.BAD_REQUEST);
  if (!transaction_date)
    throw new AppError("Data é obrigatória", HTTP.BAD_REQUEST);
  if (!category_id)
    throw new AppError("Categoria é obrigatória", HTTP.BAD_REQUEST);

  // Verifica se categoria pertence ao usuário e bate com o tipo
  const category = await transactionRepo.findCategoryById(category_id, userId);
  if (!category)
    throw new AppError("Categoria não encontrada", HTTP.NOT_FOUND, "CATEGORY_NOT_FOUND");
  if (category.type !== type)
    throw new AppError(
      `Categoria '${category.name}' é do tipo '${category.type}', não '${type}'`,
      HTTP.BAD_REQUEST, "CATEGORY_TYPE_MISMATCH"
    );

  return transactionRepo.create({
    userId,
    amount: parseFloat(amount),
    transaction_date,
    type,
    description: description?.trim() || null,
    category_id,
  });
}

async function updateTransaction(userId, transactionId, data) {
  const existing = await transactionRepo.findById(transactionId, userId);
  if (!existing) throw new AppError(MSG.TRANSACTION.NOT_FOUND, HTTP.NOT_FOUND, "TRANSACTION_NOT_FOUND");

  if (data.category_id) {
    const category = await transactionRepo.findCategoryById(data.category_id, userId);
    if (!category) throw new AppError("Categoria não encontrada", HTTP.NOT_FOUND);
  }

  const updated = await transactionRepo.update(transactionId, userId, data);
  if (!updated) throw new AppError(MSG.TRANSACTION.NO_FIELDS, HTTP.BAD_REQUEST, "NO_FIELDS");
  return updated;
}

async function deleteTransaction(userId, transactionId) {
  const deleted = await transactionRepo.remove(transactionId, userId);
  if (!deleted) throw new AppError(MSG.TRANSACTION.NOT_FOUND, HTTP.NOT_FOUND, "TRANSACTION_NOT_FOUND");
  return { message: MSG.TRANSACTION.DELETED };
}

async function exportToCSV(userId, filters) {
  const rows = await transactionRepo.exportAll(userId, filters);

  const header = "Descrição,Valor,Tipo,Categoria,Data\n";
  const body = rows.map(r => [
    `"${r.description || ""}"`,
    r.amount.toFixed(2),
    r.type === "income" ? "Receita" : "Despesa",
    `"${r.category || ""}"`,
    new Date(r.transaction_date).toISOString().split("T")[0],
  ].join(",")).join("\n");

  return header + body;
}

module.exports = {
  listCategories, createCategory, deleteCategory,
  listTransactions, getSummary, createTransaction,
  updateTransaction, deleteTransaction, exportToCSV,
};