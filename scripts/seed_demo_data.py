"""Генерация демонстрационных данных для скриншотов README и проверки аналитики.

Создаёт когорты пользователей с разнесёнными по неделям датами регистрации и
разнородными паттернами поведения, чтобы продуктовые метрики считались на
осмысленном материале, а не на одной точке:

  * «активные»    — попытки в нескольких разных неделях (дают cohort retention, D7, returned_7d)
  * «угасающие»   — 2-4 попытки в первые недели, затем тишина (дают churn risk)
  * «одноразовые» — одна попытка и уход (дают падение в activation funnel)
  * «не начавшие» — регистрация без единой попытки (дают разрыв registered → started)
  * «бросившие»   — start_test без завершения (дают drop-off и потерю в воронке)

Пользователи заводятся через публичный API (чтобы пароли были захешированы
штатным bcrypt), а даты регистрации и вся история попыток проставляются прямым
SQL — задним числом через API их выставить нельзя.

    python3 scripts/seed_demo_data.py --email <admin> --password <pass>
    python3 scripts/seed_demo_data.py --email <admin> --password <pass> --reset

--reset предварительно удаляет попытки, события и синтетических пользователей
(кроме тех, чьи id перечислены в KEEP_USER_IDS). Тесты и правила не трогаются.
"""

import argparse
import json
import random
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta

BASE = "http://localhost:3001/api"
PG_CONTAINER = "rustest-postgres-rustest-1"
DEMO_PASSWORD = "demo1234"

# Учётки, которые --reset не удаляет (владелец проекта и рабочий админ).
KEEP_USER_IDS = [1, 74]

SEED = 20260828
COHORT_WEEKS = 6          # сколько недельных когорт создаём
PER_COHORT = (11, 16)     # размер одной когорты

FIRST_NAMES = ["Анна", "Дмитрий", "Мария", "Иван", "Елена", "Сергей", "Ольга", "Алексей",
               "Наталья", "Павел", "Ксения", "Артём", "Юлия", "Никита", "Дарья", "Роман",
               "Полина", "Максим", "София", "Егор", "Вера", "Тимур", "Алиса", "Глеб"]
LAST_NAMES = ["Смирнов", "Иванов", "Кузнецов", "Попов", "Соколов", "Лебедев", "Козлов",
              "Новиков", "Морозов", "Волков", "Зайцев", "Павлов", "Семёнов", "Голубев",
              "Виноградов", "Богданов", "Воробьёв", "Фёдоров", "Михайлов", "Беляев"]

# Доли паттернов внутри когорты. Подобраны так, чтобы получить конверсию воронки
# в диапазоне 40-70% и retention D1/D7 в реалистичных пределах.
PATTERNS = [
    ("active", 0.12),
    ("fading", 0.23),
    ("one_shot", 0.33),
    ("never_started", 0.14),
    ("abandoner", 0.18),
]


