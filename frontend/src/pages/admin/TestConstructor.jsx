import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

const difficulties = ["easy", "medium", "hard"];
const difficultyLabel = { easy: "Лёгкий", medium: "Средний", hard: "Сложный" };

export default function TestConstructor() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [testForm, setTestForm] = useState({ title: "", description: "", category: "", difficulty: "easy", timer_seconds: 120 });
  const [questionForm, setQuestionForm] = useState({ text: "", rule_id: "", options: [{ text: "", is_correct: false }, { text: "", is_correct: false }] });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadTests();
    api.get("/rules").then(r => setRules(Array.isArray(r.data) ? r.data : []));
  }, []);

  async function loadTests() {
    const r = await api.get("/tests/all");
    setTests(Array.isArray(r.data) ? r.data : []);
  }

  async function loadTest(id) {
    const r = await api.get(`/tests/${id}`);
    setSelectedTest(r.data);
  }

  function showMsg(msg) { setMessage(msg); setTimeout(() => setMessage(""), 2000); }

  async function saveTest(e) {
    e.preventDefault(); setSaving(true);
    if (editMode && selectedTest) {
      await api.put(`/tests/${selectedTest.id}`, { ...testForm, timer_seconds: parseInt(testForm.timer_seconds) });
      await loadTest(selectedTest.id);
      showMsg("Тест обновлён ✓");
    } else {
      const r = await api.post("/tests", { ...testForm, timer_seconds: parseInt(testForm.timer_seconds) });
      await loadTest(r.data.id);
      showMsg("Тест создан ✓");
    }
    await loadTests();
    setShowForm(false); setEditMode(false);
    setTestForm({ title: "", description: "", category: "", difficulty: "easy", timer_seconds: 120 });
    setSaving(false);
  }

  function startEditTest(test) {
    setTestForm({ title: test.title, description: test.description || "", category: test.category, difficulty: test.difficulty, timer_seconds: test.timer_seconds });
    setEditMode(true); setShowForm(true);
  }

  async function togglePublish(test) {
    if (test.is_published) { await api.patch(`/tests/${test.id}/hide`); showMsg("Тест скрыт"); }
    else { await api.patch(`/tests/${test.id}/publish`); showMsg("Тест опубликован ✓"); }
    await loadTests();
    if (selectedTest?.id === test.id) await loadTest(test.id);
  }

  function startEditQuestion(q) {
    setEditingQuestion(q.id);
    setQuestionForm({ text: q.text, rule_id: q.rule_id || "", options: q.options.map(o => ({ text: o.text, is_correct: o.is_correct })) });
  }

  async function saveQuestion(e) {
    e.preventDefault();
    if (!selectedTest) return;
    setSaving(true);
    const payload = { ...questionForm, rule_id: questionForm.rule_id ? parseInt(questionForm.rule_id) : null };
    if (editingQuestion) {
      await api.put(`/tests/${selectedTest.id}/questions/${editingQuestion}`, payload);
      showMsg("Вопрос обновлён ✓");
      setEditingQuestion(null);
    } else {
      await api.post(`/tests/${selectedTest.id}/questions`, payload);
      showMsg("Вопрос добавлен ✓");
    }
    await loadTest(selectedTest.id);
    setQuestionForm({ text: "", rule_id: "", options: [{ text: "", is_correct: false }, { text: "", is_correct: false }] });
    setSaving(false);
  }

  async function deleteQuestion(questionId) {
    await api.delete(`/tests/${selectedTest.id}/questions/${questionId}`);
    await loadTest(selectedTest.id);
    showMsg("Вопрос удалён");
  }

  function updateOption(i, field, value) {
    const opts = [...questionForm.options];
    opts[i] = { ...opts[i], [field]: value };
    if (field === "is_correct" && value) opts.forEach((o, idx) => { if (idx !== i) opts[idx] = { ...o, is_correct: false }; });
    setQuestionForm({ ...questionForm, options: opts });
  }

  function cancelEditQuestion() {
    setEditingQuestion(null);
    setQuestionForm({ text: "", rule_id: "", options: [{ text: "", is_correct: false }, { text: "", is_correct: false }] });
  }

  return (
    <div>
      <button onClick={() => navigate("/admin")} style={{ marginBottom: "1rem", background: "none", border: "none", cursor: "pointer", color: "#666" }}>← Назад</button>
      {message && <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "0.5rem 1rem", borderRadius: 6, marginBottom: "1rem" }}>{message}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0 }}>Тесты ({tests.length})</h2>
            <button onClick={() => { setShowForm(!showForm); setEditMode(false); setTestForm({ title: "", description: "", category: "", difficulty: "easy", timer_seconds: 120 }); }}>+ Новый</button>
          </div>
          {showForm && (
            <form onSubmit={saveTest} style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <h4 style={{ margin: 0 }}>{editMode ? "Редактировать тест" : "Новый тест"}</h4>
              <input placeholder="Название" required value={testForm.title} onChange={e => setTestForm({ ...testForm, title: e.target.value })} />
              <input placeholder="Описание" value={testForm.description} onChange={e => setTestForm({ ...testForm, description: e.target.value })} />
              <input placeholder="Категория" required value={testForm.category} onChange={e => setTestForm({ ...testForm, category: e.target.value })} />
              <select value={testForm.difficulty} onChange={e => setTestForm({ ...testForm, difficulty: e.target.value })}>
                {difficulties.map(d => <option key={d} value={d}>{difficultyLabel[d]}</option>)}
              </select>
              <input type="number" placeholder="Таймер (сек)" value={testForm.timer_seconds} onChange={e => setTestForm({ ...testForm, timer_seconds: e.target.value })} />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" disabled={saving}>{editMode ? "Сохранить" : "Создать"}</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: "none", border: "1px solid #ddd" }}>Отмена</button>
              </div>
            </form>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {tests.map(t => (
              <div key={t.id} style={{ border: `1px solid ${selectedTest?.id === t.id ? "#1a1a2e" : "#ddd"}`, borderRadius: 8, overflow: "hidden" }}>
                <div onClick={() => loadTest(t.id)} style={{ padding: "0.75rem 1rem", cursor: "pointer", background: selectedTest?.id === t.id ? "#f0f0f8" : "white" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 500 }}>{t.title}</span>
                    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 10, background: t.is_published ? "#e8f5e9" : "#fff3e0", color: t.is_published ? "#2e7d32" : "#e65100" }}>
                      {t.is_published ? "Опубликован" : "Черновик"}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{t.category} · {difficultyLabel[t.difficulty]}</div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem 1rem", borderTop: "1px solid #f0f0f0", background: "#fafafa" }}>
                  <button onClick={() => startEditTest(t)} style={{ fontSize: 12, padding: "3px 10px", cursor: "pointer" }}>Изменить</button>
                  <button onClick={() => togglePublish(t)} style={{ fontSize: 12, padding: "3px 10px", cursor: "pointer", background: t.is_published ? "#fff3e0" : "#e8f5e9", border: `1px solid ${t.is_published ? "#e65100" : "#2e7d32"}`, color: t.is_published ? "#e65100" : "#2e7d32", borderRadius: 4 }}>
                    {t.is_published ? "Скрыть" : "Опубликовать"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {selectedTest ? (
            <>
              <h2 style={{ margin: "0 0 1rem" }}>Вопросы ({selectedTest.questions?.length || 0})</h2>
              <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {(selectedTest.questions || []).map((q, i) => (
                  <div key={q.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>{i + 1}. {q.text}</div>
                        {q.options?.map(o => (
                          <div key={o.id} style={{ fontSize: 13, padding: "2px 0", color: o.is_correct ? "#2e7d32" : "#555" }}>
                            {o.is_correct ? "✓" : "○"} {o.text}
                          </div>
                        ))}
                        {q.rule_id
                          ? <div style={{ fontSize: 12, color: "#1565c0", marginTop: 4 }}>Правило #{q.rule_id}: {rules.find(r => r.id === q.rule_id)?.title}</div>
                          : <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>Без правила</div>
                        }
                      </div>
                      <div style={{ display: "flex", gap: "4px", marginLeft: 8 }}>
                        <button onClick={() => startEditQuestion(q)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1565c0", fontSize: 14 }}>✏️</button>
                        <button onClick={() => deleteQuestion(q.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#f44336", fontSize: 14 }}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={saveQuestion} style={{ border: `1px solid ${editingQuestion ? "#1565c0" : "#ddd"}`, borderRadius: 8, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <h4 style={{ margin: 0 }}>{editingQuestion ? "Редактировать вопрос" : "Добавить вопрос"}</h4>
                <textarea placeholder="Текст вопроса" required value={questionForm.text}
                  onChange={e => setQuestionForm({ ...questionForm, text: e.target.value })}
                  style={{ resize: "vertical", minHeight: 60, padding: "0.5rem" }} />
                <select value={questionForm.rule_id} onChange={e => setQuestionForm({ ...questionForm, rule_id: e.target.value })}
                  style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ddd" }}>
                  <option value="">Без правила</option>
                  {rules.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                </select>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {questionForm.options.map((o, i) => (
                    <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input type="radio" name="correct" checked={o.is_correct} onChange={() => updateOption(i, "is_correct", true)} />
                      <input placeholder={`Вариант ${i + 1}`} required value={o.text} onChange={e => updateOption(i, "text", e.target.value)} style={{ flex: 1 }} />
                      <button type="button" onClick={() => {
                        if (questionForm.options.length > 2) setQuestionForm({ ...questionForm, options: questionForm.options.filter((_, idx) => idx !== i) });
                      }} style={{ background: "none", border: "none", cursor: "pointer", color: "#f44336" }}>✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setQuestionForm({ ...questionForm, options: [...questionForm.options, { text: "", is_correct: false }] })}
                  style={{ background: "none", border: "1px dashed #ddd", borderRadius: 6, padding: "0.5rem", cursor: "pointer" }}>+ Добавить вариант</button>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button type="submit" disabled={saving}>{editingQuestion ? "Сохранить" : "Добавить"}</button>
                  {editingQuestion && <button type="button" onClick={cancelEditQuestion} style={{ background: "none", border: "1px solid #ddd" }}>Отмена</button>}
                </div>
              </form>
            </>
          ) : <p style={{ color: "#999", marginTop: "3rem", textAlign: "center" }}>Выберите тест слева</p>}
        </div>
      </div>
    </div>
  );
}
