import { FormEvent, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client";
import { Field } from "../../components/Field";
import { useAuthStore } from "../../store/authStore";

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const from = useMemo(
    () => (location.state as { from?: string } | null)?.from ?? "/play",
    [location.state],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
      navigate(from, { replace: true });
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "לא הצלחנו להשלים את הפעולה כרגע.",
      );
    }
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-85px)] max-w-7xl items-center gap-10 px-4 py-10 md:grid-cols-[1.1fr_0.9fr] md:px-8">
      <div className="space-y-6">
        <span className="inline-flex rounded-full border border-gold/40 bg-white/60 px-4 py-2 text-sm font-medium text-wine">
          חוויית פאזל עברית מלאה עם RTL
        </span>
        <div className="space-y-4">
          <h1 className="font-display text-5xl leading-tight text-ink md:text-6xl">
            מושיבים את כולם נכון לפני שמתחילים לקרוא בהגדה
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-ink/72">
            פתרו חידות ישיבה סביב שולחן ליל הסדר, שמרו התקדמות בין ביקורים, ובדקו
            מי מהמשפחה משיג את הזמן הטוב ביותר בלי לבזבז רמזים.
          </p>
        </div>

        <div className="soft-panel overflow-hidden">
          <div className="grid gap-0 md:grid-cols-3">
            {[
              ["שמירת התקדמות", "הניסיון נשמר אוטומטית בכל גרירה"],
              ["בדיקה דטרמיניסטית", "השרת מאמת כל פתרון לפי מנוע חוקים יציב"],
              ["לידרבורד תחרותי", "דירוג לפי זמן ורמזים"],
            ].map(([title, text]) => (
              <div key={title} className="border-b border-white/60 p-5 md:border-b-0 md:border-l">
                <p className="mb-2 font-bold text-wine">{title}</p>
                <p className="text-sm leading-7 text-ink/70">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="soft-panel p-6 md:p-8">
        <div className="mb-8 flex items-center gap-2 rounded-full bg-parchment p-1">
          <button
            type="button"
            className={`flex-1 rounded-full px-4 py-3 text-sm font-bold transition ${
              mode === "login" ? "bg-wine text-white" : "text-ink/70"
            }`}
            onClick={() => setMode("login")}
          >
            התחברות
          </button>
          <button
            type="button"
            className={`flex-1 rounded-full px-4 py-3 text-sm font-bold transition ${
              mode === "register" ? "bg-wine text-white" : "text-ink/70"
            }`}
            onClick={() => setMode("register")}
          >
            הרשמה
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <Field label="שם משתמש">
            <input
              className="field-input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="לדוגמה: yael"
            />
          </Field>
          <Field label="סיסמה" hint="לפחות 6 תווים">
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="הקלידו סיסמה"
            />
          </Field>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button type="submit" className="button-primary w-full" disabled={loading}>
            {loading
              ? "טוען..."
              : mode === "login"
                ? "כניסה לאזור האישי"
                : "יצירת משתמש חדש"}
          </button>
        </form>
      </div>
    </section>
  );
}
