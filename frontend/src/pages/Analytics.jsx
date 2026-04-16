import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

export default function Analytics() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState([]);
  const [errors, setErrors] = useState([]);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <p>Загрузка...</p>;

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ marginBottom: "1rem", background: "none", border: "none", cursor: "pointer", color: "#666" }}>← Назад</button>
      <h2>Моя аналитика</h2>

      <h3>📈 Прогресс по датам</h3>
      {progress.length === 0 ? <p>Нет данных</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {progress.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ minWidth: 100, color: "#666", fontSize: 14 }}>{p.date}</span>
              <div style={{ flex: 1, background: "#f0f0f0", borderRadius: 4, height: 24, position: "relative" }}>
                <div style={{ width: `${p.score_pct}%`, background: p.score_pct >= 70 ? "#4caf50" : "#f44336", height: "100%", borderRadius: 4 }} />
              </div>
              <span style={{ minWidth: 45, fontWeight: 500 }}>{p.score_pct}%</span>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ marginTop: "2rem" }}>❌ Сложные вопросы</h3>
      {errors.length === 0 ? <p>Ошибок нет — отличный результат!</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {errors.map((e, i) => (
            <div key={i} style={{ padding: "0.75rem", background: "#fff3f3", borderRadius: 6, display: "flex", justifyContent: "space-between" }}>
              <span>Вопрос #{e.question_id}</span>
              <span style={{ color: "#f44336", fontWeight: 500 }}>{e.error_rate}% ошибок</span>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ marginTop: "2rem" }}>💡 Рекомендации</h3>
      {recs.length === 0 ? <p>Всё отлично, продолжайте в том же духе!</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {recs.map((r, i) => (
            <div key={i} style={{ padding: "0.75rem", background: "#fff8e1", borderRadius: 6 }}>
              {r.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
