import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

const difficultyLabel = { easy: "Лёгкий", medium: "Средний", hard: "Сложный" };

export default function Catalog() {
  const [tests, setTests] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/tests").then(r => {
      const data = Array.isArray(r.data) ? r.data : [];
      setTests(data);
    }).catch(() => setTests([]));
  }, []);

  return (
    <div>
      <h2>Каталог тестов</h2>
      {tests.length === 0 && <p>Тестов пока нет</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {tests.map(t => (
          <div key={t.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}>
            <h3 style={{ margin: 0 }}>{t.title}</h3>
            <p style={{ margin: "0.5rem 0", color: "#666" }}>
              {t.category} · {difficultyLabel[t.difficulty]} · {t.timer_seconds}с
            </p>
            <button onClick={() => navigate(`/test/${t.id}`)}>Начать тест</button>
          </div>
        ))}
      </div>
    </div>
  );
}
