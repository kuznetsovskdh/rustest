import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";

export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);

  useEffect(() => { api.get(`/attempts/${id}`).then(r => setAttempt(r.data)); }, [id]);

  if (!attempt) return <p>Загрузка...</p>;

  const pct = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ textAlign: "left" }}>
        <button onClick={() => navigate("/catalog")} style={{ marginBottom: "1rem", background: "none", border: "none", cursor: "pointer", color: "#666" }}>← Назад</button>
      </div>
      <h2>Результат</h2>
      <div style={{ fontSize: "4rem", fontWeight: "bold", color: pct >= 70 ? "green" : "red" }}>{pct}%</div>
      <p>Правильных ответов: {attempt.score} из {attempt.total}</p>
      <h3>Разбор ответов</h3>
      <div style={{ textAlign: "left" }}>
        {attempt.answers.map((a, i) => (
          <div key={i} style={{ padding: "0.5rem", margin: "0.25rem 0", background: a.is_correct ? "#e8f5e9" : "#ffebee", borderRadius: 6 }}>
            Вопрос {i + 1}: {a.is_correct ? "✅ Верно" : "❌ Неверно"}
          </div>
        ))}
      </div>
      <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
        <button onClick={() => navigate("/catalog")}>Каталог</button>
        <button onClick={() => navigate("/history")}>История</button>
      </div>
    </div>
  );
}
