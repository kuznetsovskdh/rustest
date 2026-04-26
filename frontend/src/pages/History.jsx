import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

export default function History() {
  const [attempts, setAttempts] = useState([]);
  const [tests, setTests] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/attempts/my").then(async r => {
      const data = Array.isArray(r.data) ? r.data : [];
      setAttempts(data);
      const ids = [...new Set(data.map(a => a.test_id))];
      const testMap = {};
      await Promise.all(ids.map(id =>
        api.get(`/tests/${id}`).then(t => { testMap[id] = t.data.title; }).catch(() => { testMap[id] = `Тест #${id}`; })
      ));
      setTests(testMap);
    });
  }, []);

  return (
    <div>
      <h2>История попыток</h2>
      {attempts.length === 0 && <p>Попыток ещё нет</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {attempts.map(a => {
          const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
          return (
            <div key={a.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 500 }}>{tests[a.test_id] || `Тест #${a.test_id}`}</div>
                <div style={{ color: "#666", fontSize: "0.9rem" }}>{new Date(a.started_at).toLocaleDateString("ru-RU")}</div>
              </div>
              <div style={{ fontWeight: "bold", color: pct >= 70 ? "green" : "red" }}>{pct}%</div>
              <button onClick={() => navigate(`/result/${a.id}`)}>Подробнее</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
