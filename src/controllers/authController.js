const authService = require("../services/authService");
const catchAsync = require("../utils/catchAsync");
const HTTP = require("../constants/httpStatus");

const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(HTTP.CREATED).json({ status: "success", success: true, ...result });
});

const login = catchAsync(async (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.ip;
  const result = await authService.login(req.body, ip);
  res.status(HTTP.OK).json({ status: "success", success: true, ...result });
});

const refresh = catchAsync(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  res.status(HTTP.OK).json({ status: "success", success: true, ...result });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);

  res.status(HTTP.OK).json({
    status: "success",
    success: true,
    message: "Logout realizado com sucesso",
  });
});

const changePassword = catchAsync(async (req, res) => {
  const { current_password, new_password } = req.body;

  const result = await authService.changePassword(
    req.user.id,
    current_password,
    new_password
  );

  res.status(HTTP.OK).json({ status: "success", success: true, ...result });
});

const resetPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  const result = await authService.resetPassword(email);

  res.status(HTTP.OK).json({
    status: "success",
    success: true,
    ...result,
  });
});

const newPassword = catchAsync(async (req, res) => {
  const { email, new_password } = req.body;

  const result = await authService.newPassword(email, new_password);

  res.status(HTTP.OK).json({
    status: "success",
    success: true,
    ...result,
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  changePassword,
  resetPassword,
  newPassword,
};