import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

export default function Notifications() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/auth/notifications").then(r => setNotifs(Array.isArray(r.data) ? r.data : [])).finally(() => setLoading(false));
  }, []);

  async function markRead(id) {
    await api.patch(`/auth/notifications/${id}/read`);
    setNotifs(notifs.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  function handleAction(notif) {
    markRead(notif.id);
    if (notif.type === "invite_test" && notif.payload) {
      const parts = notif.payload.split(":");
      const token = parts[2];
      if (token) navigate(`/link/${token}`);
    }
  }

  const unread = notifs.filter(n => !n.is_read).length;

  if (loading) return <p>Загрузка...</p>;

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ marginBottom: "1rem", background: "none", border: "none", cursor: "pointer", color: "#666" }}>← Назад</button>
      <h2>Уведомления {unread > 0 && <span style={{ background: "#f44336", color: "white", borderRadius: 12, padding: "2px 8px", fontSize: 14 }}>{unread}</span>}</h2>
      {notifs.length === 0 && <p style={{ color: "#999" }}>Уведомлений нет</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {notifs.map(n => (
          <div key={n.id} style={{ padding: "1rem", border: `1px solid ${n.is_read ? "#eee" : "#1565c0"}`, borderRadius: 8, background: n.is_read ? "white" : "#e3f2fd", opacity: n.is_read ? 0.7 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                {n.type === "invite_test" && (
                  <>
                    <div style={{ fontWeight: 500 }}>📝 Приглашение пройти тест</div>
                    <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
                      {n.payload?.split(":")?.[1] || "Тест"}
                    </div>
                  </>
                )}
                {n.type === "invite_student" && (
                  <div style={{ fontWeight: 500 }}>👋 Вас добавили как ученика</div>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {n.type === "invite_test" && !n.is_read && (
                  <button onClick={() => handleAction(n)}
                    style={{ fontSize: 12, background: "#1a1a2e", color: "white", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>
                    Перейти к тесту
                  </button>
                )}
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)} style={{ fontSize: 12, cursor: "pointer" }}>✓ Прочитано</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
