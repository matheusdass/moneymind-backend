// src/controllers/verificationController.js
const verificationService = require("../services/verificationService");
const catchAsync = require("../utils/catchAsync");
const HTTP = require("../constants/httpStatus");

const verifyDocument = catchAsync(async (req, res) => {
  const { image, mimeType } = req.body;
  if (!image) return res.status(HTTP.BAD_REQUEST).json({ status: "error", message: "Imagem obrigatória" });
  const base64 = image.includes(",") ? image.split(",")[1] : image;
  const result = await verificationService.verifyDocument(req.user.id, base64, mimeType || "image/jpeg");
  res.status(HTTP.OK).json({ status: "success", ...result });
});

const registerFace = catchAsync(async (req, res) => {
  const { descriptor } = req.body;
  if (!descriptor) return res.status(HTTP.BAD_REQUEST).json({ status: "error", message: "Descriptor obrigatório" });
  const result = await verificationService.saveFaceDescriptor(req.user.id, descriptor);
  res.status(HTTP.OK).json({ status: "success", ...result });
});

const getFaceDescriptor = catchAsync(async (req, res) => {
  const descriptor = await verificationService.getFaceDescriptor(req.user.id);
  res.status(HTTP.OK).json({ status: "success", descriptor });
});

const getStatus = catchAsync(async (req, res) => {
  const result = await verificationService.getVerificationStatus(req.user.id);
  res.status(HTTP.OK).json({ status: "success", ...result });
});

module.exports = { verifyDocument, registerFace, getFaceDescriptor, getStatus };