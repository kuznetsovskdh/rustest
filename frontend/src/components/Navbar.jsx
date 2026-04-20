import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/client";

function parseToken(token) {
  try { return JSON.parse(atob(token.split(".")[1])); }
  catch { return null; }
}

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const payload = token ? parseToken(token) : null;
  const isAdmin = payload?.role === "admin";
  const isTeacher = payload?.role === "teacher" || isAdmin;
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!token) return;
    api.get("/auth/notifications").then(r => {
      const data = Array.isArray(r.data) ? r.data : [];
      setUnread(data.filter(n => !n.is_read).length);
    }).catch(() => {});
  }, [token]);

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <nav style={{ background: "#1a1a2e", padding: "1rem 2rem", display: "flex", gap: "1.5rem", alignItems: "center" }}>
      <Link to="/catalog" style={{ color: "#fff", fontWeight: "bold", textDecoration: "none" }}>Рустест</Link>
      <Link to="/catalog" style={{ color: "#ccc", textDecoration: "none" }}>Каталог</Link>
      {token && <Link to="/history" style={{ color: "#ccc", textDecoration: "none" }}>История</Link>}
      {token && <Link to="/analytics" style={{ color: "#ccc", textDecoration: "none" }}>Аналитика</Link>}
      {isTeacher && <Link to="/teacher" style={{ color: "#90caf9", textDecoration: "none" }}>Преподаватель</Link>}
      {isAdmin && <Link to="/admin" style={{ color: "#f0c040", textDecoration: "none" }}>Админ</Link>}
      {token && (
        <Link to="/notifications" style={{ color: "#ccc", textDecoration: "none", position: "relative" }}>
          🔔
          {unread > 0 && (
            <span style={{ position: "absolute", top: -6, right: -8, background: "#f44336", color: "white", borderRadius: "50%", width: 16, height: 16, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {unread}
            </span>
          )}
        </Link>
      )}
      <div style={{ marginLeft: "auto" }}>
        {token
          ? <button onClick={logout} style={{ cursor: "pointer" }}>Выйти</button>
          : <Link to="/login" style={{ color: "#ccc", textDecoration: "none" }}>Войти</Link>}
      </div>
    </nav>
  );
}
