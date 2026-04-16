import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

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
      <div style={{ marginLeft: "auto" }}>
        {token
          ? <button onClick={logout} style={{ cursor: "pointer" }}>Выйти</button>
          : <Link to="/login" style={{ color: "#ccc", textDecoration: "none" }}>Войти</Link>}
      </div>
    </nav>
  );
}
