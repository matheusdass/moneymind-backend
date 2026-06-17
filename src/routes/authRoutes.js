const { Router } = require("express");

const ctrl = require("../controllers/authController");

const {
  getProfile,
  updateProfile,
} = require("../controllers/profileController");

const auth = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");

const { body } = require("express-validator");

const router = Router();

const registerRules = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username obrigatório")
    .isLength({ max: 50 })
    .withMessage("Username muito grande"),

  body("email")
    .isEmail()
    .withMessage("Email inválido")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Mínimo 6 caracteres")
    .matches(/\d/)
    .withMessage("Deve ter um número"),
];

const loginRules = [
  body("email")
    .isEmail()
    .withMessage("Email inválido")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Senha obrigatória"),
];

const changePasswordRules = [
  body("current_password")
    .notEmpty()
    .withMessage("Senha atual obrigatória"),

  body("new_password")
    .isLength({ min: 6 })
    .withMessage("Nova senha deve ter no mínimo 6 caracteres")
    .matches(/\d/)
    .withMessage("Nova senha deve ter pelo menos um número")
    .custom((val, { req }) => {
      if (val === req.body.current_password) {
        throw new Error("Nova senha deve ser diferente");
      }

      return true;
    }),
];

const resetPasswordRules = [
  body("email")
    .isEmail()
    .withMessage("Email inválido")
    .normalizeEmail(),
];

const newPasswordRules = [
  body("email")
    .isEmail()
    .withMessage("Email inválido")
    .normalizeEmail(),

  body("new_password")
    .isLength({ min: 6 })
    .withMessage("Nova senha deve ter no mínimo 6 caracteres")
    .matches(/\d/)
    .withMessage("Nova senha deve ter pelo menos um número"),
];

router.post(
  "/register",
  registerRules,
  validate,
  ctrl.register
);

router.post(
  "/login",
  loginRules,
  validate,
  ctrl.login
);

router.post(
  "/refresh",
  ctrl.refresh
);

router.post(
  "/logout",
  ctrl.logout
);

router.post(
  "/reset-password",
  resetPasswordRules,
  validate,
  ctrl.resetPassword
);

router.post(
  "/new-password",
  newPasswordRules,
  validate,
  ctrl.newPassword
);

router.use(auth);

router.patch(
  "/password",
  changePasswordRules,
  validate,
  ctrl.changePassword
);

router.get(
  "/profile",
  getProfile
);

router.patch(
  "/profile",
  updateProfile
);

module.exports = router;