const { GoogleGenerativeAI } = require("@google/generative-ai");
const userRepo = require("../repositories/userRepository");
const AppError = require("../utils/AppError");
const HTTP = require("../constants/httpStatus");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

async function verifyDocument(userId, base64Image, mimeType) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64Image } },
    { text: `Analise este documento de identidade brasileiro (RG ou CNH).
Extraia APENAS a data de nascimento.
Responda SOMENTE com JSON neste formato, sem texto adicional:
{"birth_date": "YYYY-MM-DD", "found": true}
Se não encontrar: {"birth_date": null, "found": false}` },
  ]);

  const text = result.response.text().trim();
  let extracted;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    extracted = JSON.parse(jsonMatch[0]);
  } catch {
    throw new AppError("Não foi possível ler o documento. Use uma foto mais clara.", HTTP.BAD_REQUEST, "DOCUMENT_READ_ERROR");
  }

  if (!extracted.found || !extracted.birth_date)
    throw new AppError("Data de nascimento não encontrada no documento.", HTTP.BAD_REQUEST, "BIRTH_DATE_NOT_FOUND");

  const age = calculateAge(extracted.birth_date);
  const MIN_AGE = 16;

  if (age < MIN_AGE)
    throw new AppError(
      `Você precisa ter pelo menos ${MIN_AGE} anos. Idade detectada: ${age} anos.`,
      HTTP.FORBIDDEN, "UNDERAGE"
    );

  await userRepo.updateAgeVerification(userId, extracted.birth_date);

  return { verified: true, age, birth_date: extracted.birth_date, message: `Idade verificada! ${age} anos.` };
}

async function saveFaceDescriptor(userId, descriptor) {
  if (!Array.isArray(descriptor) || descriptor.length !== 128)
    throw new AppError("Descriptor facial inválido", HTTP.BAD_REQUEST, "INVALID_DESCRIPTOR");
  await userRepo.updateFaceDescriptor(userId, descriptor);
  return { message: "Rosto cadastrado com sucesso!" };
}

async function getFaceDescriptor(userId) {
  const user = await userRepo.findById(userId);
  if (!user?.face_descriptor)
    throw new AppError("Nenhum rosto cadastrado.", HTTP.NOT_FOUND, "NO_FACE_REGISTERED");
  return typeof user.face_descriptor === "string"
    ? JSON.parse(user.face_descriptor)
    : user.face_descriptor;
}

async function getVerificationStatus(userId) {
  const user = await userRepo.findById(userId);
  return {
    age_verified: !!user?.age_verified,
    birth_date: user?.birth_date || null,
    face_registered: !!user?.face_descriptor,
    age: user?.birth_date ? calculateAge(user.birth_date) : null,
  };
}

module.exports = { verifyDocument, saveFaceDescriptor, getFaceDescriptor, getVerificationStatus };