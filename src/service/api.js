// src/services/api.js
// Camada central de comunicação com o backend
// Todos os componentes usam esse arquivo — nunca chamam fetch diretamente

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ── Gerenciamento de tokens ────────────────────────────────────
const TokenManager = {
  getAccess:   () => localStorage.getItem("accessToken"),
  getRefresh:  () => localStorage.getItem("refreshToken"),
  setTokens:   (access, refresh) => {
    localStorage.setItem("accessToken", access);
    if (refresh) localStorage.setItem("refreshToken", refresh);
  },
  clearTokens: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  },
};

// ── Fetch com renovação automática de token ────────────────────
let isRefreshing = false;
let refreshQueue = [];

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = TokenManager.getAccess();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Token expirado → tenta renovar uma vez
  if (res.status === 401 && !options._retry) {
    if (isRefreshing) {
      // Enfileira outras requisições enquanto renova
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then(() => apiFetch(path, { ...options, _retry: true }));
    }

    isRefreshing = true;
    try {
      const refreshed = await auth.refresh();
      TokenManager.setTokens(refreshed.accessToken, refreshed.refreshToken);
      refreshQueue.forEach(({ resolve }) => resolve());
      refreshQueue = [];
      return apiFetch(path, { ...options, _retry: true });
    } catch {
      TokenManager.clearTokens();
      refreshQueue.forEach(({ reject }) => reject());
      refreshQueue = [];
      window.location.href = "/login";
      throw new Error("Sessão expirada");
    } finally {
      isRefreshing = false;
    }
  }

  // Trata erros HTTP
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || "Erro na requisição");
    err.status = res.status;
    err.code = body.code;
    err.details = body.details;
    throw err;
  }

  // Retorna blob para CSV
  const contentType = res.headers.get("Content-Type") || "";
  if (contentType.includes("text/csv")) return res.blob();

  return res.json();
}

// ── Auth ───────────────────────────────────────────────────────
export const auth = {
  register: (data) =>
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: async (data) => {
    const result = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    TokenManager.setTokens(result.accessToken, result.refreshToken);
    localStorage.setItem("user", JSON.stringify(result.user));
    return result;
  },

  refresh: () =>
    apiFetch("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: TokenManager.getRefresh() }),
    }),

  logout: async () => {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: TokenManager.getRefresh() }),
      });
    } finally {
      TokenManager.clearTokens();
    }
  },

  changePassword: (data) =>
    apiFetch("/auth/password", { method: "PATCH", body: JSON.stringify(data) }),

  isAuthenticated: () => !!TokenManager.getAccess(),
  getCurrentUser:  () => JSON.parse(localStorage.getItem("user") || "null"),
};

// ── Expenses ───────────────────────────────────────────────────
export const expenses = {
  list:    (params = {}) => apiFetch("/expenses?" + new URLSearchParams(params)),
  summary: (params = {}) => apiFetch("/expenses/summary?" + new URLSearchParams(params)),
  create:  (data)        => apiFetch("/expenses", { method: "POST", body: JSON.stringify(data) }),
  update:  (id, data)    => apiFetch(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove:  (id)          => apiFetch(`/expenses/${id}`, { method: "DELETE" }),
  export:  (params = {}) => apiFetch("/expenses/export?" + new URLSearchParams(params)),
};

// ── Incomes ────────────────────────────────────────────────────
export const incomes = {
  list:    (params = {}) => apiFetch("/incomes?" + new URLSearchParams(params)),
  summary: (params = {}) => apiFetch("/incomes/summary?" + new URLSearchParams(params)),
  create:  (data)        => apiFetch("/incomes", { method: "POST", body: JSON.stringify(data) }),
  update:  (id, data)    => apiFetch(`/incomes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove:  (id)          => apiFetch(`/incomes/${id}`, { method: "DELETE" }),
  export:  (params = {}) => apiFetch("/incomes/export?" + new URLSearchParams(params)),
};

// ── Profile ────────────────────────────────────────────────────
export const profile = {
  get:    ()     => apiFetch("/profile"),
  update: (data) => apiFetch("/profile", { method: "PATCH", body: JSON.stringify(data) }),
};

export { TokenManager };