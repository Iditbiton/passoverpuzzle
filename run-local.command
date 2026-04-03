#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

print_header() {
  printf '\n%s\n' "$1"
}

require_command() {
  local command_name="$1"
  local install_hint="$2"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "חסרה הפקודה '$command_name'."
    echo "$install_hint"
    exit 1
  fi
}

has_command() {
  local command_name="$1"
  command -v "$command_name" >/dev/null 2>&1
}

copy_env_if_missing() {
  local target_dir="$1"
  if [ ! -f "$target_dir/.env" ] && [ -f "$target_dir/.env.example" ]; then
    cp "$target_dir/.env.example" "$target_dir/.env"
  fi
}

escape_for_applescript() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempts=60

  for _ in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "$label מוכן: $url"
      return 0
    fi
    sleep 1
  done

  echo "לא הצלחתי לאשר ש-$label עלה בזמן."
  return 1
}

print_header "בודק כלים בסיסיים"
require_command "python3" "יש להתקין Python 3 לפני ההרצה."
require_command "npm" "יש להתקין Node.js + npm לפני ההרצה."
require_command "curl" "יש להתקין curl לפני ההרצה."
require_command "osascript" "הסקריפט מיועד ל-macOS וזקוק ל-osascript."
require_command "open" "הסקריפט מיועד ל-macOS וזקוק ל-open."

print_header "מכין קבצי env"
copy_env_if_missing "$BACKEND_DIR"
copy_env_if_missing "$FRONTEND_DIR"

USE_SQLITE_FALLBACK=0

if has_command "docker"; then
  print_header "מעלה את מסד הנתונים"
  (cd "$ROOT_DIR" && docker compose up -d db)
else
  USE_SQLITE_FALLBACK=1
  print_header "Docker לא נמצא, עובר למצב בדיקה מהיר עם SQLite"
fi

print_header "מכין backend"
if [ ! -d "$BACKEND_DIR/.venv" ]; then
  python3 -m venv "$BACKEND_DIR/.venv"
fi
"$BACKEND_DIR/.venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"

print_header "מכין frontend"
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  (cd "$FRONTEND_DIR" && npm install)
fi

if [ "$USE_SQLITE_FALLBACK" -eq 1 ]; then
  BACKEND_COMMAND="cd '$BACKEND_DIR' && source .venv/bin/activate && export DATABASE_URL='sqlite:///./local_quickstart.db' && uvicorn app.main:app --reload"
else
  BACKEND_COMMAND="cd '$BACKEND_DIR' && source .venv/bin/activate && uvicorn app.main:app --reload"
fi
FRONTEND_COMMAND="cd '$FRONTEND_DIR' && npm run dev"

print_header "פותח חלונות שרת"
osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "$(escape_for_applescript "$BACKEND_COMMAND")"
  do script "$(escape_for_applescript "$FRONTEND_COMMAND")"
end tell
APPLESCRIPT

print_header "ממתין לשירותים"
wait_for_url "http://localhost:8000/health" "Backend"
wait_for_url "http://localhost:5173" "Frontend"

print_header "פותח דפדפן"
open "http://localhost:5173"
open "http://localhost:8000/docs"

cat <<'EOF'

המערכת עלתה.

Frontend:
http://localhost:5173

Backend Docs:
http://localhost:8000/docs

אדמין seeded:
username: admin
password: admin1234

אם הופעל מצב SQLite מהיר, זה מיועד לבדיקה לוקאלית נוחה בלבד.

EOF
