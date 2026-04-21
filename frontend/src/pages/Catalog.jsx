import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

const difficultyLabel = { easy: "Лёгкий", medium: "Средний", hard: "Сложный" };
const difficultyColor = { easy: "#2e7d32", medium: "#e65100", hard: "#c62828" };

export default function Catalog() {
  const [tests, setTests] = useState([]);
  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => { api.get("/tests").then(r => setTests(Array.isArray(r.data) ? r.data : [])).catch(() => setTests([])); }, []);

  const categories = ["Все", ...Array.from(new Set(tests.map(t => t.category)))];
  const filtered = tests.filter(t =>
    (category === "Все" || t.category === category) &&
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h2>Каталог тестов</h2>
      <input placeholder="Поиск по названию..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: 6, border: "1px solid #ddd", marginBottom: "1rem", boxSizing: "border-box" }} />
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {categories.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            style={{ padding: "0.35rem 1rem", borderRadius: 20, border: "1px solid #ddd", cursor: "pointer",
              background: category === c ? "#1a1a2e" : "white", color: category === c ? "white" : "#333", fontSize: 13 }}>
            {c}
          </button>
        ))}
      </div>
      {filtered.length === 0 && <p style={{ color: "#999" }}>Тестов не найдено</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {filtered.map(t => (
          <div key={t.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: "0 0 4px" }}>{t.title}</h3>
              <div style={{ display: "flex", gap: "0.75rem", fontSize: 13 }}>
                <span style={{ color: "#666" }}>{t.category}</span>
                <span style={{ color: difficultyColor[t.difficulty] }}>{difficultyLabel[t.difficulty]}</span>
                <span style={{ color: "#999" }}>⏱ {t.timer_seconds}с</span>
              </div>
            </div>
            <button onClick={() => navigate(`/test/${t.id}`)} style={{ padding: "0.5rem 1.25rem", cursor: "pointer" }}>Начать</button>
          </div>
        ))}
      </div>
    </div>
  );
}
