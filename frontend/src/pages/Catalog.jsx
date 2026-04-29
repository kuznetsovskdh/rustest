import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

const difficultyLabel = { easy: "Лёгкий", medium: "Средний", hard: "Сложный" };
const difficultyColor = { easy: "#16a34a", medium: "#d97706", hard: "#dc2626" };

export default function Catalog() {
  const [tests, setTests] = useState([]);
  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/tests").then(r => setTests(Array.isArray(r.data) ? r.data : [])).catch(() => setTests([]));
  }, []);

  const categories = ["Все", ...Array.from(new Set(tests.map(t => t.category)))];
  const filtered = tests.filter(t =>
    (category === "Все" || t.category === category) &&
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "3rem 2rem" }}>
      <div style={{ marginBottom: "3rem" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>Каталог тестов</h1>
        <p style={{ color: "var(--color-ink-secondary)", fontSize: "1rem" }}>
          Проверьте знания русского языка
        </p>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            placeholder="Поиск по названию..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{
              padding: "0.4rem 1rem",
              borderRadius: 20,
              fontSize: "0.8rem",
              background: category === c ? "var(--color-ink)" : "white",
              color: category === c ? "var(--color-paper)" : "var(--color-ink-secondary)",
              border: `1px solid ${category === c ? "var(--color-ink)" : "var(--color-border)"}`,
            }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-ink-tertiary)" }}>
          <p>Тестов не найдено</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
        {filtered.map(t => (
          <div key={t.id} style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(8px)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: "var(--shadow-sm)",
          }}
            onClick={() => navigate(`/test/${t.id}`)}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.transform = "none"; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <span style={{
                fontSize: "0.75rem",
                fontWeight: 400,
                letterSpacing: "0.06em",
                color: "var(--color-ink-secondary)",
                textTransform: "uppercase",
              }}>
                {t.category}
              </span>
              <span style={{
                fontSize: "0.75rem",
                color: difficultyColor[t.difficulty],
                fontWeight: 400,
              }}>
                {difficultyLabel[t.difficulty]}
              </span>
            </div>
            <h3 style={{ marginBottom: "1.25rem", fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "1.15rem", lineHeight: 1.3 }}>
              {t.title}
            </h3>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--color-ink-tertiary)" }}>
                {t.timer_seconds} сек
              </span>
              <button className="primary" style={{ fontSize: "0.8rem", padding: "0.4rem 1rem" }}
                onClick={e => { e.stopPropagation(); navigate(`/test/${t.id}`); }}>
                Начать
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
