import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";

export default function TestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [ehVariantId, setEhVariantId] = useState(null);
  const [hintDismissed, setHintDismissed] = useState(false);

  useEffect(() => {
    api.get(`/tests/${id}`).then(r => {
      setTest(r.data);
      setTimeLeft(r.data.timer_seconds);
    });
    api.post("/attempts/start", { test_id: parseInt(id) }).then(r => {
      setAttemptId(r.data.id);
      setEhVariantId(r.data.eh_variant_id);
    });
  }, [id]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { handleFinish(); return; }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  function handleAnswer() {
    if (selected === null) return;
    const q = test.questions[current];
    const opt = q.options.find(o => o.id === selected);
    const newAnswers = [...answers, { question_id: q.id, selected_option_id: selected, is_correct: opt.is_correct }];
    setAnswers(newAnswers);
    setSelected(null);
    if (current + 1 < test.questions.length) {
      setCurrent(current + 1);
    } else {
      handleFinish(newAnswers);
    }
  }

  async function handleFinish(finalAnswers = answers) {
    await api.post(`/attempts/${attemptId}/finish`, { answers: finalAnswers });
    navigate(`/result/${attemptId}`);
  }

  if (!test) return <p>Загрузка...</p>;
  if (!test.questions.length) return <p>В тесте нет вопросов</p>;

  // Treatment (variant_id=2): показываем подсказку до первого вопроса
  const showHint = ehVariantId === 2 && !hintDismissed && current === 0 && answers.length === 0;

  if (showHint) {
    return (
      <div>
        <button onClick={() => navigate("/catalog")} style={{ marginBottom: "1rem", background: "none", border: "none", cursor: "pointer", color: "#666" }}>← Назад</button>
        <div style={{ background: "#f0f4ff", border: "1px solid #c7d7f9", borderRadius: 10, padding: "1.5rem", maxWidth: 480, margin: "2rem auto" }}>
          <h3 style={{ marginBottom: "0.75rem" }}>Как устроен этот тест</h3>
          <ul style={{ lineHeight: 2, paddingLeft: "1.25rem", color: "#333" }}>
            <li>Всего вопросов: <b>{test.questions.length}</b></li>
            <li>Время на тест: <b>{test.timer_seconds} секунд</b></li>
            <li>На каждый вопрос — один правильный ответ</li>
            <li>В конце увидишь разбор ошибок и правила</li>
          </ul>
          <button
            onClick={() => setHintDismissed(true)}
            style={{ marginTop: "1rem", padding: "0.6rem 1.5rem", background: "#1a1a2e", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.9rem" }}>
            Начать тест →
          </button>
        </div>
      </div>
    );
  }

  const q = test.questions[current];
  return (
    <div>
      <button onClick={() => navigate("/catalog")} style={{ marginBottom: "1rem", background: "none", border: "none", cursor: "pointer", color: "#666" }}>← Назад</button>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <span>Вопрос {current + 1} / {test.questions.length}</span>
        <span style={{ color: timeLeft < 30 ? "red" : "inherit" }}>⏱ {timeLeft}с</span>
      </div>
      <h3>{q.text}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", margin: "1rem 0" }}>
        {q.options.map(o => (
          <button key={o.id} onClick={() => setSelected(o.id)}
            style={{ padding: "0.75rem", textAlign: "left", background: selected === o.id ? "#1a1a2e" : "#f5f5f5", color: selected === o.id ? "#fff" : "#000", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer" }}>
            {o.text}
          </button>
        ))}
      </div>
      <button onClick={handleAnswer} disabled={selected === null}>Ответить</button>
    </div>
  );
}
