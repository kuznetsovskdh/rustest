import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/client";

function parseToken(token) {
  try { return JSON.parse(atob(token.split(".")[1])); }
  catch { return null; }
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const payload = token ? parseToken(token) : null;
  const isAdmin = payload?.role === "admin";
  const isTeacher = payload?.role === "teacher" || isAdmin;
  const [unread, setUnread] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: scrolled ? "rgba(250,250,248,0.92)" : "var(--color-paper)",
      backdropFilter: scrolled ? "blur(12px)" : "none",
      borderBottom: `1px solid ${scrolled ? "var(--color-border)" : "transparent"}`,
      transition: "all 0.2s",
      padding: "0 2rem",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", height: 60 }}>
        <Link to="/catalog" style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", fontWeight: 400, letterSpacing: "-0.01em", marginRight: "2.5rem" }}>
          Рустест
        </Link>

        <div style={{ display: "flex", gap: "0.25rem", flex: 1 }}>
          {[
            { to: "/catalog", label: "Каталог" },
            { to: "/reference", label: "Справочник" },
            ...(token ? [{ to: "/history", label: "История" }, { to: "/analytics", label: "Аналитика" }] : []),
            ...(isTeacher ? [{ to: "/teacher", label: "Преподаватель" }] : []),
          ].map(item => (
            <Link key={item.to} to={item.to} style={{
              fontSize: "0.85rem",
              fontWeight: 400,
              padding: "0.4rem 0.85rem",
              borderRadius: "var(--radius-sm)",
              color: isActive(item.to) ? "var(--color-ink)" : "var(--color-ink-secondary)",
              background: isActive(item.to) ? "var(--color-paper-secondary)" : "transparent",
              transition: "all 0.15s",
            }}>
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" style={{
              fontSize: "0.85rem",
              fontWeight: 400,
              padding: "0.4rem 0.85rem",
              borderRadius: "var(--radius-sm)",
              color: isActive("/admin") ? "var(--color-ink)" : "var(--color-ink-secondary)",
              background: isActive("/admin") ? "var(--color-paper-secondary)" : "transparent",
            }}>
              Админ
            </Link>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {token && (
            <Link to="/notifications" style={{
              fontSize: "0.85rem",
              padding: "0.4rem 0.85rem",
              borderRadius: "var(--radius-sm)",
              color: unread > 0 ? "var(--color-ink)" : "var(--color-ink-secondary)",
              position: "relative",
            }}>
              Уведомления
              {unread > 0 && (
                <span style={{
                  position: "absolute", top: 2, right: 2,
                  background: "var(--color-ink)", color: "var(--color-paper)",
                  borderRadius: "50%", width: 16, height: 16,
                  fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {unread}
                </span>
              )}
            </Link>
          )}
          {token && (
            <Link to="/profile" style={{ fontSize: "0.85rem", padding: "0.4rem 0.85rem", borderRadius: "var(--radius-sm)", color: "var(--color-ink-secondary)" }}>
              Профиль
            </Link>
          )}
          {token
            ? <button onClick={logout} style={{ fontSize: "0.85rem" }}>Выйти</button>
            : <Link to="/login"><button className="primary">Войти</button></Link>
          }
        </div>
      </div>
    </nav>
  );
}
