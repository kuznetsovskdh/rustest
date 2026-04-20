import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";

export default function LinkTest() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/links/${token}`)
      .then(r => setTest(r.data))
      .catch(() => setError("Ссылка недействительна или тест не найден"));
  }, [token]);

  if (error) return (
    <div style={{ textAlign: "center", marginTop: "4rem" }}>
      <h3 style={{ color: "#c62828" }}>{error}</h3>
      <button onClick={() => navigate("/catalog")}>На главную</button>
    </div>
  );

  if (!test) return <p>Загрузка...</p>;

  return (
    <div style={{ textAlign: "center", marginTop: "4rem" }}>
      <h2>{test.title}</h2>
      <p style={{ color: "#666" }}>{test.description}</p>
      <p>{test.category} · {test.timer_seconds}с</p>
      <button onClick={() => navigate(`/test/${test.id}`)} style={{ padding: "0.75rem 2rem", fontSize: 16 }}>
        Начать тест
      </button>
    </div>
  );
}
