import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

export default function TeacherPanel() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [testSearch, setTestSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [link, setLink] = useState(null);
  const [report, setReport] = useState(null);
  const [students, setStudents] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("links");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSelected, setInviteSelected] = useState([]);

  useEffect(() => {
    api.get("/tests").then(r => setTests(Array.isArray(r.data) ? r.data : []));
    api.get("/auth/students").then(r => setStudents(Array.isArray(r.data) ? r.data : []));
    api.get("/auth/students/all").then(r => setAllUsers(Array.isArray(r.data) ? r.data : []));
  }, []);

  function showMsg(msg) { setMessage(msg); setTimeout(() => setMessage(""), 2500); }

  async function selectTest(test) {
    setSelected(test);
    setLink(null);
    setReport(null);
    const studentIds = students.map(s => s.id).join(",");
    const [l, r] = await Promise.all([
      api.get(`/tests/${test.id}/links`),
      api.get(`/analytics/group/${test.id}?student_ids=${studentIds}`)
    ]);
    const links = Array.isArray(l.data) ? l.data : [];
    setLink(links.length > 0 ? links[0] : null);
    setReport(r.data);
  }

  async function createLink() {
    const r = await api.post(`/tests/${selected.id}/links?label=${encodeURIComponent(label)}`);
    setLink(r.data);
    setLabel("");
    showMsg("Ссылка создана ✓");
  }

  function copyLink(token) {
    navigator.clipboard.writeText(`${window.location.origin}/link/${token}`);
    showMsg("Ссылка скопирована ✓");
  }

  async function addStudent(userId) {
    await api.post(`/auth/students/${userId}`);
    const user = allUsers.find(u => u.id === userId);
    setStudents([...students, user]);
    showMsg("Ученик добавлен ✓");
  }

  async function removeStudent(userId) {
    await api.delete(`/auth/students/${userId}`);
    setStudents(students.filter(s => s.id !== userId));
    showMsg("Ученик удалён");
  }

  async function inviteStudent(userId) {
    await api.post(`/auth/notifications/invite-student/${userId}`);
    showMsg("Приглашение отправлено ✓");
  }

  async function sendTestInvites() {
    if (!selected || inviteSelected.length === 0) return;
    const payload = `${selected.id}:${selected.title}:${link?.token || ""}`;
    await api.post("/auth/notifications/invite-test", { student_ids: inviteSelected, payload });
    setShowInviteModal(false);
    setInviteSelected([]);
    showMsg(`Приглашения отправлены (${inviteSelected.length}) ✓`);
  }

  function toggleInvite(id) {
    setInviteSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  const filteredTests = tests.filter(t => t.title.toLowerCase().includes(testSearch.toLowerCase()));
  const filteredStudents = students.filter(s => s.email.toLowerCase().includes(studentSearch.toLowerCase()) || s.name.toLowerCase().includes(studentSearch.toLowerCase()));
  const notAdded = allUsers.filter(u => !students.find(s => s.id === u.id) && (u.email.toLowerCase().includes(addSearch.toLowerCase()) || u.name.toLowerCase().includes(addSearch.toLowerCase())));

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ marginBottom: "1rem", background: "none", border: "none", cursor: "pointer", color: "#666" }}>← Назад</button>
      <h2>Панель преподавателя</h2>
      {message && <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "0.5rem 1rem", borderRadius: 6, marginBottom: "1rem" }}>{message}</div>}

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "1px solid #ddd", paddingBottom: "0.5rem" }}>
        {["links", "students"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ background: "none", border: "none", cursor: "pointer", fontWeight: tab === t ? 600 : 400,
              borderBottom: tab === t ? "2px solid #1a1a2e" : "none", paddingBottom: "0.25rem", color: tab === t ? "#1a1a2e" : "#666" }}>
            {t === "links" ? "Тесты и ссылки" : `Мои ученики (${students.length})`}
          </button>
        ))}
      </div>

      {tab === "students" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          <div>
            <h3>Мои ученики ({filteredStudents.length})</h3>
            <input placeholder="Поиск по email или имени..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #ddd", marginBottom: "0.75rem", boxSizing: "border-box" }} />
            {filteredStudents.length === 0 && <p style={{ color: "#999" }}>Учеников не найдено</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {filteredStudents.map(s => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", border: "1px solid #eee", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{s.name}</div>
                    <div style={{ fontSize: 13, color: "#666" }}>{s.email}</div>
                  </div>
                  <button onClick={() => removeStudent(s.id)} style={{ fontSize: 12, background: "none", border: "1px solid #f44336", color: "#f44336", borderRadius: 4, padding: "3px 8px", cursor: "pointer" }}>Удалить</button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3>Пригласить ученика</h3>
            <input placeholder="Поиск по email или имени..." value={addSearch} onChange={e => setAddSearch(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #ddd", marginBottom: "0.75rem", boxSizing: "border-box" }} />
            {notAdded.length === 0 && <p style={{ color: "#999" }}>Нет доступных пользователей</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {notAdded.map(u => (
                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", border: "1px solid #eee", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{u.name}</div>
                    <div style={{ fontSize: 13, color: "#666" }}>{u.email}</div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => addStudent(u.id)} style={{ fontSize: 12, background: "#e8f5e9", border: "1px solid #2e7d32", color: "#2e7d32", borderRadius: 4, padding: "3px 8px", cursor: "pointer" }}>+ Добавить</button>
                    <button onClick={() => inviteStudent(u.id)} style={{ fontSize: 12, background: "#e3f2fd", border: "1px solid #1565c0", color: "#1565c0", borderRadius: 4, padding: "3px 8px", cursor: "pointer" }}>Пригласить</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "links" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "2rem" }}>
          <div>
            <h3>Выберите тест</h3>
            <input placeholder="Поиск по названию..." value={testSearch} onChange={e => setTestSearch(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #ddd", marginBottom: "0.75rem", boxSizing: "border-box" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {filteredTests.map(t => (
                <div key={t.id} onClick={() => selectTest(t)}
                  style={{ padding: "0.75rem", border: `1px solid ${selected?.id === t.id ? "#1a1a2e" : "#ddd"}`, borderRadius: 8, cursor: "pointer", background: selected?.id === t.id ? "#f0f0f8" : "white" }}>
                  <div style={{ fontWeight: 500 }}>{t.title}</div>
                  <div style={{ fontSize: 13, color: "#666" }}>{t.category}</div>
                </div>
              ))}
            </div>
          </div>

          {selected && (
            <div>
              <h3>Ссылка для «{selected.title}»</h3>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                <input placeholder="Название группы (необязательно)" value={label} onChange={e => setLabel(e.target.value)}
                  style={{ flex: 1, padding: "0.5rem", borderRadius: 6, border: "1px solid #ddd" }} />
                <button onClick={createLink}>Создать</button>
              </div>
              {link ? (
                <div style={{ padding: "0.75rem 1rem", border: "1px solid #ddd", borderRadius: 8, marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{link.label || "Без названия"}</div>
                    <div style={{ fontSize: 12, color: "#999", fontFamily: "monospace" }}>/link/{link.token}</div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => copyLink(link.token)} style={{ fontSize: 12 }}>Копировать</button>
                    <button onClick={() => { setShowInviteModal(true); setInviteSelected(students.map(s => s.id)); }}
                      style={{ fontSize: 12, background: "#e3f2fd", border: "1px solid #1565c0", color: "#1565c0", borderRadius: 4, padding: "3px 10px", cursor: "pointer" }}>
                      Пригласить
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ color: "#999", fontSize: 14, marginBottom: "1rem" }}>Ссылки пока нет — создайте выше</p>
              )}

              {report && (
                <>
                  <h3>Отчёт по моим ученикам</h3>
                  {report.total_attempts === 0
                    ? <p style={{ color: "#999" }}>Никто из учеников ещё не прошёл этот тест</p>
                    : (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
                          {[
                            { label: "Попыток", value: report.total_attempts },
                            { label: "Средний балл", value: `${report.avg_score}%`, color: report.avg_score >= 70 ? "#2e7d32" : "#c62828" },
                            { label: "Сдали (≥70%)", value: `${report.passed} / ${report.total_attempts}` }
                          ].map((m, i) => (
                            <div key={i} style={{ background: "#f5f5f5", borderRadius: 8, padding: "0.75rem", textAlign: "center" }}>
                              <div style={{ fontSize: 22, fontWeight: "bold", color: m.color || "inherit" }}>{m.value}</div>
                              <div style={{ fontSize: 12, color: "#666" }}>{m.label}</div>
                            </div>
                          ))}
                        </div>
                        <h4 style={{ margin: "0 0 0.5rem" }}>Распределение баллов</h4>
                        {Object.entries(report.distribution).map(([range, count]) => (
                          <div key={range} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
                            <span style={{ minWidth: 60, fontSize: 13, color: "#666" }}>{range}%</span>
                            <div style={{ flex: 1, background: "#f0f0f0", borderRadius: 4, height: 20 }}>
                              <div style={{ width: report.total_attempts > 0 ? `${(count / report.total_attempts) * 100}%` : "0%", background: "#1a1a2e", height: "100%", borderRadius: 4 }} />
                            </div>
                            <span style={{ minWidth: 20, fontSize: 13 }}>{count}</span>
                          </div>
                        ))}
                      </>
                    )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {showInviteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", borderRadius: 12, padding: "1.5rem", width: 400, maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 1rem" }}>Пригласить на тест «{selected?.title}»</h3>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <button onClick={() => setInviteSelected(students.map(s => s.id))} style={{ fontSize: 12, cursor: "pointer" }}>Выбрать всех</button>
              <button onClick={() => setInviteSelected([])} style={{ fontSize: 12, cursor: "pointer" }}>Снять выбор</button>
            </div>
            {students.length === 0 && <p style={{ color: "#999" }}>Нет учеников для приглашения</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              {students.map(s => (
                <label key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem", border: "1px solid #eee", borderRadius: 6, cursor: "pointer" }}>
                  <input type="checkbox" checked={inviteSelected.includes(s.id)} onChange={() => toggleInvite(s.id)} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{s.email}</div>
                  </div>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={sendTestInvites} disabled={inviteSelected.length === 0}
                style={{ flex: 1, background: "#1a1a2e", color: "white", border: "none", padding: "0.75rem", borderRadius: 6, cursor: "pointer" }}>
                Отправить ({inviteSelected.length})
              </button>
              <button onClick={() => setShowInviteModal(false)} style={{ padding: "0.75rem 1rem", borderRadius: 6, cursor: "pointer" }}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
