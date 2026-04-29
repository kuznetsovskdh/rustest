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

  function showMsg(msg) { setMessage(msg); setTimeout(() => setMessage(""), 2500); }

  async function saveTest(e) {
    e.preventDefault(); setSaving(true);
    if (editMode && selectedTest) {
      await api.put(`/tests/${selectedTest.id}`, { ...testForm, timer_seconds: parseInt(testForm.timer_seconds) });
      await loadTest(selectedTest.id);
      showMsg("Тест обновлён");
    } else {
      const r = await api.post("/tests", { ...testForm, timer_seconds: parseInt(testForm.timer_seconds) });
      await loadTest(r.data.id);
      showMsg("Тест создан");
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
    else { await api.patch(`/tests/${test.id}/publish`); showMsg("Тест опубликован"); }
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
      showMsg("Вопрос обновлён");
      setEditingQuestion(null);
    } else {
      await api.post(`/tests/${selectedTest.id}/questions`, payload);
      showMsg("Вопрос добавлен");
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

  const diffTag = (d) => ({ easy: "tag-green", medium: "tag-amber", hard: "tag-red" }[d] || "tag-gray");

  return (
    <div>
      <button onClick={() => navigate("/admin")} style={{ background: "none", border: "none", color: "var(--ink-600)", padding: "0 0 1.5rem", fontSize: "0.85rem" }}>← Назад</button>

      {message && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "var(--green)", padding: "0.6rem 1rem", borderRadius: "var(--radius-sm)", marginBottom: "1.25rem", fontSize: "0.85rem" }}>
          {message}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "2rem", alignItems: "start" }}>

        {/* LEFT: Tests list */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem" }}>Тесты ({tests.length})</h2>
            <button className="primary" onClick={() => { setShowForm(!showForm); setEditMode(false); setTestForm({ title: "", description: "", category: "", difficulty: "easy", timer_seconds: 120 }); }}
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem" }}>
              + Новый
            </button>
          </div>

          {showForm && (
            <form onSubmit={saveTest} className="card" style={{ padding: "1.25rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--ink-600)", marginBottom: "0.25rem" }}>
                {editMode ? "Редактировать тест" : "Новый тест"}
              </p>
              <input placeholder="Название" required value={testForm.title} onChange={e => setTestForm({ ...testForm, title: e.target.value })} />
              <input placeholder="Описание" value={testForm.description} onChange={e => setTestForm({ ...testForm, description: e.target.value })} />
              <input placeholder="Категория" required value={testForm.category} onChange={e => setTestForm({ ...testForm, category: e.target.value })} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <select value={testForm.difficulty} onChange={e => setTestForm({ ...testForm, difficulty: e.target.value })}>
                  {difficulties.map(d => <option key={d} value={d}>{difficultyLabel[d]}</option>)}
                </select>
                <input type="number" placeholder="Таймер (сек)" value={testForm.timer_seconds} onChange={e => setTestForm({ ...testForm, timer_seconds: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" className="primary" disabled={saving} style={{ flex: 1 }}>{editMode ? "Сохранить" : "Создать"}</button>
                <button type="button" onClick={() => setShowForm(false)}>Отмена</button>
              </div>
            </form>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {tests.map(t => (
              <div key={t.id} className={`card ${selectedTest?.id === t.id ? "" : "card-interactive"}`}
                style={{ overflow: "hidden", border: selectedTest?.id === t.id ? "1px solid var(--accent)" : undefined }}
                onClick={() => loadTest(t.id)}>
                <div style={{ padding: "0.875rem 1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.35rem" }}>
                    <span style={{ fontWeight: 400, fontSize: "0.9rem", lineHeight: 1.3 }}>{t.title}</span>
                    <span className={`tag ${t.is_published ? "tag-green" : "tag-amber"}`} style={{ flexShrink: 0 }}>
                      {t.is_published ? "Опубликован" : "Черновик"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--ink-600)" }}>{t.category}</span>
                    <span style={{ color: "var(--ink-400)", fontSize: "0.75rem" }}>·</span>
                    <span className={`tag ${diffTag(t.difficulty)}`} style={{ fontSize: "0.7rem", padding: "0.1rem 0.5rem" }}>{difficultyLabel[t.difficulty]}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem 1rem 0.75rem", borderTop: "1px solid var(--color-border)" }}
                  onClick={e => e.stopPropagation()}>
                  <button onClick={() => startEditTest(t)} style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}>Изменить</button>
                  <button onClick={() => togglePublish(t)}
                    className={t.is_published ? "danger" : "success"}
                    style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}>
                    {t.is_published ? "Скрыть" : "Опубликовать"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Questions */}
        <div>
          {selectedTest ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "1.1rem" }}>Вопросы ({selectedTest.questions?.length || 0})</h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
                {(selectedTest.questions || []).map((q, i) => (
                  <div key={q.id} className="card" style={{ padding: "0.875rem 1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 400, fontSize: "0.9rem", marginBottom: "0.5rem" }}>{i + 1}. {q.text}</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                          {q.options?.map(o => (
                            <span key={o.id} style={{ fontSize: "0.8rem", color: o.is_correct ? "var(--green)" : "var(--ink-600)" }}>
                              {o.is_correct ? "✓" : "○"} {o.text}
                            </span>
                          ))}
                        </div>
                        {q.rule_id
                          ? <span style={{ fontSize: "0.72rem", color: "var(--blue)", marginTop: "0.35rem", display: "block" }}>
                              Правило: {rules.find(r => r.id === q.rule_id)?.title || `#${q.rule_id}`}
                            </span>
                          : <span style={{ fontSize: "0.72rem", color: "var(--ink-400)", marginTop: "0.35rem", display: "block" }}>Без правила</span>
                        }
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", marginLeft: "0.75rem", flexShrink: 0 }}>
                        <button onClick={() => startEditQuestion(q)} style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}>Изменить</button>
                        <button onClick={() => deleteQuestion(q.id)} className="danger" style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}>Удалить</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ padding: "1.25rem" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--ink-600)", marginBottom: "1rem" }}>
                  {editingQuestion ? "Редактировать вопрос" : "Добавить вопрос"}
                </p>
                <form onSubmit={saveQuestion} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <textarea placeholder="Текст вопроса" required value={questionForm.text}
                    onChange={e => setQuestionForm({ ...questionForm, text: e.target.value })}
                    style={{ resize: "vertical", minHeight: 72 }} />
                  <select value={questionForm.rule_id} onChange={e => setQuestionForm({ ...questionForm, rule_id: e.target.value })}>
                    <option value="">Без правила</option>
                    {rules.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                  </select>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {questionForm.options.map((o, i) => (
                      <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input type="radio" name="correct" checked={o.is_correct} onChange={() => updateOption(i, "is_correct", true)} style={{ width: "auto", flexShrink: 0 }} />
                        <input placeholder={`Вариант ${i + 1}`} required value={o.text} onChange={e => updateOption(i, "text", e.target.value)} />
                        <button type="button" className="danger" onClick={() => {
                          if (questionForm.options.length > 2) setQuestionForm({ ...questionForm, options: questionForm.options.filter((_, idx) => idx !== i) });
                        }} style={{ padding: "0.3rem 0.6rem", flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setQuestionForm({ ...questionForm, options: [...questionForm.options, { text: "", is_correct: false }] })}
                    style={{ border: "1px dashed var(--color-border)", background: "none", color: "var(--ink-600)" }}>
                    + Добавить вариант
                  </button>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button type="submit" className="primary" disabled={saving}>{editingQuestion ? "Сохранить" : "Добавить"}</button>
                    {editingQuestion && <button type="button" onClick={() => { setEditingQuestion(null); setQuestionForm({ text: "", rule_id: "", options: [{ text: "", is_correct: false }, { text: "", is_correct: false }] }); }}>Отмена</button>}
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "var(--ink-400)", fontSize: "0.9rem" }}>
              Выберите тест слева
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
