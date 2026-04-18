import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const navigate = useNavigate();

  return (
    <div>
      <h2>Админ-панель</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 400 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1.25rem", cursor: "pointer" }}
          onClick={() => navigate("/admin/tests")}>
          <h3 style={{ margin: 0 }}>📝 Конструктор тестов</h3>
          <p style={{ color: "#666", margin: "0.5rem 0 0" }}>Создавать тесты, добавлять вопросы и варианты ответов</p>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1.25rem", cursor: "pointer" }}
          onClick={() => navigate("/admin/users")}>
          <h3 style={{ margin: 0 }}>👥 Управление пользователями</h3>
          <p style={{ color: "#666", margin: "0.5rem 0 0" }}>Просматривать пользователей и назначать роли</p>
        </div>
      </div>
    </div>
  );
}
