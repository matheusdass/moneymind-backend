// src/hooks/usePasswordValidation.js
import { useState, useMemo } from "react";

export function usePasswordValidation(password = "", confirmPassword = "") {
  const rules = useMemo(() => [
    { id: "length",  label: "Mínimo 6 caracteres",      valid: password.length >= 6 },
    { id: "number",  label: "Pelo menos um número",      valid: /\d/.test(password) },
    { id: "upper",   label: "Pelo menos uma maiúscula",  valid: /[A-Z]/.test(password) },
    { id: "match",   label: "Senhas coincidem",          valid: password === confirmPassword && password.length > 0 },
  ], [password, confirmPassword]);

  const isValid = rules.every((r) => r.valid);
  const strength = rules.filter((r) => r.valid).length; // 0-4

  const strengthLabel = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"][strength];
  const strengthColor = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"][strength];

  return { rules, isValid, strength, strengthLabel, strengthColor };
}