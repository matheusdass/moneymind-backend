// src/pages/Dashboard.jsx
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/authContext";
import { expenses as expensesApi, incomes as incomesApi } from "../services/api";

// ── Formatação ─────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString("pt-BR");
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ── Ícones ─────────────────────────────────────────────────────
const Icon = ({ path, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path}/>
  </svg>
);

const ICONS = {
  income:   "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  expense:  "M17 7l-10 10M7 7h10v10",
  balance:  "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2",
  logout:   "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  plus:     "M12 5v14M5 12h14",
  trash:    "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit:     "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  close:    "M18 6L6 18M6 6l12 12",
};

// ── Componentes auxiliares ─────────────────────────────────────
function StatCard({ label, value, color, icon, sub }) {
  return (
    <div style={{ ...S.card, borderLeft: `3px solid ${color}` }}>
      <div style={S.cardTop}>
        <span style={{ ...S.cardIcon, color, background: color + "22" }}>
          <Icon path={icon} size={16}/>
        </span>
        <span style={S.cardLabel}>{label}</span>
      </div>
      <div style={{ ...S.cardValue, color }}>{value}</div>
      {sub && <div style={S.cardSub}>{sub}</div>}
    </div>
  );
}

function TransactionRow({ item, type, onDelete }) {
  const isExpense = type === "expense";
  return (
    <div style={S.txRow}>
      <div style={S.txLeft}>
        <div style={{ ...S.txDot, background: isExpense ? "#ef4444" : "#22c55e" }}/>
        <div>
          <div style={S.txDesc}>{item.description}</div>
          <div style={S.txMeta}>{item.category} · {fmtDate(item.date)}</div>
        </div>
      </div>
      <div style={S.txRight}>
        <span style={{ ...S.txAmount, color: isExpense ? "#ef4444" : "#22c55e" }}>
          {isExpense ? "-" : "+"}{fmt(item.amount)}
        </span>
        <button style={S.txDelete} onClick={() => onDelete(item.id, type)} title="Remover">
          <Icon path={ICONS.trash} size={14}/>
        </button>
      </div>
    </div>
  );
}

// ── Modal de nova transação ────────────────────────────────────
const EXPENSE_CATS = ["Alimentação","Transporte","Moradia","Saúde","Educação","Lazer","Vestuário","Assinaturas","Outros"];
const INCOME_CATS  = ["Salário","Freelance","Investimentos","Aluguel","Presente","Reembolso","Outros"];

