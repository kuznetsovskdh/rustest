import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const navigate = useNavigate();
  const cards = [
    { path: "/admin/tests", title: "Конструктор тестов", desc: "Создавать тесты, добавлять вопросы и варианты ответов" },
    { path: "/admin/users", title: "Управление пользователями", desc: "Просматривать пользователей и назначать роли" },
    { path: "/admin/rules", title: "Справочник РЯ", desc: "Добавлять и редактировать правила русского языка" },
    { path: "/admin/product-analytics", title: "Product Analytics", desc: "Воронка, retention, активность, сложность вопросов" },
  ];

  return (
    <div>
      <h2>Админ-панель</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 400 }}>
        {cards.map(c => (
          <div key={c.path} style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1.25rem", cursor: "pointer" }} onClick={() => navigate(c.path)}>
            <h3 style={{ margin: 0 }}>{c.title}</h3>
            <p style={{ color: "#666", margin: "0.5rem 0 0", fontSize: 14 }}>{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
