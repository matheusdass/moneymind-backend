// src/components/AIChat.jsx
import { useState, useRef, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ── Ícones ─────────────────────────────────────────────────────
const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
);

const ICONS = {
  send:  "M22 2L11 13M22 2L15 22 11 13 2 9l20-7z",
  mic:   "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8",
  micOff:"M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6M17 16.95A7 7 0 0 1 5 10v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8",
  chat:  "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  close: "M18 6L6 18M6 6l12 12",
  bot:   "M12 2a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2V7a2 2 0 0 1 2-2h1V4a2 2 0 0 1 2-2zM9 14a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm4 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0z",
  volume:"M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07",
};

// ── Chama o backend de IA ──────────────────────────────────────
async function callAI(endpoint, body, token) {
  const res = await fetch(`${API_URL}/ai/${endpoint}`, {
    method: endpoint === "greeting" ? "GET" : "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error("Erro na IA");
  return res.json();
}

// ── Síntese de voz ─────────────────────────────────────────────
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 1.0;
  utterance.pitch = 1.1;

  // Tenta usar uma voz feminina em português
  const voices = window.speechSynthesis.getVoices();
  const ptVoice = voices.find(v => v.lang.startsWith("pt") && v.name.toLowerCase().includes("female"))
    || voices.find(v => v.lang.startsWith("pt"));
  if (ptVoice) utterance.voice = ptVoice;

  window.speechSynthesis.speak(utterance);
}

// ── Componente principal ───────────────────────────────────────
export default function AIChat({ token, autoGreet = true }) {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [greeting, setGreeting]   = useState(null);

  const bottomRef    = useRef(null);
  const recognitionRef = useRef(null);

  // Busca saudação ao montar
  useEffect(() => {
    if (!autoGreet || !token) return;
    callAI("greeting", null, token)
      .then(data => {
        setGreeting(data.message);
        if (voiceEnabled) speak(data.message);
      })
      .catch(() => {});
  }, [token]);

  // Scroll automático
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Abre o chat com mensagem de boas-vindas
  const openChat = () => {
    setOpen(true);
    if (messages.length === 0 && greeting) {
      setMessages([{ role: "assistant", content: greeting }]);
    }
  };

  // Envia mensagem
  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput("");
    const newMessages = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const history = newMessages.slice(-10); // últimas 10 mensagens como contexto
      const data = await callAI("chat", { message: msg, history }, token);

      const assistantMsg = {
        role: "assistant",
        content: data.message,
        actionExecuted: data.actionExecuted,
      };

      setMessages(prev => [...prev, assistantMsg]);
      if (voiceEnabled) speak(data.message);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Desculpe, tive um problema. Tente novamente! 😅",
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Reconhecimento de voz
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz. Use o Chrome.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart  = () => setListening(true);
    recognition.onend    = () => setListening(false);
    recognition.onerror  = () => setListening(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      sendMessage(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Saudação flutuante */}
      {greeting && !open && (
        <div style={S.greetingBubble} onClick={openChat}>
          <span style={S.greetingText}>{greeting}</span>
          <div style={S.greetingArrow}/>
        </div>
      )}

      {/* Botão flutuante */}
      <button style={S.fab} onClick={open ? () => setOpen(false) : openChat}>
        <Icon d={open ? ICONS.close : ICONS.chat} size={22}/>
        {!open && <span style={S.fabPulse}/>}
      </button>

      {/* Janela do chat */}
      {open && (
        <div style={S.window}>
          {/* Header */}
          <div style={S.header}>
            <div style={S.headerLeft}>
              <div style={S.avatar}>Fi</div>
              <div>
                <div style={S.headerName}>Fi — Assistente Financeira</div>
                <div style={S.headerStatus}>
                  <span style={S.statusDot}/>
                  online
                </div>
              </div>
            </div>
            <button
              style={{ ...S.iconBtn, color: voiceEnabled ? "#6366f1" : "#4b5563" }}
              onClick={() => setVoiceEnabled(v => !v)}
              title={voiceEnabled ? "Desativar voz" : "Ativar voz"}
            >
              <Icon d={ICONS.volume} size={16}/>
            </button>
          </div>

          {/* Mensagens */}
          <div style={S.messages}>
            {messages.length === 0 && (
              <div style={S.emptyChat}>
                <div style={S.emptyChatIcon}>💬</div>
                <p>Olá! Sou a Fi, sua assistente financeira.<br/>Como posso te ajudar hoje?</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ ...S.msgWrap, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "assistant" && <div style={S.botAvatar}>Fi</div>}
                <div style={{
                  ...S.bubble,
                  ...(msg.role === "user" ? S.userBubble : S.botBubble),
                }}>
                  {msg.content}
                  {msg.actionExecuted && (
                    <div style={S.actionBadge}>✅ Registrado no app</div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ ...S.msgWrap, justifyContent: "flex-start" }}>
                <div style={S.botAvatar}>Fi</div>
                <div style={{ ...S.bubble, ...S.botBubble }}>
                  <span style={S.typing}>
                    <span/><span/><span/>
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={S.inputArea}>
            <div style={S.inputWrap}>
              <textarea
                style={S.input}
                placeholder="Digite ou fale sua mensagem..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                style={{ ...S.micBtn, background: listening ? "#ef444422" : "none", color: listening ? "#ef4444" : "#6b7280" }}
                onClick={toggleListening}
                title="Falar"
              >
                <Icon d={listening ? ICONS.micOff : ICONS.mic} size={16}/>
              </button>
            </div>
            <button
              style={{ ...S.sendBtn, opacity: (!input.trim() || loading) ? 0.5 : 1 }}
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
            >
              <Icon d={ICONS.send} size={16}/>
            </button>
          </div>

          {/* Sugestões rápidas */}
          <div style={S.suggestions}>
            {["Como estão meus gastos?", "Resumo do mês", "Adiciona R$50 de almoço"].map(s => (
              <button key={s} style={S.suggestion} onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:0.5} }
        @keyframes typing { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        .typing span { display:inline-block; width:6px; height:6px; background:#6366f1; border-radius:50%; margin:0 2px; animation: typing 1s infinite; }
        .typing span:nth-child(2) { animation-delay:.2s }
        .typing span:nth-child(3) { animation-delay:.4s }
      `}</style>
    </>
  );
}

// ── Estilos ────────────────────────────────────────────────────
const S = {
  fab: {
    position: "fixed", bottom: 28, right: 28, zIndex: 1000,
    width: 56, height: 56, borderRadius: "50%",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    border: "none", cursor: "pointer", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 8px 24px #6366f150",
    transition: "transform 0.2s",
  },
  fabPulse: {
    position: "absolute", width: 56, height: 56, borderRadius: "50%",
    background: "#6366f1", opacity: 0.4,
    animation: "pulse 2s infinite",
  },
  greetingBubble: {
    position: "fixed", bottom: 96, right: 28, zIndex: 999,
    background: "#1a1a2e", border: "1px solid #6366f140",
    borderRadius: 12, padding: "12px 16px", maxWidth: 280,
    cursor: "pointer", boxShadow: "0 8px 24px #00000060",
  },
  greetingText: { color: "#e5e7eb", fontSize: 13, lineHeight: 1.5 },
  greetingArrow: {
    position: "absolute", bottom: -8, right: 24,
    width: 14, height: 14, background: "#1a1a2e",
    border: "1px solid #6366f140", borderTop: "none", borderLeft: "none",
    transform: "rotate(45deg)",
  },
  window: {
    position: "fixed", bottom: 96, right: 28, zIndex: 999,
    width: 360, maxHeight: 560,
    background: "#111", border: "1px solid #1f1f1f",
    borderRadius: 20, display: "flex", flexDirection: "column",
    boxShadow: "0 25px 60px #00000090",
    fontFamily: "'DM Sans', sans-serif",
    overflow: "hidden",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 16px 12px",
    borderBottom: "1px solid #1f1f1f",
    background: "linear-gradient(135deg, #6366f108, #8b5cf608)",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: "50%",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, color: "#fff",
  },
  headerName: { color: "#f5f5f5", fontSize: 14, fontWeight: 600 },
  headerStatus: { display: "flex", alignItems: "center", gap: 5, color: "#6b7280", fontSize: 11 },
  statusDot: { width: 6, height: 6, borderRadius: "50%", background: "#22c55e" },
  iconBtn: { background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", borderRadius: 6 },
  messages: {
    flex: 1, overflowY: "auto", padding: "16px 12px",
    display: "flex", flexDirection: "column", gap: 12,
    minHeight: 200, maxHeight: 340,
  },
  emptyChat: { textAlign: "center", color: "#6b7280", fontSize: 13, padding: "20px 0", lineHeight: 1.6 },
  emptyChatIcon: { fontSize: 32, marginBottom: 8 },
  msgWrap: { display: "flex", alignItems: "flex-end", gap: 6 },
  botAvatar: {
    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 9, fontWeight: 700, color: "#fff",
  },
  bubble: {
    maxWidth: "78%", padding: "10px 13px", borderRadius: 14,
    fontSize: 13, lineHeight: 1.5,
  },
  botBubble: { background: "#1a1a2e", color: "#e5e7eb", borderBottomLeftRadius: 4 },
  userBubble: { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", borderBottomRightRadius: 4 },
  actionBadge: { marginTop: 6, fontSize: 11, color: "#22c55e", fontWeight: 600 },
  typing: { display: "flex", alignItems: "center", gap: 2, padding: "2px 0" },
  inputArea: { display: "flex", alignItems: "flex-end", gap: 8, padding: "10px 12px", borderTop: "1px solid #1f1f1f" },
  inputWrap: { flex: 1, position: "relative" },
  input: {
    width: "100%", padding: "9px 36px 9px 12px",
    background: "#1a1a1a", border: "1px solid #2a2a2a",
    borderRadius: 10, color: "#f5f5f5", fontSize: 13,
    outline: "none", resize: "none", fontFamily: "inherit",
    boxSizing: "border-box",
  },
  micBtn: {
    position: "absolute", right: 8, bottom: 8,
    border: "none", cursor: "pointer", padding: 4,
    borderRadius: 6, display: "flex", transition: "all 0.2s",
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    border: "none", cursor: "pointer", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "opacity 0.2s",
  },
  suggestions: {
    display: "flex", gap: 6, padding: "8px 12px 12px",
    overflowX: "auto", flexWrap: "nowrap",
  },
  suggestion: {
    flexShrink: 0, padding: "5px 10px",
    background: "#1a1a2e", border: "1px solid #6366f130",
    borderRadius: 20, color: "#818cf8", fontSize: 11,
    cursor: "pointer", whiteSpace: "nowrap",
    transition: "all 0.15s",
  },
};