function TransactionModal({ onClose, onSaved }) {
  const [type, setType] = useState("expense");
  const [form, setForm] = useState({ description: "", amount: "", category: "", date: new Date().toISOString().split("T")[0], notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cats = type === "expense" ? EXPENSE_CATS : INCOME_CATS;
  const set = (f) => (e) => setForm(v => ({ ...v, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (type === "expense") await expensesApi.create(payload);
      else await incomesApi.create(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <h3 style={S.modalTitle}>Nova transação</h3>
          <button style={S.iconBtn} onClick={onClose}><Icon path={ICONS.close} size={16}/></button>
        </div>

        {/* Tipo */}
        <div style={S.typeToggle}>
          {["expense","income"].map(t => (
            <button key={t} style={{ ...S.typeBtn, ...(type === t ? S.typeBtnActive : {}) }} onClick={() => { setType(t); setForm(f => ({ ...f, category: "" })); }}>
              {t === "expense" ? "💸 Despesa" : "💰 Receita"}
            </button>
          ))}
        </div>

        {error && <div style={S.modalError}>{error}</div>}

        <form onSubmit={handleSubmit} style={S.modalForm}>
          <input style={S.minput} placeholder="Descrição" value={form.description} onChange={set("description")} required/>
          <input style={S.minput} type="number" placeholder="Valor (R$)" min="0.01" step="0.01" value={form.amount} onChange={set("amount")} required/>
          <select style={S.minput} value={form.category} onChange={set("category")} required>
            <option value="">Categoria</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input style={S.minput} type="date" value={form.date} onChange={set("date")} required/>
          <textarea style={{ ...S.minput, height: 72, resize: "vertical" }} placeholder="Notas (opcional)" value={form.notes} onChange={set("notes")}/>
          <button type="submit" disabled={loading} style={{ ...S.primaryBtn, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Salvando..." : "Salvar transação"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard principal ────────────────────────────────────────
export default function Dashboard() {
  const { user, logout } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year]  = useState(now.getFullYear());
  const [summary, setSummary] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [recentIncomes, setRecentIncomes]   = useState([]);
  const [loading, setLoading]  = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [expSum, incSum, expList, incList] = await Promise.all([
        expensesApi.summary({ month, year }),
        incomesApi.summary({ month, year }),
        expensesApi.list({ limit: 5, sort: "date", order: "DESC" }),
        incomesApi.list({ limit: 5, sort: "date", order: "DESC" }),
      ]);

      const totalIncome   = incSum.summary?.total || 0;
      const totalExpenses = expSum.summary?.total || 0;

      setSummary({
        income:       totalIncome,
        expenses:     totalExpenses,
        balance:      totalIncome - totalExpenses,
        incomeCount:  incSum.summary?.count || 0,
        expenseCount: expSum.summary?.count || 0,
        expByCategory: expSum.by_category || [],
        incByCategory: incSum.by_category || [],
        evolution: expSum.evolution || [],
      });
      setRecentExpenses(expList.data || []);
      setRecentIncomes(incList.data  || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, type) => {
    if (!window.confirm("Remover esta transação?")) return;
    try {
      if (type === "expense") await expensesApi.remove(id);
      else await incomesApi.remove(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExport = async (type) => {
    try {
      const blob = type === "expense"
        ? await expensesApi.export({ month, year })
        : await incomesApi.export({ month, year });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${type === "expense" ? "despesas" : "receitas"}-${year}-${month}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={S.page}>
      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.sideTop}>
          <div style={S.sideLogoWrap}>
            <span style={S.sideLogo}>₿</span>
            <span style={S.sideAppName}>FinanceApp</span>
          </div>
          <nav style={S.nav}>
            {[
              { label: "Dashboard", active: true },
              { label: "Despesas" },
              { label: "Receitas" },
              { label: "Perfil" },
            ].map(item => (
              <div key={item.label} style={{ ...S.navItem, ...(item.active ? S.navItemActive : {}) }}>
                {item.label}
              </div>
            ))}
          </nav>
        </div>
        <div style={S.sideBottom}>
          <div style={S.sideUser}>
            <div style={S.avatar}>{user?.username?.[0]?.toUpperCase()}</div>
            <div>
              <div style={S.sideUsername}>{user?.username}</div>
              <div style={S.sideRole}>Conta pessoal</div>
            </div>
          </div>
          <button style={S.logoutBtn} onClick={logout}>
            <Icon path={ICONS.logout} size={16}/>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={S.main}>
        {/* Topbar */}
        <div style={S.topbar}>
          <div>
            <h2 style={S.pageTitle}>Dashboard</h2>
            <p style={S.pageSub}>Visão geral do seu mês</p>
          </div>
          <div style={S.topbarRight}>
            {/* Seletor de mês */}
            <select style={S.monthSelect} value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i+1}>{m} {year}</option>)}
            </select>
            <button style={S.primaryBtn} onClick={() => setShowModal(true)}>
              <Icon path={ICONS.plus} size={16}/>
              Nova transação
            </button>
          </div>
        </div>

        {loading ? (
          <div style={S.loadingWrap}>
            <div style={S.spinner}/>
            <span style={{ color: "#6b7280", marginTop: 12 }}>Carregando...</span>
          </div>
        ) : (
          <>
            {/* Cards de resumo */}
            <div style={S.statsGrid}>
              <StatCard label="Receitas" value={fmt(summary?.income)} color="#22c55e" icon={ICONS.income} sub={`${summary?.incomeCount} transações`}/>
              <StatCard label="Despesas" value={fmt(summary?.expenses)} color="#ef4444" icon={ICONS.expense} sub={`${summary?.expenseCount} transações`}/>
              <StatCard
                label="Saldo"
                value={fmt(summary?.balance)}
                color={summary?.balance >= 0 ? "#6366f1" : "#f97316"}
                icon={ICONS.balance}
                sub={summary?.balance >= 0 ? "Positivo ✓" : "Negativo ✗"}
              />
            </div>

            {/* Categorias + Transações recentes */}
            <div style={S.grid2}>
              {/* Despesas por categoria */}
              <div style={S.section}>
                <div style={S.sectionHeader}>
                  <h3 style={S.sectionTitle}>Despesas por categoria</h3>
                  <button style={S.exportBtn} onClick={() => handleExport("expense")}>
                    <Icon path={ICONS.download} size={14}/> CSV
                  </button>
                </div>
                {summary?.expByCategory.length === 0 ? (
                  <p style={S.empty}>Nenhuma despesa neste mês</p>
                ) : (
                  summary.expByCategory.map(cat => (
                    <div key={cat.category} style={S.catRow}>
                      <div style={S.catInfo}>
                        <span style={S.catName}>{cat.category}</span>
                        <span style={S.catPct}>{cat.percentage}%</span>
                      </div>
                      <div style={S.catBar}>
                        <div style={{ ...S.catBarFill, width: `${cat.percentage}%`, background: "#ef4444" }}/>
                      </div>
                      <span style={{ ...S.catTotal, color: "#ef4444" }}>{fmt(cat.total)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Receitas por categoria */}
              <div style={S.section}>
                <div style={S.sectionHeader}>
                  <h3 style={S.sectionTitle}>Receitas por categoria</h3>
                  <button style={S.exportBtn} onClick={() => handleExport("income")}>
                    <Icon path={ICONS.download} size={14}/> CSV
                  </button>
                </div>
                {summary?.incByCategory.length === 0 ? (
                  <p style={S.empty}>Nenhuma receita neste mês</p>
                ) : (
                  summary.incByCategory.map(cat => (
                    <div key={cat.category} style={S.catRow}>
                      <div style={S.catInfo}>
                        <span style={S.catName}>{cat.category}</span>
                        <span style={S.catPct}>{cat.percentage}%</span>
                      </div>
                      <div style={S.catBar}>
                        <div style={{ ...S.catBarFill, width: `${cat.percentage}%`, background: "#22c55e" }}/>
                      </div>
                      <span style={{ ...S.catTotal, color: "#22c55e" }}>{fmt(cat.total)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Transações recentes */}
            <div style={S.grid2}>
              <div style={S.section}>
                <h3 style={S.sectionTitle}>Despesas recentes</h3>
                {recentExpenses.length === 0
                  ? <p style={S.empty}>Nenhuma despesa registrada</p>
                  : recentExpenses.map(item => (
                      <TransactionRow key={item.id} item={item} type="expense" onDelete={handleDelete}/>
                    ))
                }
              </div>
              <div style={S.section}>
                <h3 style={S.sectionTitle}>Receitas recentes</h3>
                {recentIncomes.length === 0
                  ? <p style={S.empty}>Nenhuma receita registrada</p>
                  : recentIncomes.map(item => (
                      <TransactionRow key={item.id} item={item} type="income" onDelete={handleDelete}/>
                    ))
                }
              </div>
            </div>
          </>
        )}
      </main>

      {showModal && <TransactionModal onClose={() => setShowModal(false)} onSaved={load}/>}

      {/* IA com voz */}
      <AIChat token={localStorage.getItem("accessToken")} autoGreet={true} />
    </div>
  );
}

// ── Estilos ────────────────────────────────────────────────────
const S = {
  page:       { display: "flex", minHeight: "100vh", background: "#0a0a0a", fontFamily: "'DM Sans', sans-serif", color: "#f5f5f5" },
  sidebar:    { width: 220, background: "#111", borderRight: "1px solid #1f1f1f", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "24px 16px", flexShrink: 0 },
  sideTop:    { display: "flex", flexDirection: "column", gap: 32 },
  sideLogoWrap: { display: "flex", alignItems: "center", gap: 10, paddingLeft: 8 },
  sideLogo:   { fontSize: 22, width: 36, height: 36, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center" },
  sideAppName:{ color: "#f5f5f5", fontWeight: 700, fontSize: 16 },
  nav:        { display: "flex", flexDirection: "column", gap: 4 },
  navItem:    { padding: "9px 12px", borderRadius: 8, color: "#6b7280", fontSize: 14, cursor: "pointer", transition: "all 0.15s" },
  navItemActive: { background: "#6366f122", color: "#818cf8" },
  sideBottom: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  sideUser:   { display: "flex", alignItems: "center", gap: 10 },
  avatar:     { width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 },
  sideUsername: { color: "#f5f5f5", fontSize: 13, fontWeight: 600 },
  sideRole:   { color: "#4b5563", fontSize: 11 },
  logoutBtn:  { background: "none", border: "1px solid #2a2a2a", borderRadius: 8, padding: 7, cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center" },
  main:       { flex: 1, padding: "28px 32px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 },
  topbar:     { display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  pageTitle:  { fontSize: 22, fontWeight: 700, margin: 0, color: "#f5f5f5" },
  pageSub:    { color: "#6b7280", fontSize: 13, margin: "4px 0 0" },
  topbarRight:{ display: "flex", alignItems: "center", gap: 10 },
  monthSelect:{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f5f5f5", borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer", outline: "none" },
  primaryBtn: { display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  statsGrid:  { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  card:       { background: "#111", border: "1px solid #1f1f1f", borderRadius: 12, padding: "18px 20px" },
  cardTop:    { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  cardIcon:   { width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardLabel:  { color: "#9ca3af", fontSize: 13 },
  cardValue:  { fontSize: 24, fontWeight: 700 },
  cardSub:    { color: "#4b5563", fontSize: 12, marginTop: 4 },
  grid2:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  section:    { background: "#111", border: "1px solid #1f1f1f", borderRadius: 12, padding: "20px" },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  sectionTitle: { color: "#f5f5f5", fontSize: 15, fontWeight: 600, margin: 0 },
  exportBtn:  { display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid #2a2a2a", borderRadius: 6, color: "#9ca3af", fontSize: 12, padding: "5px 10px", cursor: "pointer" },
  catRow:     { marginBottom: 12 },
  catInfo:    { display: "flex", justifyContent: "space-between", marginBottom: 4 },
  catName:    { color: "#d1d5db", fontSize: 13 },
  catPct:     { color: "#6b7280", fontSize: 12 },
  catBar:     { height: 4, background: "#1f1f1f", borderRadius: 4, overflow: "hidden", marginBottom: 2 },
  catBarFill: { height: "100%", borderRadius: 4, transition: "width 0.6s ease" },
  catTotal:   { fontSize: 12, fontWeight: 600 },
  txRow:      { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1a1a1a" },
  txLeft:     { display: "flex", alignItems: "center", gap: 10 },
  txDot:      { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  txDesc:     { color: "#e5e7eb", fontSize: 13, fontWeight: 500 },
  txMeta:     { color: "#6b7280", fontSize: 11, marginTop: 2 },
  txRight:    { display: "flex", alignItems: "center", gap: 10 },
  txAmount:   { fontSize: 13, fontWeight: 700 },
  txDelete:   { background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: 4, display: "flex", opacity: 0.6 },
  empty:      { color: "#4b5563", fontSize: 13, textAlign: "center", padding: "20px 0" },
  loadingWrap:{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  spinner:    { width: 36, height: 36, border: "3px solid #1f1f1f", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  // Modal
  modalOverlay: { position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" },
  modal:      { background: "#111", border: "1px solid #1f1f1f", borderRadius: 16, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 25px 60px #00000080" },
  modalHeader:{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { color: "#f5f5f5", fontSize: 18, fontWeight: 700, margin: 0 },
  iconBtn:    { background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: 4, display: "flex" },
  typeToggle: { display: "flex", gap: 8, marginBottom: 20 },
  typeBtn:    { flex: 1, padding: "9px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#6b7280", fontSize: 13, cursor: "pointer" },
  typeBtnActive: { background: "#6366f122", borderColor: "#6366f1", color: "#818cf8" },
  modalError: { background: "#ef444422", border: "1px solid #ef4444", borderRadius: 8, color: "#ef4444", fontSize: 13, padding: "8px 12px", marginBottom: 16 },
  modalForm:  { display: "flex", flexDirection: "column", gap: 12 },
  minput:     { padding: "10px 13px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#f5f5f5", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
};