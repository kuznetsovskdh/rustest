import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

const difficulties = ["easy", "medium", "hard"];
const difficultyLabel = { easy: "Лёгкий", medium: "Средний", hard: "Сложный" };

export default function TestConstructor() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [testForm, setTestForm] = useState({ title: "", description: "", category: "", difficulty: "easy", timer_seconds: 120 });
  const [questionForm, setQuestionForm] = useState({ text: "", options: [{ text: "", is_correct: false }, { text: "", is_correct: false }] });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { loadTests(); }, []);

  async function loadTests() {
    const r = await api.get("/tests/all");
    setTests(Array.isArray(r.data) ? r.data : []);
  }

  async function loadTest(id) {
    const r = await api.get(`/tests/${id}`);
    setSelectedTest(r.data);
  }

  function showMsg(msg) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2000);
  }

  async function saveTest(e) {
    e.preventDefault();
    setSaving(true);
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
    setShowForm(false);
    setEditMode(false);
    setTestForm({ title: "", description: "", category: "", difficulty: "easy", timer_seconds: 120 });
    setSaving(false);
  }

  function startEdit(test) {
    setTestForm({ title: test.title, description: test.description || "", category: test.category, difficulty: test.difficulty, timer_seconds: test.timer_seconds });
    setEditMode(true);
    setShowForm(true);
  }

  async function togglePublish(test) {
    if (test.is_published) {
      await api.patch(`/tests/${test.id}/hide`);
      showMsg("Тест скрыт");
    } else {
      await api.patch(`/tests/${test.id}/publish`);
      showMsg("Тест опубликован ✓");
    }
    await loadTests();
    if (selectedTest?.id === test.id) await loadTest(test.id);
  }

  async function addQuestion(e) {
    e.preventDefault();
    if (!selectedTest) return;
    setSaving(true);
    await api.post(`/tests/${selectedTest.id}/questions`, questionForm);
    await loadTest(selectedTest.id);
    setQuestionForm({ text: "", options: [{ text: "", is_correct: false }, { text: "", is_correct: false }] });
    showMsg("Вопрос добавлен ✓");
    setSaving(false);
  }

  async function deleteQuestion(questionId) {
    if (!selectedTest) return;
    await api.delete(`/tests/${selectedTest.id}/questions/${questionId}`);
    await loadTest(selectedTest.id);
    showMsg("Вопрос удалён");
  }

  function updateOption(i, field, value) {
    const opts = [...questionForm.options];
    opts[i] = { ...opts[i], [field]: value };
    if (field === "is_correct" && value) {
      opts.forEach((o, idx) => { if (idx !== i) opts[idx] = { ...o, is_correct: false }; });
    }
    setQuestionForm({ ...questionForm, options: opts });
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
                <button type="button" onClick={() => { setShowForm(false); setEditMode(false); }} style={{ background: "none", border: "1px solid #ddd" }}>Отмена</button>
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
                  <button onClick={() => startEdit(t)} style={{ fontSize: 12, padding: "3px 10px", cursor: "pointer" }}>✏️ Изменить</button>
                  <button onClick={() => togglePublish(t)} style={{ fontSize: 12, padding: "3px 10px", cursor: "pointer", background: t.is_published ? "#fff3e0" : "#e8f5e9", border: `1px solid ${t.is_published ? "#e65100" : "#2e7d32"}`, color: t.is_published ? "#e65100" : "#2e7d32", borderRadius: 4 }}>
                    {t.is_published ? "🙈 Скрыть" : "✅ Опубликовать"}
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
                      <div style={{ fontWeight: 500, marginBottom: 6, flex: 1 }}>{i + 1}. {q.text}</div>
                      <button onClick={() => deleteQuestion(q.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#f44336", fontSize: 16, padding: "0 4px" }}>✕</button>
                    </div>
                    {q.options?.map(o => (
                      <div key={o.id} style={{ fontSize: 13, padding: "2px 0", color: o.is_correct ? "#2e7d32" : "#555" }}>
                        {o.is_correct ? "✓" : "○"} {o.text}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <form onSubmit={addQuestion} style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <h4 style={{ margin: 0 }}>Добавить вопрос</h4>
                <textarea placeholder="Текст вопроса" required value={questionForm.text}
                  onChange={e => setQuestionForm({ ...questionForm, text: e.target.value })}
                  style={{ resize: "vertical", minHeight: 60, padding: "0.5rem" }} />
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
                <button type="submit" disabled={saving}>Добавить вопрос</button>
              </form>
            </>
          ) : (
            <p style={{ color: "#999", marginTop: "3rem", textAlign: "center" }}>Выберите тест слева</p>
          )}
        </div>
      </div>
    </div>
  );
}
