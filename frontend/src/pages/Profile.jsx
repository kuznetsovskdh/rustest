import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/auth/me").then(r => { setUser(r.data); setName(r.data.name); });
  }, []);

  function showMsg(msg, isError = false) {
    if (isError) { setError(msg); setTimeout(() => setError(""), 3000); }
    else { setMessage(msg); setTimeout(() => setMessage(""), 3000); }
  }

  async function updateName(e) {
    e.preventDefault();
    try {
      await api.patch("/auth/me/name", { name });
      setUser({ ...user, name });
      showMsg("Имя обновлено");
    } catch { showMsg("Ошибка при обновлении", true); }
  }

  async function updatePassword(e) {
    e.preventDefault();
    if (newPassword.length < 6) { showMsg("Пароль минимум 6 символов", true); return; }
    try {
      await api.patch("/auth/me/password", { old_password: oldPassword, new_password: newPassword });
      setOldPassword(""); setNewPassword("");
      showMsg("Пароль изменён");
    } catch { showMsg("Неверный текущий пароль", true); }
  }

  if (!user) return <p>Загрузка...</p>;

  const roleLabel = { user: "Пользователь", teacher: "Преподаватель", admin: "Администратор", guest: "Гость" };
  const roleColor = { user: "#555", teacher: "#2e7d32", admin: "#1565c0", guest: "#999" };

  return (
    <div style={{ maxWidth: 480 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: "1rem", background: "none", border: "none", cursor: "pointer", color: "#666" }}>← Назад</button>
      <h2>Профиль</h2>
      {message && <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "0.5rem 1rem", borderRadius: 6, marginBottom: "1rem" }}>{message}</div>}
      {error && <div style={{ background: "#ffebee", color: "#c62828", padding: "0.5rem 1rem", borderRadius: 6, marginBottom: "1rem" }}>{error}</div>}

      <div style={{ background: "#f5f5f5", borderRadius: 8, padding: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 18 }}>{user.name}</div>
            <div style={{ color: "#666", fontSize: 14 }}>{user.email}</div>
          </div>
          <span style={{ padding: "0.25rem 0.75rem", borderRadius: 12, fontSize: 13, background: "#e3f2fd", color: roleColor[user.role] }}>
            {roleLabel[user.role]}
          </span>
        </div>
      </div>

      <h3>Изменить имя</h3>
      <form onSubmit={updateName} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <input value={name} onChange={e => setName(e.target.value)} required style={{ flex: 1, padding: "0.5rem", borderRadius: 6, border: "1px solid #ddd" }} />
        <button type="submit">Сохранить</button>
      </form>

      <h3>Изменить пароль</h3>
      <form onSubmit={updatePassword} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <input type="password" placeholder="Текущий пароль" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
        <input type="password" placeholder="Новый пароль (мин. 6 символов)" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
        <button type="submit">Изменить пароль</button>
      </form>
    </div>
  );
}
