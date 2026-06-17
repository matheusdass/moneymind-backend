const { body } = require("express-validator");

const updateProfile = [
  body("email")
    .optional({ nullable: true, checkFalsy: true })
    .isEmail().withMessage("email inválido")
    .normalizeEmail(),
];

module.exports = { updateProfile };