def api(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            payload = r.read()
            return json.loads(payload) if payload else {}
    except urllib.error.HTTPError as e:
        print(f"  ! {method} {path} -> {e.code}: {e.read()[:200].decode(errors='replace')}")
        return None


def psql(sql):
    """Выполняет SQL в контейнере Postgres и возвращает stdout."""
    res = subprocess.run(
        ["docker", "exec", "-i", PG_CONTAINER, "psql", "-U", "rutest", "-d", "rutest",
         "-v", "ON_ERROR_STOP=1", "-t", "-A", "-F", "\t", "-f", "-"],
        input=sql, capture_output=True, text=True,
    )
    if res.returncode != 0:
        print("SQL error:\n" + res.stderr[:2000])
        sys.exit(1)
    return res.stdout.strip()


def lit(s):
    return "'" + str(s).replace("'", "''") + "'"


def ts(dt):
    return lit(dt.strftime("%Y-%m-%d %H:%M:%S"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--email", required=True)
    ap.add_argument("--password", required=True)
    ap.add_argument("--reset", action="store_true",
                    help="удалить прежние попытки, события и синтетических пользователей")
    args = ap.parse_args()

    rnd = random.Random(SEED)

    login = api("POST", "/auth/login", body={"email": args.email, "password": args.password})
    if not login:
        sys.exit("Не удалось войти.")
    token = login["access_token"]
    me = api("GET", "/auth/me", token=token)
    if not me or me.get("role") != "admin":
        sys.exit(f"Нужна роль admin, текущая: {me and me.get('role')}")
    print(f"Вошли как {me['email']}\n")

    tests = api("GET", "/tests") or []
    if not tests:
        sys.exit("В каталоге нет опубликованных тестов — сначала запусти seed_content.py")
    # Полные тесты с вопросами: нужны id вопросов и вариантов для ответов.
    full_tests = [api("GET", f"/tests/{t['id']}") for t in tests]
    full_tests = [t for t in full_tests if t and t.get("questions")]
    print(f"Тестов в каталоге: {len(full_tests)}")

    if args.reset:
        keep = ",".join(str(i) for i in KEEP_USER_IDS)
        print("\nОчистка прежних данных...")
        psql(f"""
            DELETE FROM answers;
            DELETE FROM attempts;
            DELETE FROM event_logs;
            DELETE FROM notifications;
            DELETE FROM teacher_students;
            DELETE FROM users WHERE id NOT IN ({keep});
        """)
        print("  попытки, ответы, события и синтетические пользователи удалены")

    # --- создание пользователей через API ------------------------------------
    now = datetime.utcnow()
    # Начало текущей недели (понедельник) — от него отсчитываем когорты назад.
    this_monday = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    stamp = int(now.timestamp())

    teacher = api("POST", "/auth/register", token=None, body={
        "email": f"teacher.{stamp}@rustest.example.com",
        "password": DEMO_PASSWORD, "name": "Марина Преподавателева"})
    teacher_id = None
    if teacher:
        t_me = api("GET", "/auth/me", token=teacher["access_token"])
        teacher_id = t_me["id"]
        psql(f"UPDATE users SET role='teacher' WHERE id={teacher_id};")
        print(f"\nПреподаватель создан: id={teacher_id}")

    people = []          # (user_id, cohort_week_start, pattern, reg_dt)
    print("\nСоздание учеников по когортам:")
    for w in range(COHORT_WEEKS, 0, -1):
        cohort_start = this_monday - timedelta(weeks=w - 1)
        size = rnd.randint(*PER_COHORT)
        # Свежая когорта (текущая неделя) — меньше и без «долгой» истории.
        if w == 1:
            size = max(4, size - 3)
        picks = []
        for name, share in PATTERNS:
            picks += [name] * round(size * share)
        while len(picks) < size:
            picks.append("fading")
        picks = picks[:size]
        rnd.shuffle(picks)

        created = 0
        for pattern in picks:
            # Регистрация в случайный момент внутри своей недели, но не в будущем.
            reg_dt = cohort_start + timedelta(days=rnd.randint(0, 6),
                                              hours=rnd.randint(8, 21), minutes=rnd.randint(0, 59))
            if reg_dt > now - timedelta(hours=1):
                reg_dt = now - timedelta(hours=rnd.randint(2, 20))
            fio = f"{rnd.choice(FIRST_NAMES)} {rnd.choice(LAST_NAMES)}"
            email = f"student.{stamp}.{len(people)}@rustest.example.com"
            r = api("POST", "/auth/register", body={"email": email, "password": DEMO_PASSWORD, "name": fio})
            if not r:
                continue
            uid = api("GET", "/auth/me", token=r["access_token"])["id"]
            people.append({"id": uid, "cohort": cohort_start, "pattern": pattern, "reg": reg_dt})
            created += 1
        print(f"  {cohort_start:%Y-%m-%d}: {created} чел.")

    # --- backdate регистраций -------------------------------------------------
    updates = []
    for p in people:
        updates.append(f"UPDATE users SET created_at={ts(p['reg'])} WHERE id={p['id']};")
        updates.append(
            f"UPDATE event_logs SET timestamp={ts(p['reg'])} "
            f"WHERE user_id={p['id']} AND event_type='registered';")
    psql("\n".join(updates))
    print(f"\nДаты регистрации сдвинуты назад для {len(people)} учеников")

    # --- привязка части учеников к преподавателю ------------------------------
    if teacher_id:
        linked = rnd.sample(people, k=int(len(people) * 0.45))
        rows = ",".join(f"({teacher_id},{p['id']})" for p in linked)
        psql(f"INSERT INTO teacher_students (teacher_id, student_id) VALUES {rows};")
        print(f"К преподавателю привязано учеников: {len(linked)} (остальные занимаются сами)")

    # --- генерация попыток ----------------------------------------------------
    def attempt_days(pattern):
        """Смещения в днях от даты регистрации, когда пользователь заходил."""
        if pattern == "active":
            days = [0]
            if rnd.random() < 0.45:
                days.append(rnd.randint(1, 2))          # возврат на D1-D2
            for wk in range(1, 5):
                if rnd.random() < 0.38:
                    days.append(wk * 7 + rnd.randint(0, 6))
            return days
        if pattern == "fading":
            days = [0]
            if rnd.random() < 0.22:
                days.append(rnd.randint(1, 3))
            if rnd.random() < 0.12:
                days.append(rnd.randint(7, 13))
            return days
        if pattern == "one_shot":
            return [0]
        if pattern == "abandoner":
            return [0]
        return []

    attempts_sql, events_sql, answers_sql = [], [], []
    attempt_seq = int(psql("SELECT COALESCE(MAX(id),0) FROM attempts;") or 0)
    answer_seq = int(psql("SELECT COALESCE(MAX(id),0) FROM answers;") or 0)

    stats = {"attempts": 0, "finished": 0, "abandoned": 0, "answers": 0}

    for p in people:
        for off in attempt_days(p["pattern"]):
            started = p["reg"] + timedelta(days=off, hours=rnd.randint(0, 10), minutes=rnd.randint(0, 59))
            if started > now:
                continue
            test = rnd.choice(full_tests)
            questions = test["questions"]

            attempt_seq += 1
            aid = attempt_seq
            stats["attempts"] += 1
            events_sql.append(
                f"({p['id']},{test['id']},NULL,'start_test',NULL,{ts(started)})")

            # «Бросившие» уходят, не завершив: попытка остаётся без finished_at.
            if p["pattern"] == "abandoner" or rnd.random() < 0.26:
                attempts_sql.append(f"({aid},{p['id']},{test['id']},0,0,{ts(started)},NULL)")
                stats["abandoned"] += 1
                continue

            # Часть попыток отвечает не на все вопросы — это и даёт drop-off.
            answered = len(questions) if rnd.random() > 0.22 else rnd.randint(2, max(2, len(questions) - 1))
            # Навык растёт со временем: чем позже попытка, тем выше доля верных.
            skill = 0.45 + min(off, 28) / 28 * 0.35 + rnd.uniform(-0.12, 0.12)
            score = 0
            finished = started + timedelta(minutes=rnd.randint(2, 9))

            for q in questions[:answered]:
                correct_opt = next(o for o in q["options"] if o["is_correct"])
                wrong_opts = [o for o in q["options"] if not o["is_correct"]]
                is_correct = rnd.random() < skill
                chosen = correct_opt if is_correct or not wrong_opts else rnd.choice(wrong_opts)
                score += 1 if chosen["is_correct"] else 0
                answer_seq += 1
                answers_sql.append(
                    f"({answer_seq},{aid},{q['id']},{chosen['id']},{str(chosen['is_correct']).lower()})")
                events_sql.append(
                    f"({p['id']},{test['id']},{q['id']},'answer_question',"
                    f"{str(chosen['is_correct']).lower()},{ts(finished)})")
                stats["answers"] += 1

            attempts_sql.append(
                f"({aid},{p['id']},{test['id']},{score},{answered},{ts(started)},{ts(finished)})")
            events_sql.append(
                f"({p['id']},{test['id']},NULL,'finish_test',NULL,{ts(finished)})")
            stats["finished"] += 1

    def chunks(seq, n=400):
        for i in range(0, len(seq), n):
            yield seq[i:i + n]

    for part in chunks(attempts_sql):
        psql("INSERT INTO attempts (id,user_id,test_id,score,total,started_at,finished_at) VALUES "
             + ",".join(part) + ";")
    for part in chunks(answers_sql):
        psql("INSERT INTO answers (id,attempt_id,question_id,selected_option_id,is_correct) VALUES "
             + ",".join(part) + ";")
    for part in chunks(events_sql):
        psql("INSERT INTO event_logs (user_id,test_id,question_id,event_type,is_correct,timestamp) VALUES "
             + ",".join(part) + ";")

    # Последовательности id сдвигаем вручную: строки вставлены с явными id.
    psql("""
        SELECT setval('attempts_id_seq', (SELECT MAX(id) FROM attempts));
        SELECT setval('answers_id_seq', (SELECT MAX(id) FROM answers));
    """)

    print(f"\nСгенерировано:")
    print(f"  попыток: {stats['attempts']} (завершено {stats['finished']}, брошено {stats['abandoned']})")
    print(f"  ответов: {stats['answers']}")

    # --- итоговые метрики -----------------------------------------------------
    print("\nМетрики после засева:")
    for path, label in [("/analytics/funnel", "Воронка"),
                        ("/analytics/retention", "Retention D1/D7"),
                        ("/analytics/activation-funnel", "Activation funnel"),
                        ("/analytics/dau-mau", "DAU/MAU")]:
        d = api("GET", path, token=token)
        if label == "DAU/MAU" and d:
            d = {k: v for k, v in d.items() if k != "dau_history"}
        print(f"  {label}: {json.dumps(d, ensure_ascii=False)}")

    cohorts = api("GET", "/analytics/cohort-retention", token=token) or []
    print(f"  Когорт: {len(cohorts)}")
    for c in cohorts:
        cells = " ".join(f"W{i}={c[f'W{i}']}" if c[f"W{i}"] is not None else f"W{i}=—" for i in range(5))
        print(f"    {c['cohort_week']} (n={c['cohort_size']}): {cells}")

    churn = api("GET", "/analytics/churn-risk?days=14", token=token) or []
    print(f"  Учеников в зоне риска оттока: {len(churn)}")
    print(f"\nПароль всех демо-аккаунтов: {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
