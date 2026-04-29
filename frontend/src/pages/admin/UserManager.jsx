import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

const roles = ["user", "teacher", "admin"];

export default function UserManager() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/auth/users").then(r => setUsers(r.data)).finally(() => setLoading(false));
  }, []);

  function showMsg(msg) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2000);
  }

  async function changeRole(userId, role) {
    setSaving(userId + "_role");
    try {
      await api.patch(`/auth/users/${userId}/role?role=${role}`);
      setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
      showMsg("Роль обновлена ✓");
    } catch { showMsg("Ошибка при обновлении роли"); }
    setSaving(null);
  }

  async function toggleFreeze(userId) {
    setSaving(userId + "_freeze");
    try {
      const r = await api.patch(`/auth/users/${userId}/freeze`);
      setUsers(users.map(u => u.id === userId ? { ...u, is_frozen: r.data.is_frozen } : u));
      showMsg(r.data.is_frozen ? "Аккаунт заморожен" : "Аккаунт разморожен ✓");
    } catch { showMsg("Ошибка"); }
    setSaving(null);
  }

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p>Загрузка...</p>;

  return (
    <div>
      <button onClick={() => navigate("/admin")} style={{ marginBottom: "1rem", background: "none", border: "none", cursor: "pointer", color: "#666" }}>← Назад</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Пользователи ({users.length})</h2>
        {message && <span style={{ color: message.includes("Ошибка") ? "red" : "green", fontSize: 14 }}>{message}</span>}
      </div>
      <input placeholder="Поиск по email или имени..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: 6, border: "1px solid #ddd", marginBottom: "1rem", boxSizing: "border-box" }} />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
            <th style={{ padding: "0.75rem" }}>ID</th>
            <th style={{ padding: "0.75rem" }}>Имя</th>
            <th style={{ padding: "0.75rem" }}>Email</th>
            <th style={{ padding: "0.75rem" }}>Роль</th>
            <th style={{ padding: "0.75rem" }}>Изменить роль</th>
            <th style={{ padding: "0.75rem" }}>Статус</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(u => (
            <tr key={u.id} style={{ borderBottom: "1px solid #eee", opacity: u.is_frozen ? 0.6 : 1 }}>
              <td style={{ padding: "0.75rem", color: "#999" }}>{u.id}</td>
              <td style={{ padding: "0.75rem" }}>{u.name}</td>
              <td style={{ padding: "0.75rem" }}>{u.email}</td>
              <td style={{ padding: "0.75rem" }}>
                <span style={{ padding: "0.25rem 0.75rem", borderRadius: 12, fontSize: 13,
                  background: u.role === "admin" ? "#e3f2fd" : u.role === "teacher" ? "#e8f5e9" : "#f5f5f5",
                  color: u.role === "admin" ? "#1565c0" : u.role === "teacher" ? "#2e7d32" : "#555" }}>
                  {u.role}
                </span>
              </td>
              <td style={{ padding: "0.75rem" }}>
                <select value={u.role} disabled={saving === u.id + "_role" || u.role === "admin"}
                  onChange={e => changeRole(u.id, e.target.value)}
                  style={{ padding: "0.25rem 0.5rem", borderRadius: 4, border: "1px solid #ddd" }}>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </td>
              <td style={{ padding: "0.75rem" }}>
                {u.role !== "admin" && (
                  <button onClick={() => toggleFreeze(u.id)} disabled={saving === u.id + "_freeze"}
                    style={{ fontSize: 12, padding: "3px 10px", cursor: "pointer", borderRadius: 4, border: "none",
                      background: u.is_frozen ? "#e8f5e9" : "#fff3e0", color: u.is_frozen ? "#2e7d32" : "#e65100" }}>
                    {u.is_frozen ? "Разморозить" : "Заморозить"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && <p style={{ color: "#999", textAlign: "center" }}>Пользователи не найдены</p>}
    </div>
  );
}
