const profileService = require("../services/profileService");
const catchAsync = require("../utils/catchAsync");
const HTTP = require("../constants/httpStatus");

const getProfile = catchAsync(async (req, res) => {
  const result = await profileService.getProfile(req.user.id);
  res.status(HTTP.OK).json({ status: "success", data: result });
});

const updateProfile = catchAsync(async (req, res) => {
  const result = await profileService.updateProfile(req.user.id, req.body);
  res.status(HTTP.OK).json({ status: "success", ...result });
});

module.exports = { getProfile, updateProfile };