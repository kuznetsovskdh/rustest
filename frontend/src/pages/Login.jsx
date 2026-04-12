import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.access_token);
      navigate("/catalog");
    } catch {
      setError("Неверный email или пароль");
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "4rem auto" }}>
      <h2>Вход</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input placeholder="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">Войти</button>
      </form>
      <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
    </div>
  );
}
