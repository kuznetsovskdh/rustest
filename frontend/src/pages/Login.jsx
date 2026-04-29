import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.access_token);
      navigate("/catalog");
    } catch {
      setError("Неверный email или пароль");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", background: "transparent" }}>
      <div style={{ width: "100%", maxWidth: 380, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderRadius: "var(--radius-lg)", padding: "2.5rem", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-md)" }}>
        <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
          <h1 style={{ marginBottom: "0.5rem" }}>Добро пожаловать</h1>
          <p style={{ color: "var(--color-ink-secondary)", fontSize: "0.9rem" }}>
            Войдите в свой аккаунт
          </p>
        </div>

        {error && (
          <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius-sm)", color: "#dc2626", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--color-ink-secondary)", marginBottom: "0.4rem", letterSpacing: "0.03em" }}>
              Email
            </label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--color-ink-secondary)", marginBottom: "0.4rem", letterSpacing: "0.03em" }}>
              Пароль
            </label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="primary" disabled={loading} style={{ marginTop: "0.5rem", padding: "0.75rem" }}>
            {loading ? "Входим..." : "Войти"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem", color: "var(--color-ink-secondary)" }}>
          Нет аккаунта?{" "}
          <Link to="/register" style={{ color: "var(--color-ink)", textDecoration: "underline", textUnderlineOffset: 3 }}>
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
