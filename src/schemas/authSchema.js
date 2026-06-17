const { body } = require("express-validator");

const register = [
  body("username")
    .trim()
    .notEmpty().withMessage("obrigatório")
    .isLength({ min: 3, max: 50 }).withMessage("deve ter entre 3 e 50 caracteres")
    .matches(/^[a-zA-Z0-9_]+$/).withMessage("apenas letras, números e underscore"),

  body("password")
    .notEmpty().withMessage("obrigatória")
    .isLength({ min: 6 }).withMessage("mínimo 6 caracteres")
    .matches(/\d/).withMessage("deve conter pelo menos um número"),

  body("email")
    .optional({ nullable: true, checkFalsy: true })
    .isEmail().withMessage("email inválido")
    .normalizeEmail(),
];

const login = [
  body("username").trim().notEmpty().withMessage("obrigatório"),
  body("password").notEmpty().withMessage("obrigatória"),
];

const changePassword = [
  body("current_password").notEmpty().withMessage("senha atual obrigatória"),
  body("new_password")
    .isLength({ min: 6 }).withMessage("mínimo 6 caracteres")
    .matches(/\d/).withMessage("deve conter pelo menos um número")
    .custom((val, { req }) => {
      if (val === req.body.current_password)
        throw new Error("nova senha deve ser diferente da atual");
      return true;
    }),
];

module.exports = { register, login, changePassword };