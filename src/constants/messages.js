module.exports = {
  // Auth
  AUTH: {
    REGISTER_SUCCESS:       "Usuário cadastrado com sucesso",
    LOGIN_SUCCESS:          "Login realizado com sucesso",
    LOGOUT_SUCCESS:         "Logout realizado com sucesso",
    INVALID_CREDENTIALS:    "Credenciais inválidas",
    USERNAME_TAKEN:         "Nome de usuário já está em uso",
    EMAIL_TAKEN:            "Email já cadastrado",
    TOKEN_REQUIRED:         "Token de acesso obrigatório",
    TOKEN_INVALID:          "Token inválido",
    TOKEN_EXPIRED:          "Token expirado. Faça login novamente.",
    REFRESH_TOKEN_REQUIRED: "Refresh token obrigatório",
    REFRESH_TOKEN_INVALID:  "Refresh token inválido ou expirado",
    PASSWORD_CHANGED:       "Senha alterada com sucesso. Faça login novamente.",
    WRONG_PASSWORD:         "Senha atual incorreta",
  },

  // Expenses / Income
  TRANSACTION: {
    NOT_FOUND:     "Transação não encontrada",
    CREATED:       "Transação criada com sucesso",
    UPDATED:       "Transação atualizada com sucesso",
    DELETED:       "Transação removida com sucesso",
    NO_FIELDS:     "Nenhum campo para atualizar",
  },

  // Profile
  PROFILE: {
    NOT_FOUND:     "Usuário não encontrado",
    UPDATED:       "Perfil atualizado com sucesso",
    EMAIL_TAKEN:   "Este email já está em uso",
  },

  // Generic
  GENERIC: {
    INTERNAL_ERROR: "Algo deu errado. Tente novamente mais tarde.",
    NOT_FOUND:      "Recurso não encontrado",
    RATE_LIMIT:     "Muitas requisições. Tente novamente em 15 minutos.",
    AUTH_LIMIT:     "Muitas tentativas de login. Tente novamente em 15 minutos.",
    INVALID_ID:     "ID inválido",
    NO_BODY:        "Corpo da requisição ausente ou inválido",
  },
};