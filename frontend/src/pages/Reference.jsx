import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

function parseToken(token) {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
}

export default function Reference() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const payload = token ? parseToken(token) : null;
  const isAdmin = payload?.role === "admin";

  const [rules, setRules] = useState([]);
  const [topics, setTopics] = useState([]);
  const [topic, setTopic] = useState("Все");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ topic: "", subtopic: "", title: "", explanation: "", examples: [] });
  const [tests, setTests] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadRules();
    api.get("/rules/topics").then(r => setTopics(Array.isArray(r.data) ? r.data : []));
    if (isAdmin) api.get("/tests/all").then(r => setTests(Array.isArray(r.data) ? r.data : []));
  }, []);

  async function loadRules() {
    const r = await api.get("/rules");
    setRules(Array.isArray(r.data) ? r.data : []);
  }

  async function openRule(id) {
    const r = await api.get(`/rules/${id}`);
    setSelected(r.data);
    setEditMode(false);
  }

  function showMsg(msg) { setMessage(msg); setTimeout(() => setMessage(""), 2500); }

  async function saveRule(e) {
    e.preventDefault();
    await api.put(`/rules/${selected.id}`, form);
    await loadRules();
    const r = await api.get(`/rules/${selected.id}`);
    setSelected(r.data);
    setEditMode(false);
    showMsg("Правило обновлено ✓");
  }

  function startEdit() {
    setForm({ topic: selected.topic, subtopic: selected.subtopic || "", title: selected.title, explanation: selected.explanation, examples: selected.examples || [] });
    setEditMode(true);
  }

  function addExample() {
    setForm({ ...form, examples: [...form.examples, { correct: "", incorrect: "", comment: "" }] });
  }

  function updateExample(i, field, value) {
    const exs = [...form.examples];
    exs[i] = { ...exs[i], [field]: value };
    setForm({ ...form, examples: exs });
  }

  async function loadQuestionsForTest(testId) {
    setSelectedTestId(testId);
    if (testId) {
      const r = await api.get(`/tests/${testId}`);
      setQuestions(r.data.questions || []);
    } else {
      setQuestions([]);
    }
  }

  async function linkRuleToQuestion(testId, questionId) {
    await api.patch(`/tests/${testId}/questions/${questionId}/rule?rule_id=${selected.id}`);
    showMsg("Правило привязано к вопросу ✓");
    setShowLinkModal(false);
  }

  const filtered = rules.filter(r =>
    (topic === "Все" || r.topic === topic) &&
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ marginBottom: "1rem", background: "none", border: "none", cursor: "pointer", color: "#666" }}>← Назад</button>
      <h2>Справочник русского языка</h2>
      {message && <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "0.5rem 1rem", borderRadius: 6, marginBottom: "1rem" }}>{message}</div>}

      <input placeholder="Поиск по названию правила..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #ddd", marginBottom: "1rem", boxSizing: "border-box" }} />
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {["Все", ...topics].map(t => (
          <button key={t} onClick={() => setTopic(t)}
            style={{ padding: "0.35rem 1rem", borderRadius: 20, border: "1px solid #ddd", cursor: "pointer",
              background: topic === t ? "#1a1a2e" : "white", color: topic === t ? "white" : "#333", fontSize: 13 }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.5fr" : "1fr", gap: "2rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {filtered.length === 0 && <p style={{ color: "#999" }}>Правил не найдено</p>}
          {filtered.map(r => (
            <div key={r.id} onClick={() => openRule(r.id)}
              style={{ padding: "0.75rem 1rem", border: `1px solid ${selected?.id === r.id ? "#1a1a2e" : "#ddd"}`, borderRadius: 8, cursor: "pointer", background: selected?.id === r.id ? "#f0f0f8" : "white" }}>
              <div style={{ fontWeight: 500 }}>{r.title}</div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>{r.topic}{r.subtopic ? ` → ${r.subtopic}` : ""}</div>
            </div>
          ))}
        </div>

        {selected && !editMode && (
          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1.25rem" }}>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>{selected.topic}{selected.subtopic ? ` → ${selected.subtopic}` : ""}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>{selected.title}</h3>
              {isAdmin && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={startEdit} style={{ fontSize: 12, padding: "4px 10px", cursor: "pointer" }}>Редактировать</button>
                  <button onClick={() => setShowLinkModal(true)}
                    style={{ fontSize: 12, padding: "4px 10px", cursor: "pointer", background: "#e3f2fd", border: "1px solid #90caf9", color: "#1565c0", borderRadius: 4 }}>
                    Привязать к вопросу
                  </button>
                </div>
              )}
            </div>
            <p style={{ lineHeight: 1.7, color: "#333", whiteSpace: "pre-line" }}>{selected.explanation}</p>
            {selected.examples?.length > 0 && (
              <>
                <h4 style={{ margin: "1rem 0 0.5rem" }}>Примеры</h4>
                {selected.examples.map((ex, i) => (
                  <div key={i} style={{ background: "#f9f9f9", borderRadius: 6, padding: "0.75rem", marginBottom: "0.5rem" }}>
                    <div style={{ color: "#2e7d32", fontWeight: 500 }}>✓ {ex.correct}</div>
                    {ex.incorrect && <div style={{ color: "#c62828", marginTop: 2 }}>✗ {ex.incorrect}</div>}
                    {ex.comment && <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{ex.comment}</div>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {selected && editMode && (
          <div style={{ border: "1px solid #1565c0", borderRadius: 8, padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 1rem" }}>Редактировать правило</h3>
            <form onSubmit={saveRule} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <input placeholder="Тема" required value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} />
              <input placeholder="Подтема (необязательно)" value={form.subtopic} onChange={e => setForm({ ...form, subtopic: e.target.value })} />
              <input placeholder="Название правила" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <textarea placeholder="Объяснение" required value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })}
                style={{ minHeight: 100, padding: "0.5rem", resize: "vertical" }} />
              <h4 style={{ margin: 0 }}>Примеры</h4>
              {form.examples.map((ex, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.4rem", padding: "0.5rem", background: "#f9f9f9", borderRadius: 6 }}>
                  <input placeholder="Правильно" value={ex.correct} onChange={e => updateExample(i, "correct", e.target.value)} />
                  <input placeholder="Неправильно" value={ex.incorrect} onChange={e => updateExample(i, "incorrect", e.target.value)} />
                  <input placeholder="Комментарий" value={ex.comment} onChange={e => updateExample(i, "comment", e.target.value)} />
                </div>
              ))}
              <button type="button" onClick={addExample} style={{ background: "none", border: "1px dashed #ddd", borderRadius: 6, padding: "0.4rem", cursor: "pointer" }}>+ Пример</button>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit">Сохранить</button>
                <button type="button" onClick={() => setEditMode(false)} style={{ background: "none", border: "1px solid #ddd" }}>Отмена</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {showLinkModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", borderRadius: 12, padding: "1.5rem", width: 480, maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 1rem" }}>Привязать «{selected?.title}» к вопросу</h3>
            <select value={selectedTestId} onChange={e => loadQuestionsForTest(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #ddd", marginBottom: "1rem" }}>
              <option value="">Выберите тест...</option>
              {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            {questions.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                {questions.map(q => (
                  <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", border: "1px solid #eee", borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 14 }}>{q.text}</div>
                      {q.rule_id && <div style={{ fontSize: 12, color: "#1565c0" }}>Уже привязано правило #{q.rule_id}</div>}
                    </div>
                    <button onClick={() => linkRuleToQuestion(selectedTestId, q.id)}
                      style={{ fontSize: 12, background: "#e8f5e9", border: "1px solid #2e7d32", color: "#2e7d32", borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}>
                      Привязать
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => { setShowLinkModal(false); setSelectedTestId(""); setQuestions([]); }}
              style={{ width: "100%", padding: "0.75rem", borderRadius: 6, cursor: "pointer" }}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
}
