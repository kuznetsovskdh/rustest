import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";

export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [test, setTest] = useState(null);
  const [rules, setRules] = useState({});
  const [expandedRule, setExpandedRule] = useState(null);

  useEffect(() => {
    api.get(`/attempts/${id}`).then(async r => {
      setAttempt(r.data);
      const t = await api.get(`/tests/${r.data.test_id}`);
      setTest(t.data);
    });
  }, [id]);

  async function loadRule(ruleId) {
    if (expandedRule === ruleId) { setExpandedRule(null); return; }
    if (!rules[ruleId]) {
      const r = await api.get(`/rules/${ruleId}`);
      setRules({ ...rules, [ruleId]: r.data });
    }
    setExpandedRule(ruleId);
  }

  if (!attempt || !test) return <p>Загрузка...</p>;

  const pct = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;

  const questionsMap = {};
  test.questions.forEach(q => { questionsMap[q.id] = q; });

  return (
    <div>
      <button onClick={() => navigate("/catalog")} style={{ marginBottom: "1rem", background: "none", border: "none", cursor: "pointer", color: "#666" }}>← Назад</button>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h2>Результат</h2>
        <div style={{ fontSize: "4rem", fontWeight: "bold", color: pct >= 70 ? "green" : "red" }}>{pct}%</div>
        <p>Правильных ответов: {attempt.score} из {attempt.total}</p>
      </div>

      <h3>Разбор ответов</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {attempt.answers.map((a, i) => {
          const q = questionsMap[a.question_id];
          const correctOption = q?.options?.find(o => o.is_correct);
          const selectedOption = q?.options?.find(o => o.id === a.selected_option_id);
          const ruleId = q?.rule_id;

          return (
            <div key={i} style={{ border: `1px solid ${a.is_correct ? "#c8e6c9" : "#ffcdd2"}`, borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "0.75rem 1rem", background: a.is_correct ? "#e8f5e9" : "#ffebee" }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>
                  {a.is_correct ? "✅" : "❌"} Вопрос {i + 1}: {q?.text}
                </div>
                {!a.is_correct && (
                  <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ color: "#c62828" }}>Ваш ответ: {selectedOption?.text || "—"}</span>
                    <span style={{ color: "#2e7d32" }}>Правильно: {correctOption?.text || "—"}</span>
                  </div>
                )}
              </div>
              {!a.is_correct && ruleId && (
                <div>
                  <button onClick={() => loadRule(ruleId)}
                    style={{ width: "100%", padding: "0.5rem 1rem", background: "#f5f5f5", border: "none", borderTop: "1px solid #ddd", cursor: "pointer", textAlign: "left", fontSize: 13, color: "#1565c0" }}>
                    📚 {expandedRule === ruleId ? "Скрыть правило" : "Почитать правило"}
                  </button>
                  {expandedRule === ruleId && rules[ruleId] && (
                    <div style={{ padding: "1rem", borderTop: "1px solid #eee", background: "white" }}>
                      <div style={{ fontWeight: 500, marginBottom: "0.5rem" }}>{rules[ruleId].title}</div>
                      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#333", whiteSpace: "pre-line", margin: "0 0 0.75rem" }}>{rules[ruleId].explanation}</p>
                      {rules[ruleId].examples?.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          {rules[ruleId].examples.map((ex, j) => (
                            <div key={j} style={{ background: "#f9f9f9", borderRadius: 6, padding: "0.5rem 0.75rem", fontSize: 13 }}>
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
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
        <button onClick={() => navigate("/catalog")}>Каталог</button>
        <button onClick={() => navigate("/history")}>История</button>
      </div>
    </div>
  );
}
