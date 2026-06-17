// src/pages/AuthPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { usePasswordValidation } from "../../hooks/usePasswordValidation";

// ── Ícones simples ─────────────────────────────────────────────
const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    )}
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── Componente de força de senha ───────────────────────────────
function PasswordStrength({ password, confirmPassword, show }) {
  const { rules, strength, strengthLabel, strengthColor } = usePasswordValidation(password, confirmPassword);
  if (!show || !password) return null;

  return (
    <div style={styles.strengthBox}>
      <div style={styles.strengthBarWrap}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            ...styles.strengthBar,
            background: i < strength ? strengthColor : "#2a2a2a",
            transition: "background 0.3s ease",
          }}/>
        ))}
      </div>
      <span style={{ fontSize: 11, color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
      <div style={styles.rulesList}>
        {rules.map(r => (
          <div key={r.id} style={{ ...styles.rule, color: r.valid ? "#22c55e" : "#6b7280" }}>
            <span style={{
              ...styles.ruleIcon,
              background: r.valid ? "#22c55e22" : "#ffffff11",
              color: r.valid ? "#22c55e" : "#6b7280",
            }}>
              {r.valid ? <CheckIcon/> : <XIcon/>}
            </span>
            {r.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ username: "", password: "", confirmPassword: "", email: "" });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: "error"|"success", msg }

  const { login, register, loading } = useAuth();
  const navigate = useNavigate();
  const { isValid: passwordOk } = usePasswordValidation(form.password, form.confirmPassword);

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setFeedback(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (mode === "register" && !passwordOk) {
      setFeedback({ type: "error", msg: "Verifique os requisitos de senha" });
      return;
    }

    try {
      if (mode === "login") {
        await login({ username: form.username, password: form.password });
        navigate("/dashboard");
      } else {
        await register({
          username: form.username,
          password: form.password,
          email: form.email || undefined,
        });
        setFeedback({ type: "success", msg: "Conta criada! Faça login." });
        setTimeout(() => {
          setMode("login");
          setForm(f => ({ ...f, password: "", confirmPassword: "" }));
          setFeedback(null);
        }, 1500);
      }
    } catch (err) {
      setFeedback({ type: "error", msg: err.message });
    }
  };

  const switchMode = () => {
    setMode(m => m === "login" ? "register" : "login");
    setForm({ username: "", password: "", confirmPassword: "", email: "" });
    setFeedback(null);
  };

  return (
    <div style={styles.page}>
      {/* Fundo decorativo */}
      <div style={styles.bgOrb1}/>
      <div style={styles.bgOrb2}/>

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>₿</div>
          <h1 style={styles.title}>
            {mode === "login" ? "Bem-vindo de volta" : "Criar conta"}
          </h1>
          <p style={styles.subtitle}>
            {mode === "login"
              ? "Entre para gerenciar suas finanças"
              : "Comece a controlar seu dinheiro"}
          </p>
        </div>

        {/* Feedback */}
        {feedback && (
          <div style={{
            ...styles.feedback,
            background: feedback.type === "error" ? "#ef444422" : "#22c55e22",
            borderColor: feedback.type === "error" ? "#ef4444" : "#22c55e",
            color: feedback.type === "error" ? "#ef4444" : "#22c55e",
          }}>
            {feedback.msg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Username */}
          <div style={styles.field}>
            <label style={styles.label}>Usuário</label>
            <input
              style={styles.input}
              type="text"
              placeholder="seu_usuario"
              value={form.username}
              onChange={set("username")}
              required
              autoComplete="username"
              onFocus={e => e.target.style.borderColor = "#6366f1"}
              onBlur={e => e.target.style.borderColor = "#2a2a2a"}
            />
          </div>

          {/* Email (só no cadastro) */}
          {mode === "register" && (
            <div style={styles.field}>
              <label style={styles.label}>Email <span style={styles.optional}>(opcional)</span></label>
              <input
                style={styles.input}
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={set("email")}
                autoComplete="email"
                onFocus={e => e.target.style.borderColor = "#6366f1"}
                onBlur={e => e.target.style.borderColor = "#2a2a2a"}
              />
            </div>
          )}

          {/* Senha */}
          <div style={styles.field}>
            <label style={styles.label}>Senha</label>
            <div style={styles.inputWrap}>
              <input
                style={{ ...styles.input, paddingRight: 44 }}
                type={showPass ? "text" : "password"}
                placeholder="••••••"
                value={form.password}
                onChange={set("password")}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                onFocus={e => e.target.style.borderColor = "#6366f1"}
                onBlur={e => e.target.style.borderColor = "#2a2a2a"}
              />
              <button type="button" style={styles.eyeBtn} onClick={() => setShowPass(v => !v)}>
                <EyeIcon open={showPass}/>
              </button>
            </div>
          </div>

          {/* Confirmar senha (só no cadastro) */}
          {mode === "register" && (
            <div style={styles.field}>
              <label style={styles.label}>Confirmar senha</label>
              <div style={styles.inputWrap}>
                <input
                  style={{ ...styles.input, paddingRight: 44 }}
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••"
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  required
                  autoComplete="new-password"
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e => e.target.style.borderColor = "#2a2a2a"}
                />
                <button type="button" style={styles.eyeBtn} onClick={() => setShowConfirm(v => !v)}>
                  <EyeIcon open={showConfirm}/>
                </button>
              </div>
              <PasswordStrength
                password={form.password}
                confirmPassword={form.confirmPassword}
                show={mode === "register"}
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? "Aguarde..."
              : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        {/* Switch mode */}
        <p style={styles.switchText}>
          {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
          <button style={styles.switchBtn} onClick={switchMode}>
            {mode === "login" ? "Cadastre-se" : "Fazer login"}
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Estilos ────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    position: "relative",
    overflow: "hidden",
    fontFamily: "'DM Sans', sans-serif",
  },
  bgOrb1: {
    position: "absolute", top: -100, right: -100,
    width: 400, height: 400, borderRadius: "50%",
    background: "radial-gradient(circle, #6366f133 0%, transparent 70%)",
    pointerEvents: "none",
  },
  bgOrb2: {
    position: "absolute", bottom: -150, left: -100,
    width: 500, height: 500, borderRadius: "50%",
    background: "radial-gradient(circle, #8b5cf633 0%, transparent 70%)",
    pointerEvents: "none",
  },
  card: {
    background: "#111111",
    border: "1px solid #1f1f1f",
    borderRadius: 20,
    padding: "40px 36px",
    width: "100%",
    maxWidth: 420,
    position: "relative",
    zIndex: 1,
    boxShadow: "0 25px 60px #00000080",
  },
  header: { textAlign: "center", marginBottom: 28 },
  logo: {
    fontSize: 32, marginBottom: 16,
    width: 60, height: 60, borderRadius: 16,
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 8px 24px #6366f140",
  },
  title: { color: "#f5f5f5", fontSize: 24, fontWeight: 700, margin: "0 0 6px" },
  subtitle: { color: "#6b7280", fontSize: 14, margin: 0 },
  feedback: {
    borderRadius: 10, border: "1px solid", padding: "10px 14px",
    fontSize: 13, fontWeight: 500, marginBottom: 20,
  },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { color: "#9ca3af", fontSize: 13, fontWeight: 500 },
  optional: { color: "#4b5563", fontWeight: 400 },
  inputWrap: { position: "relative" },
  input: {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    background: "#1a1a1a", border: "1px solid #2a2a2a",
    color: "#f5f5f5", fontSize: 14, outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  },
  eyeBtn: {
    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer",
    color: "#6b7280", padding: 4, display: "flex", alignItems: "center",
  },
  strengthBox: {
    marginTop: 10, padding: "12px 14px",
    background: "#161616", borderRadius: 10,
    border: "1px solid #222",
  },
  strengthBarWrap: { display: "flex", gap: 4, marginBottom: 6 },
  strengthBar: { flex: 1, height: 3, borderRadius: 4 },
  rulesList: { display: "flex", flexDirection: "column", gap: 5, marginTop: 8 },
  rule: { display: "flex", alignItems: "center", gap: 8, fontSize: 12 },
  ruleIcon: {
    width: 18, height: 18, borderRadius: 4,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  submitBtn: {
    padding: "13px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    border: "none", borderRadius: 10,
    color: "#fff", fontSize: 15, fontWeight: 600,
    cursor: "pointer", marginTop: 4,
    transition: "opacity 0.2s, transform 0.1s",
    boxShadow: "0 4px 16px #6366f140",
  },
  switchText: { textAlign: "center", color: "#6b7280", fontSize: 13, marginTop: 20 },
  switchBtn: {
    background: "none", border: "none", color: "#6366f1",
    fontWeight: 600, cursor: "pointer", fontSize: 13,
  },
};