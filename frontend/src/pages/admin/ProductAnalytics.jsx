import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

export default function ProductAnalytics() {
  const navigate = useNavigate();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [segmentBy, setSegmentBy] = useState("none");
  const [segmentedFunnel, setSegmentedFunnel] = useState([]);
  const [questions, setQuestions] = useState({});
  const [testNames, setTestNames] = useState({});

  const load = useCallback(async () => {
    setRefreshing(true);
    const [f, r, d, a, dm, fbt, sd, doff, cohort, actFunnel] = await Promise.all([
      api.get("/analytics/funnel"),
      api.get("/analytics/retention"),
      api.get("/analytics/question-difficulty"),
      api.get("/analytics/daily-activity"),
      api.get("/analytics/dau-mau"),
      api.get("/analytics/funnel-by-test"),
      api.get("/analytics/score-distribution"),
      api.get("/analytics/dropoff"),
      api.get("/analytics/cohort-retention"),
      api.get("/analytics/activation-funnel"),
    ]);
    setData({
      funnel: f.data, retention: r.data, difficulty: d.data,
      activity: Array.isArray(a.data) ? a.data : [],
      dauMau: dm.data,
      funnelByTest: Array.isArray(fbt.data) ? fbt.data : [],
      scoreDist: sd.data,
      dropoff: Array.isArray(doff.data) ? doff.data : [],
      cohortRetention: Array.isArray(cohort.data) ? cohort.data : [],
      activationFunnel: actFunnel.data,
    });
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (segmentBy === "none") { setSegmentedFunnel([]); return; }
    api.get(`/analytics/funnel-by-test-segmented?segment_by=${segmentBy}`)
      .then(r => setSegmentedFunnel(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSegmentedFunnel([]));
  }, [segmentBy]);

  async function loadQuestion(qId) {
    if (questions[qId]) return;
    const r = await api.get(`/questions/${qId}`).catch(() => ({ data: null }));
    const qData = r.data || { id: qId, text: `Вопрос #${qId} (удалён)`, options: [], rule_id: null, test_id: null };
    setQuestions(prev => ({ ...prev, [qId]: qData }));
    if (qData.test_id) {
      api.get(`/tests/${qData.test_id}`).then(t => {
        setTestNames(prev => ({ ...prev, [qData.test_id]: t.data.title }));
      }).catch(() => {});
    }
  }

  useEffect(() => {
    if (!data.difficulty) return;
    [...(data.difficulty.too_easy || []), ...(data.difficulty.too_hard || [])].forEach(q => loadQuestion(q.question_id));
  }, [data.difficulty]);

  useEffect(() => {
    (data.dropoff || []).forEach(q => loadQuestion(q.question_id));
  }, [data.dropoff]);

  useEffect(() => {
    (data.funnelByTest || []).forEach(t => {
      if (!testNames[t.test_id]) {
        api.get(`/tests/${t.test_id}`).then(r => {
          setTestNames(prev => ({ ...prev, [t.test_id]: r.data.title }));
        }).catch(() => {});
      }
    });
  }, [data.funnelByTest]);

  async function exportExcel() {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/analytics/export", { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "rutest_analytics.xlsx"; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportRaw() {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/analytics/export-raw", { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "rutest_raw_data.xlsx"; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p>Загрузка...</p>;

  const { funnel, retention, difficulty, activity, dauMau, funnelByTest, scoreDist, dropoff, cohortRetention, activationFunnel } = data;
  const maxActivity = Math.max(...activity.map(a => a.count), 1);
  const maxDauHistory = Math.max(...(dauMau?.dau_history || []).map(d => d.users), 1);
  const maxDist = Math.max(...(scoreDist?.distribution || []).map(d => d.count), 1);
  const maxDropoff = Math.max(...dropoff.map(d => d.reached), 1);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => navigate("/admin")} style={{ background: "none", border: "none", cursor: "pointer", color: "#666" }}>← Назад</button>
          <h2 style={{ margin: 0 }}>Product Analytics</h2>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={load} disabled={refreshing}
            style={{ padding: "0.5rem 1rem", borderRadius: 6, border: "1px solid #ddd", cursor: "pointer", background: "white" }}>
            {refreshing ? "Обновляется..." : "Обновить"}
          </button>
          <button onClick={exportExcel}
            style={{ padding: "0.5rem 1rem", borderRadius: 6, border: "1px solid #2e7d32", cursor: "pointer", background: "#e8f5e9", color: "#2e7d32" }}>
            Выгрузить аналитику (Excel)
          </button>
          <button onClick={exportRaw}
            style={{ padding: "0.5rem 1rem", borderRadius: 6, border: "1px solid #1565c0", cursor: "pointer", background: "#e3f2fd", color: "#1565c0" }}>
            Сырые данные (Excel)
          </button>
        </div>
      </div>

      {dauMau && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1.25rem", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem" }}>DAU / MAU</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
            {[
              { label: "DAU (вчера)", value: dauMau.dau },
              { label: "MAU (30 дней)", value: dauMau.mau },
              { label: "DAU/MAU ratio", value: `${dauMau.ratio}%`, color: dauMau.ratio >= 20 ? "#2e7d32" : "#c62828" },
            ].map((m, i) => (
              <div key={i} style={{ background: "#f5f5f5", borderRadius: 8, padding: "0.75rem", textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: m.color || "inherit" }}>{m.value}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{m.label}</div>
              </div>
            ))}
          </div>
          {dauMau.dau_history.length > 0 && (
            <>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>Уникальные пользователи по дням (30 дней)</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: 80 }}>
                {dauMau.dau_history.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 9, color: "#999" }}>{d.users > 0 ? d.users : ""}</span>
                    <div style={{ width: "100%", background: "#1a1a2e", borderRadius: "2px 2px 0 0", height: `${(d.users / maxDauHistory) * 52}px`, minHeight: d.users > 0 ? 4 : 0 }} title={`${d.date}: ${d.users}`} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999", marginTop: 4 }}>
                <span>{dauMau.dau_history[0]?.date}</span>
                <span>{dauMau.dau_history[dauMau.dau_history.length - 1]?.date}</span>
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1.25rem" }}>
          <h3 style={{ margin: "0 0 1rem" }}>Общая воронка</h3>
          {funnel && [
            { label: "Начали тест", value: funnel.started, pct: 100, color: "#1a1a2e" },
            { label: "Завершили", value: funnel.finished, pct: funnel.conversion_rate, color: funnel.conversion_rate >= 70 ? "#2e7d32" : "#c62828" },
          ].map((s, i) => (
            <div key={i} style={{ marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span>{s.label}</span><span style={{ fontWeight: 500 }}>{s.value} ({s.pct}%)</span>
              </div>
              <div style={{ background: "#f0f0f0", borderRadius: 4, height: 20 }}>
                <div style={{ width: `${s.pct}%`, background: s.color, height: "100%", borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1.25rem" }}>
          <h3 style={{ margin: "0 0 1rem" }}>Retention</h3>
          {retention && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              {[
                { label: "Всего", value: retention.total_users },
                { label: "D1", value: `${retention.d1}%`, color: retention.d1 >= 30 ? "#2e7d32" : "#c62828" },
                { label: "D7", value: `${retention.d7}%`, color: retention.d7 >= 10 ? "#2e7d32" : "#c62828" },
              ].map((m, i) => (
                <div key={i} style={{ background: "#f5f5f5", borderRadius: 8, padding: "0.75rem", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: "bold", color: m.color || "inherit" }}>{m.value}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{m.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {funnelByTest.length > 0 && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1.25rem", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem" }}>Воронка по тестам</h3>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#666" }}>Сегмент:</span>
            {[
              { value: "none", label: "Все" },
              { value: "role", label: "По роли" },
              { value: "has_teacher", label: "С учителем / самостоятельно" },
            ].map(opt => (
              <button key={opt.value} onClick={() => setSegmentBy(opt.value)}
                style={{ fontSize: 12, padding: "0.3rem 0.75rem", borderRadius: 20,
                  background: segmentBy === opt.value ? "#1a1a2e" : "white",
                  color: segmentBy === opt.value ? "white" : "#333",
                  border: "1px solid #ddd", cursor: "pointer" }}>
                {opt.label}
              </button>
            ))}
          </div>
          {segmentBy !== "none" && segmentedFunnel.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              {segmentedFunnel.map((row, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ width: 180, fontSize: 13, color: "#333" }}>
                    {testNames[row.test_id] || `Тест #${row.test_id}`} · <b>{row.segment}</b>
                  </span>
                  <div style={{ flex: 1, background: "#f0f0f0", borderRadius: 4, height: 20 }}>
                    <div style={{ width: `${row.conversion}%`, background: row.conversion >= 70 ? "#2e7d32" : "#c62828", height: "100%", borderRadius: 4 }} />
                  </div>
                  <span style={{ minWidth: 110, fontSize: 13, fontWeight: 500, textAlign: "right" }}>{row.conversion}% ({row.started}→{row.finished})</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {funnelByTest.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ width: 180, fontSize: 13, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  title={testNames[t.test_id]}>
                  {testNames[t.test_id] || `Тест #${t.test_id}`}
                </span>
                <div style={{ flex: 1, background: "#f0f0f0", borderRadius: 4, height: 20 }}>
                  <div style={{ width: `${t.conversion}%`, background: t.conversion >= 70 ? "#2e7d32" : "#c62828", height: "100%", borderRadius: 4 }} />
                </div>
                <span style={{ minWidth: 110, fontSize: 13, fontWeight: 500, textAlign: "right" }}>{t.conversion}% ({t.started}→{t.finished})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {scoreDist && (
          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 1rem" }}>Распределение баллов</h3>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              {[{ label: "Среднее", value: `${scoreDist.avg}%` }, { label: "Медиана", value: `${scoreDist.median}%` }].map((m, i) => (
                <div key={i} style={{ background: "#f5f5f5", borderRadius: 8, padding: "0.5rem 1rem", textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: "bold" }}>{m.value}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: 100 }}>
              {scoreDist.distribution.map((d, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "#666" }}>{d.count}</span>
                  <div style={{ width: "100%", background: "#1a1a2e", borderRadius: "2px 2px 0 0", height: `${(d.count / maxDist) * 60}px`, minHeight: d.count > 0 ? 4 : 0 }} />
                  <span style={{ fontSize: 10, color: "#999" }}>{d.bucket}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1.25rem" }}>
          <h3 style={{ margin: "0 0 1rem" }}>Активность (30 дней)</h3>
          {activity.length === 0 ? <p style={{ color: "#999" }}>Нет данных</p> : (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: 80 }}>
                {activity.map((a, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 9, color: "#999" }}>{a.count > 0 ? a.count : ""}</span>
                    <div style={{ width: "100%", background: "#1a1a2e", borderRadius: "2px 2px 0 0", height: `${(a.count / maxActivity) * 56}px`, minHeight: 4 }} title={`${a.date}: ${a.count}`} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999", marginTop: 4 }}>
                <span>{activity[0]?.date}</span>
                <span>{activity[activity.length - 1]?.date}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {activationFunnel && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1.25rem", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem" }}>Activation Funnel</h3>
          {[
            { label: "Зарегистрировался", value: activationFunnel.registered },
            { label: "Начал первый тест", value: activationFunnel.started_first_test },
            { label: "Закончил первый тест", value: activationFunnel.finished_first_test },
            { label: "Вернулся за 7 дней", value: activationFunnel.returned_7d },
          ].map((s, i) => {
            const base = activationFunnel.registered || 1;
            const pct = Math.round((s.value / base) * 100);
            return (
              <div key={i} style={{ marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>{s.label}</span><span style={{ fontWeight: 500 }}>{s.value} ({pct}%)</span>
                </div>
                <div style={{ background: "#f0f0f0", borderRadius: 4, height: 20 }}>
                  <div style={{ width: `${pct}%`, background: i === 0 ? "#1a1a2e" : pct >= 50 ? "#2e7d32" : "#c62828", height: "100%", borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cohortRetention && cohortRetention.length > 0 && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1.25rem", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem" }}>Cohort Retention (по неделе регистрации)</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: "0.5rem" }}>Когорта</th>
                <th style={{ padding: "0.5rem" }}>Размер</th>
                {["W0","W1","W2","W3","W4"].map(w => (
                  <th key={w} style={{ padding: "0.5rem", textAlign: "center" }}>{w}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohortRetention.map((c, i) => (
                <tr key={i} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "0.5rem" }}>{c.cohort_week}</td>
                  <td style={{ padding: "0.5rem" }}>{c.cohort_size}</td>
                  {["W0","W1","W2","W3","W4"].map(w => {
                    const val = c[w];
                    const bg = val >= 50 ? "#c8e6c9" : val >= 20 ? "#fff9c4" : val > 0 ? "#ffe0b2" : "#f5f5f5";
                    return (
                      <td key={w} style={{ padding: "0.5rem", textAlign: "center", background: bg }}>
                        {val}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dropoff.length > 0 && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1.25rem", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem" }}>Drop-off по вопросам</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {dropoff.map((q, i) => {
              const qInfo = questions[q.question_id];
              const testName = qInfo ? testNames[qInfo.test_id] : null;
              const text = qInfo?.text || `Вопрос #${q.question_id}`;
              return (
                <div key={i}>
                  {testName && <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>{testName}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ width: 200, fontSize: 12, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }} title={text}>
                      {text}
                    </span>
                    <div style={{ flex: 1, background: "#f0f0f0", borderRadius: 4, height: 16 }}>
                      <div style={{ width: `${(q.reached / maxDropoff) * 100}%`, background: q.reach_rate >= 70 ? "#2e7d32" : "#c62828", height: "100%", borderRadius: 4 }} />
                    </div>
                    <span style={{ width: 45, fontSize: 12, fontWeight: 500, textAlign: "right", flexShrink: 0 }}>{q.reach_rate}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1.25rem" }}>
        <h3 style={{ margin: "0 0 1rem" }}>Сложность вопросов</h3>
        {difficulty && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            {[
              { items: difficulty.too_hard, label: "Слишком сложные (не более 20% правильных)", bg: "#ffebee", color: "#c62828" },
              { items: difficulty.too_easy, label: "Слишком лёгкие (не менее 90% правильных)", bg: "#e8f5e9", color: "#2e7d32" },
            ].map((section, si) => (
              <div key={si}>
                <h4 style={{ margin: "0 0 0.75rem", color: section.color }}>{section.label}</h4>
                {section.items?.length === 0
                  ? <p style={{ color: "#999", fontSize: 13 }}>Нет</p>
                  : section.items?.map((q, i) => {
                    const qInfo = questions[q.question_id];
                    const testName = qInfo ? testNames[qInfo.test_id] : null;
                    return (
                      <div key={i} style={{ padding: "0.5rem 0.75rem", background: section.bg, borderRadius: 6, marginBottom: "0.4rem", fontSize: 13 }}>
                        {testName && <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>{testName}</div>}
                        <div style={{ fontWeight: 500 }}>{qInfo?.text || `Вопрос #${q.question_id}`}</div>
                        <div style={{ color: section.color }}>{q.correct_rate}% правильных · {q.total} ответов</div>
                      </div>
                    );
                  })
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
