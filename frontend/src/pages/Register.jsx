import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) { setError("Пароль минимум 6 символов"); return; }
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { email, password, name });
      localStorage.setItem("token", res.data.access_token);
      navigate("/catalog");
    } catch {
      setError("Ошибка регистрации. Возможно email уже занят.");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", background: "transparent" }}>
      <div style={{ width: "100%", maxWidth: 380, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderRadius: "var(--radius-lg)", padding: "2.5rem", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-md)" }}>
        <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
          <h1 style={{ marginBottom: "0.5rem" }}>Создать аккаунт</h1>
          <p style={{ color: "var(--color-ink-secondary)", fontSize: "0.9rem" }}>
            Начните учиться прямо сейчас
          </p>
        </div>

        {error && (
          <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius-sm)", color: "#dc2626", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[
            { label: "Имя", type: "text", placeholder: "Иван Петров", value: name, set: setName },
            { label: "Email", type: "email", placeholder: "you@example.com", value: email, set: setEmail },
            { label: "Пароль", type: "password", placeholder: "Минимум 6 символов", value: password, set: setPassword },
          ].map(f => (
            <div key={f.label}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--color-ink-secondary)", marginBottom: "0.4rem", letterSpacing: "0.03em" }}>
                {f.label}
              </label>
              <input type={f.type} placeholder={f.placeholder} value={f.value} onChange={e => f.set(e.target.value)} required />
            </div>
          ))}
          <button type="submit" className="primary" disabled={loading} style={{ marginTop: "0.5rem", padding: "0.75rem" }}>
            {loading ? "Создаём..." : "Зарегистрироваться"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem", color: "var(--color-ink-secondary)" }}>
          Уже есть аккаунт?{" "}
          <Link to="/login" style={{ color: "var(--color-ink)", textDecoration: "underline", textUnderlineOffset: 3 }}>
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
