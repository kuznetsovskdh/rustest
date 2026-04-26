import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

export default function RuleManager() {
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ topic: "", subtopic: "", title: "", explanation: "", examples: [] });

  useEffect(() => { loadRules(); }, []);

  async function loadRules() {
    const r = await api.get("/rules");
    setRules(Array.isArray(r.data) ? r.data : []);
  }

  async function loadRule(id) {
    const r = await api.get(`/rules/${id}`);
    setSelected(r.data);
  }

  function showMsg(msg) { setMessage(msg); setTimeout(() => setMessage(""), 2000); }

  async function saveRule(e) {
    e.preventDefault();
    if (editMode && selected) {
      await api.put(`/rules/${selected.id}`, form);
      showMsg("Правило обновлено ✓");
    } else {
      await api.post("/rules", form);
      showMsg("Правило добавлено ✓");
    }
    await loadRules();
    setShowForm(false);
    setEditMode(false);
    setForm({ topic: "", subtopic: "", title: "", explanation: "", examples: [] });
  }

  async function deleteRule(id) {
    await api.delete(`/rules/${id}`);
    setSelected(null);
    await loadRules();
    showMsg("Правило удалено");
  }

  function addExample() {
    setForm({ ...form, examples: [...form.examples, { correct: "", incorrect: "", comment: "" }] });
  }

  function updateExample(i, field, value) {
    const exs = [...form.examples];
    exs[i] = { ...exs[i], [field]: value };
    setForm({ ...form, examples: exs });
  }

  function startEdit(rule) {
    setForm({ topic: rule.topic, subtopic: rule.subtopic || "", title: rule.title, explanation: rule.explanation, examples: rule.examples || [] });
    setEditMode(true);
    setShowForm(true);
  }

  return (
    <div>
      <button onClick={() => navigate("/admin")} style={{ marginBottom: "1rem", background: "none", border: "none", cursor: "pointer", color: "#666" }}>← Назад</button>
      {message && <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "0.5rem 1rem", borderRadius: 6, marginBottom: "1rem" }}>{message}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "2rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0 }}>Правила ({rules.length})</h2>
            <button onClick={() => { setShowForm(!showForm); setEditMode(false); setForm({ topic: "", subtopic: "", title: "", explanation: "", examples: [] }); }}>+ Новое</button>
          </div>

          {showForm && (
            <form onSubmit={saveRule} style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <h4 style={{ margin: 0 }}>{editMode ? "Редактировать" : "Новое правило"}</h4>
              <input placeholder="Тема (напр. Орфография)" required value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} />
              <input placeholder="Подтема (необязательно)" value={form.subtopic} onChange={e => setForm({ ...form, subtopic: e.target.value })} />
              <input placeholder="Название правила" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <textarea placeholder="Объяснение правила..." required value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })}
                style={{ minHeight: 80, padding: "0.5rem", resize: "vertical" }} />
              <h5 style={{ margin: 0 }}>Примеры</h5>
              {form.examples.map((ex, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.4rem", padding: "0.5rem", background: "#f9f9f9", borderRadius: 6 }}>
                  <input placeholder="Правильно" value={ex.correct} onChange={e => updateExample(i, "correct", e.target.value)} />
                  <input placeholder="Неправильно (необязательно)" value={ex.incorrect} onChange={e => updateExample(i, "incorrect", e.target.value)} />
                  <input placeholder="Комментарий (необязательно)" value={ex.comment} onChange={e => updateExample(i, "comment", e.target.value)} />
                </div>
              ))}
              <button type="button" onClick={addExample} style={{ background: "none", border: "1px dashed #ddd", borderRadius: 6, padding: "0.4rem", cursor: "pointer" }}>+ Добавить пример</button>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit">{editMode ? "Сохранить" : "Создать"}</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: "none", border: "1px solid #ddd" }}>Отмена</button>
              </div>
            </form>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {rules.map(r => (
              <div key={r.id} onClick={() => loadRule(r.id)}
                style={{ padding: "0.75rem", border: `1px solid ${selected?.id === r.id ? "#1a1a2e" : "#ddd"}`, borderRadius: 8, cursor: "pointer", background: selected?.id === r.id ? "#f0f0f8" : "white" }}>
                <div style={{ fontWeight: 500 }}>{r.title}</div>
                <div style={{ fontSize: 13, color: "#666" }}>{r.topic}{r.subtopic ? ` → ${r.subtopic}` : ""}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {selected ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ margin: 0 }}>{selected.title}</h2>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => startEdit(selected)} style={{ fontSize: 12 }}>Изменить</button>
                  <button onClick={() => deleteRule(selected.id)} style={{ fontSize: 12, color: "#f44336", border: "1px solid #f44336", background: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer" }}>Удалить</button>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#999", marginBottom: "0.75rem" }}>{selected.topic}{selected.subtopic ? ` → ${selected.subtopic}` : ""}</div>
              <p style={{ lineHeight: 1.7, whiteSpace: "pre-line" }}>{selected.explanation}</p>
              {selected.examples?.length > 0 && (
                <>
                  <h4>Примеры</h4>
                  {selected.examples.map((ex, i) => (
                    <div key={i} style={{ background: "#f9f9f9", borderRadius: 6, padding: "0.75rem", marginBottom: "0.5rem" }}>
                      <div style={{ color: "#2e7d32" }}>✓ {ex.correct}</div>
                      {ex.incorrect && <div style={{ color: "#c62828" }}>✗ {ex.incorrect}</div>}
                      {ex.comment && <div style={{ fontSize: 13, color: "#666" }}>{ex.comment}</div>}
                    </div>
                  ))}
                </>
              )}
            </>
          ) : <p style={{ color: "#999", textAlign: "center", marginTop: "3rem" }}>Выберите правило слева</p>}
        </div>
      </div>
    </div>
  );
}
