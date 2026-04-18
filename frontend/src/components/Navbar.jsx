import { Link, useNavigate } from "react-router-dom";

function parseToken(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch { return null; }
}

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const payload = token ? parseToken(token) : null;
  const isAdmin = payload?.role === "admin";

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
      {isAdmin && <Link to="/admin" style={{ color: "#f0c040", textDecoration: "none" }}>Админ</Link>}
      <div style={{ marginLeft: "auto" }}>
        {token
          ? <button onClick={logout} style={{ cursor: "pointer" }}>Выйти</button>
          : <Link to="/login" style={{ color: "#ccc", textDecoration: "none" }}>Войти</Link>}
      </div>
    </nav>
  );
}
