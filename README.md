# סדר פסח

אפליקציית web מלאה בעברית למשחק פאזל לוגי סביב שולחן ליל הסדר, עם תמיכה מלאה ב-RTL, אזור שחקנים ואזור ניהול.

## סטאק

- Frontend: React + TypeScript + Vite + Tailwind CSS + dnd-kit + Zustand
- Backend: FastAPI + SQLAlchemy + PostgreSQL + JWT + bcrypt/passlib

## מבנה הפרויקט

```text
backend/
frontend/
docker-compose.yml
README.md
```

## הרצה מקומית

### הרצה מהירה בלחיצה אחת על macOS

אפשר פשוט להריץ:

```bash
cd "/Users/Owner/Documents/New project"
./run-local.command
```

או ללחוץ פעמיים על [run-local.command](/Users/Owner/Documents/New%20project/run-local.command).

### 1. מסד נתונים

```bash
docker compose up -d db
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## פרטי התחברות ראשוניים

- Admin seeded:
  - Username: `admin`
  - Password: `admin1234`

## מה כלול

- הרשמה והתחברות
- שמירת התקדמות לשחקנים
- חידה פעילה לכל רמת קושי
- שולחן קבוע של 10 דמויות: אבא, אמא, דוד, דודה, סבא, סבתא, ילד, ילדה, כלב, חתול
- Drag & Drop סביב שולחן ליל סדר
- תמונות אופציונליות לכל דמות
- validator + solver דטרמיניסטיים בשרת
- hints רק בלחיצה
- leaderboard לפי זמן ורמזים
- CRUD מלא לאדמין
- publish / unpublish

## API עיקרי

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Player

- `GET /api/player/puzzles/active`
- `GET /api/player/puzzles/active/{difficulty}`
- `GET /api/player/progress/{puzzle_id}`
- `PUT /api/player/progress/{puzzle_id}`
- `POST /api/player/puzzles/{puzzle_id}/validate`
- `POST /api/player/puzzles/{puzzle_id}/hint`
- `GET /api/player/puzzles/{puzzle_id}/leaderboard`

### Admin

- `GET /api/admin/puzzles`
- `GET /api/admin/puzzles/{id}`
- `POST /api/admin/puzzles`
- `PUT /api/admin/puzzles/{id}`
- `DELETE /api/admin/puzzles/{id}`
- `POST /api/admin/puzzles/validate`
- `POST /api/admin/puzzles/{id}/publish`
- `POST /api/admin/puzzles/{id}/unpublish`

## חידות seed

בעת עליית השרת נזרעות:

- חידת `easy` פעילה עם 12 רמזים
- חידת `medium` פעילה עם 10 רמזים
- חידת `hard` פעילה עם 8 רמזים

## הערות

- האפליקציה נבנתה לפשטות ויציבות, עם seat graph, validator ו-solver דטרמיניסטיים.
- יצירת חידות חדשות נעשית ידנית דרך אזור הניהול או ישירות בקוד, בלי אינטגרציית AI בתוך האפליקציה.
- רמת הקושי נגזרת בעיקר מכמות הרמזים ומהצלבה ביניהם, ולא ממספר המשתתפים.
- כדי להוסיף תמונות לדמויות, אפשר להשתמש ב-URL מלא או בקבצים מקומיים תחת `frontend/public/characters/` ואז להזין נתיב כמו `/characters/miriam.png`.
