import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/client";

const DIFFICULTY = { easy: "Лёгкий", medium: "Средний", hard: "Сложный" };

export default function LinkTest() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [error, setError] = useState("");

  // Пройти тест по ссылке можно только с аккаунтом: попытка привязывается к
  // user_id, иначе результат некуда записать и он не попадёт в отчёт учителя.
  const isAuthed = Boolean(localStorage.getItem("token"));
  const next = encodeURIComponent(`/link/${token}`);

  useEffect(() => {
    api.get(`/links/${token}`)
      .then(r => setTest(r.data))
      .catch(() => setError("Ссылка недействительна или тест не найден"));
  }, [token]);

  if (error) return (
    <div style={{ textAlign: "center", marginTop: "4rem" }}>
      <h3 style={{ color: "var(--red)", marginBottom: "1.5rem" }}>{error}</h3>
      <button onClick={() => navigate("/catalog")}>На главную</button>
    </div>
  );

  if (!test) return <p>Загрузка...</p>;

  return (
    <div style={{ maxWidth: 520, margin: "3rem auto 0" }}>
      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <span className="tag tag-gray" style={{ marginBottom: "1rem", display: "inline-block" }}>
          Приглашение на тест
        </span>

        <h2 style={{ marginBottom: "0.75rem" }}>{test.title}</h2>

        {test.description && (
          <p style={{ color: "var(--color-ink-secondary)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
            {test.description}
          </p>
        )}

        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "2rem" }}>
          <span className="tag tag-gray">{test.category}</span>
          <span className="tag tag-gray">{DIFFICULTY[test.difficulty] || test.difficulty}</span>
          <span className="tag tag-gray">{test.questions?.length || 0} вопросов</span>
          <span className="tag tag-gray">{Math.round(test.timer_seconds / 60)} мин</span>
        </div>

        {isAuthed ? (
          <button className="primary" onClick={() => navigate(`/test/${test.id}`)}
            style={{ padding: "0.75rem 2rem", fontSize: "0.95rem" }}>
            Начать тест
          </button>
        ) : (
          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1.75rem" }}>
            <p style={{ fontSize: "0.9rem", color: "var(--color-ink-secondary)", marginBottom: "1.5rem" }}>
              Чтобы пройти тест, нужен аккаунт — результат сохранится в вашей истории,
              а преподаватель увидит его в отчёте по группе.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link to={`/register?next=${next}`}>
                <button className="primary" style={{ padding: "0.7rem 1.75rem" }}>Зарегистрироваться</button>
              </Link>
              <Link to={`/login?next=${next}`}>
                <button style={{ padding: "0.7rem 1.75rem" }}>У меня есть аккаунт</button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
