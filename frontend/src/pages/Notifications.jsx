import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

export default function Notifications() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/auth/notifications").then(r => setNotifs(Array.isArray(r.data) ? r.data : [])).finally(() => setLoading(false));
  }, []);

  function showMsg(msg) { setMessage(msg); setTimeout(() => setMessage(""), 2500); }

  async function markRead(id) {
    await api.patch(`/auth/notifications/${id}/read`);
    setNotifs(notifs.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function acceptInvite(notif) {
    await api.post(`/auth/notifications/${notif.id}/accept`);
    setNotifs(notifs.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    showMsg("Вы приняли приглашение");
  }

  async function declineInvite(notif) {
    await markRead(notif.id);
    showMsg("Приглашение отклонено");
  }

  async function goToTest(notif) {
    await markRead(notif.id);
    const parts = notif.payload?.split(":");
    const token = parts?.[2];
    if (token) navigate(`/link/${token}`);
  }

  const unread = notifs.filter(n => !n.is_read).length;

  if (loading) return <p>Загрузка...</p>;

  return (
    <div style={{ maxWidth: 600 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: "1rem", background: "none", border: "none", cursor: "pointer", color: "#666" }}>← Назад</button>
      <h2>Уведомления {unread > 0 && <span style={{ background: "#f44336", color: "white", borderRadius: 12, padding: "2px 8px", fontSize: 14, marginLeft: 8 }}>{unread}</span>}</h2>
      {message && <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "0.5rem 1rem", borderRadius: 6, marginBottom: "1rem" }}>{message}</div>}
      {notifs.length === 0 && <p style={{ color: "#999" }}>Уведомлений нет</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {notifs.map(n => (
          <div key={n.id} style={{ padding: "1rem", border: `1px solid ${n.is_read ? "#eee" : "#1565c0"}`, borderRadius: 8, background: n.is_read ? "white" : "#e3f2fd", opacity: n.is_read ? 0.65 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <div>
                {n.type === "invite_student" && (
                  <>
                    <div style={{ fontWeight: 500 }}>Приглашение от преподавателя</div>
                    <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
                      {n.payload?.split(":")?.[1] || "Преподаватель"} приглашает вас стать учеником
                    </div>
                  </>
                )}
                {n.type === "invite_test" && (
                  <>
                    <div style={{ fontWeight: 500 }}>Приглашение пройти тест</div>
                    <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
                      Тест: {n.payload?.split(":")?.[1] || ""}
                    </div>
                  </>
                )}
              </div>
              {!n.is_read && (
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  {n.type === "invite_student" && (
                    <>
                      <button onClick={() => acceptInvite(n)}
                        style={{ fontSize: 12, background: "#1a1a2e", color: "white", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>
                        Принять
                      </button>
                      <button onClick={() => declineInvite(n)}
                        style={{ fontSize: 12, background: "none", border: "1px solid #ddd", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>
                        Отклонить
                      </button>
                    </>
                  )}
                  {n.type === "invite_test" && (
                    <button onClick={() => goToTest(n)}
                      style={{ fontSize: 12, background: "#1a1a2e", color: "white", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>
                      Перейти к тесту
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
