import { useEffect } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AuthPage } from "../features/auth/AuthPage";
import { AdminDashboard } from "../features/admin/AdminDashboard";
import { PlayHubPage } from "../features/game/PlayHubPage";
import { PuzzlePage } from "../features/game/PuzzlePage";
import { useAuthStore } from "../store/authStore";

function HomePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <section className="mx-auto grid min-h-[calc(100vh-85px)] max-w-7xl items-center gap-8 px-4 py-10 md:grid-cols-[1.08fr_0.92fr] md:px-8">
      <div className="space-y-6">
        <span className="inline-flex rounded-full border border-gold/40 bg-white/70 px-4 py-2 text-sm font-medium text-wine">
          מערכת חידות לוגיות בעברית מלאה
        </span>
        <div className="space-y-4">
          <h1 className="font-display text-5xl leading-tight text-ink md:text-7xl">
            סדר פסח
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-ink/72">
            משחק פאזל לוגי שבו כל רמז קובע מי ישב ליד מי, מי רחוק ממי, ואיך מסדרים
            את שולחן החג בדיוק מושלם. השחקנים פותרים את החידה הפעילה, והאדמין מנהל
            ויוצר חידות חדשות ידנית עם preview, בדיקה ופרסום מהירים.
          </p>
        </div>

        <div className="rounded-[1.8rem] border border-wine/15 bg-white/72 p-5 shadow-lg backdrop-blur">
          <p className="font-bold text-ink">לפני שמתחילים</p>
          <p className="mt-2 text-sm leading-7 text-ink/72">
            נרשמים עם שם משתמש וסיסמה בלבד.
          </p>
          <p className="mt-1 text-sm leading-7 text-red-700">
            אין אפשרות לשחזר סיסמה, לכן חשוב לשמור את פרטי ההתחברות.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link className="button-primary" to={user ? "/play" : "/auth"}>
            {user ? "כניסה למשחק" : "הרשמה / התחברות"}
          </Link>
        </div>
      </div>

      <div className="soft-panel overflow-hidden p-4 md:p-6">
        <div className="table-surface relative min-h-[520px] rounded-[2.2rem] p-6">
          <div className="absolute inset-0 bg-grain opacity-90" />
          <div className="relative z-10 space-y-6">
            <div className="rounded-[1.8rem] bg-white/75 p-5 shadow-lg backdrop-blur">
              <p className="mb-2 font-bold text-wine">מה מחכה במערכת?</p>
              <ul className="space-y-2 text-sm leading-7 text-ink/72">
                <li>פתרון חידות עם Drag & Drop סביב שולחן ליל הסדר</li>
                <li>שמירת התקדמות אישית ובדיקת פתרון דטרמיניסטית</li>
                <li>לידרבורד לפי זמן ורמזים</li>
                <li>10 דמויות קבועות עם פורטרטים מאוירים סביב השולחן</li>
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["אזור שחקנים", "לוח משחק פעיל, רמזים וניצחון"],
                ["חידות מדורגות", "אותו שולחן של 10 דמויות עם כמות רמזים שונה בכל רמה"],
                ["דמויות מאוירות", "הפורטרטים נשארים גלויים ליד השולחן בזמן הגרירה"],
                ["RTL מלא", "ממשק עברי קוהרנטי מקצה לקצה"],
              ].map(([title, text]) => (
                <div key={title} className="rounded-[1.4rem] bg-white/70 p-4 backdrop-blur">
                  <p className="font-bold text-ink">{title}</p>
                  <p className="mt-1 text-sm leading-7 text-ink/70">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/play"
          element={
            <ProtectedRoute>
              <PlayHubPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/play/:difficulty"
          element={
            <ProtectedRoute>
              <PuzzlePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
