import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

export default function Analytics() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState([]);
  const [errors, setErrors] = useState([]);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedQ, setExpandedQ] = useState(null);
  const [questionData, setQuestionData] = useState({});
  const [expandedRule, setExpandedRule] = useState(null);
  const [rules, setRules] = useState({});

  useEffect(() => {
    Promise.all([
      api.get("/analytics/progress"),
      api.get("/analytics/errors"),
      api.get("/analytics/recommendations"),
    ]).then(([p, e, r]) => {
      setProgress(Array.isArray(p.data) ? p.data : []);
      setErrors(Array.isArray(e.data) ? e.data : []);
      setRecs(Array.isArray(r.data) ? r.data : []);
    }).finally(() => setLoading(false));
  }, []);

  async function loadQuestionErrors(questionId) {
    if (expandedQ === questionId) { setExpandedQ(null); return; }
    setExpandedQ(questionId);
    if (!questionData[questionId]) {
      const [errRes, qRes] = await Promise.all([
        api.get(`/analytics/question-errors/${questionId}`),
        api.get(`/questions/${questionId}`).catch(() => ({ data: null }))
      ]);
      setQuestionData(prev => ({ ...prev, [questionId]: { errors: errRes.data, questionInfo: qRes.data } }));
    }
  }

  async function loadRule(ruleId) {
    if (expandedRule === ruleId) { setExpandedRule(null); return; }
    setExpandedRule(ruleId);
    if (!rules[ruleId]) {
      const r = await api.get(`/rules/${ruleId}`);
      setRules(prev => ({ ...prev, [ruleId]: r.data }));
    }
  }

  if (loading) return <p>Загрузка...</p>;

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ marginBottom: "1rem", background: "none", border: "none", cursor: "pointer", color: "#666" }}>← Назад</button>
      <h2>Моя аналитика</h2>

      <h3>📈 Прогресс по датам</h3>
      {progress.length === 0 ? <p style={{ color: "#999" }}>Нет данных</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "2rem" }}>
          {progress.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ minWidth: 100, color: "#666", fontSize: 14 }}>{p.date}</span>
              <div style={{ flex: 1, background: "#f0f0f0", borderRadius: 4, height: 24 }}>
                <div style={{ width: `${p.score_pct}%`, background: p.score_pct >= 70 ? "#4caf50" : "#f44336", height: "100%", borderRadius: 4 }} />
              </div>
              <span style={{ minWidth: 45, fontWeight: 500 }}>{p.score_pct}%</span>
            </div>
          ))}
        </div>
      )}

      <h3>❌ Сложные вопросы</h3>
      {errors.length === 0 ? <p style={{ color: "#999" }}>Ошибок нет — отличный результат!</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
          {errors.map((e, i) => {
            const qd = questionData[e.question_id];
            const q = qd?.questionInfo;
            const correctOption = q?.options?.find(o => o.is_correct);
            return (
              <div key={i} style={{ border: "1px solid #ffcdd2", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: "0.75rem 1rem", background: "#fff3f3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, marginRight: 8 }}>
                    <span style={{ fontWeight: 500 }}>{q ? q.text : `Вопрос #${e.question_id}`}</span>
                    <span style={{ marginLeft: 8, color: "#f44336", fontSize: 13 }}>{e.error_rate}% ошибок</span>
                  </div>
                  <button onClick={() => loadQuestionErrors(e.question_id)}
                    style={{ fontSize: 12, padding: "4px 10px", cursor: "pointer", background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: 4, color: "#c62828", whiteSpace: "nowrap" }}>
                    {expandedQ === e.question_id ? "Скрыть" : "Посмотреть ошибки"}
                  </button>
                </div>

                {expandedQ === e.question_id && qd && (
                  <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid #ffcdd2", background: "white" }}>
                    {correctOption && (
                      <div style={{ fontSize: 14, marginBottom: "0.75rem", padding: "6px 10px", background: "#e8f5e9", borderRadius: 6 }}>
                        ✅ Правильный ответ: <strong>{correctOption.text}</strong>
                      </div>
                    )}

                    {qd.errors?.length > 0 && (
                      <div style={{ marginBottom: "0.75rem" }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#555", marginBottom: 6 }}>Ваши неверные ответы:</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          {qd.errors.map((err, j) => {
                            const wrongOption = q?.options?.find(o => o.id === err.selected_option_id);
                            return (
                              <div key={j} style={{ fontSize: 13, padding: "6px 10px", background: "#ffebee", borderRadius: 4, display: "flex", justifyContent: "space-between" }}>
                                <span>❌ {wrongOption ? wrongOption.text : `Вариант #${err.selected_option_id}`}</span>
                                <span style={{ color: "#999" }}>{err.date}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {q?.rule_id && (
                      <button onClick={() => loadRule(q.rule_id)}
                        style={{ fontSize: 12, padding: "4px 10px", cursor: "pointer", background: "#e3f2fd", border: "1px solid #90caf9", borderRadius: 4, color: "#1565c0" }}>
                        📚 {expandedRule === q.rule_id ? "Скрыть правило" : "Посмотреть правило"}
                      </button>
                    )}

                    {expandedRule === q?.rule_id && rules[q?.rule_id] && (
                      <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "#f5f5f5", borderRadius: 6 }}>
                        <div style={{ fontWeight: 500, marginBottom: "0.5rem" }}>{rules[q.rule_id].title}</div>
                        <p style={{ fontSize: 13, lineHeight: 1.7, color: "#333", whiteSpace: "pre-line", margin: "0 0 0.5rem" }}>{rules[q.rule_id].explanation}</p>
                        {rules[q.rule_id].examples?.map((ex, j) => (
                          <div key={j} style={{ fontSize: 13, padding: "4px 8px", background: "white", borderRadius: 4, marginTop: 4 }}>
                            <div style={{ color: "#2e7d32" }}>✓ {ex.correct}</div>
                            {ex.incorrect && <div style={{ color: "#c62828" }}>✗ {ex.incorrect}</div>}
                            {ex.comment && <div style={{ color: "#666" }}>{ex.comment}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <h3>💡 Рекомендации</h3>
      {recs.length === 0 ? <p style={{ color: "#999" }}>Всё отлично, продолжайте в том же духе!</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {recs.map((r, i) => (
            <div key={i} style={{ padding: "0.75rem", background: "#fff8e1", borderRadius: 6 }}>{r.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}
