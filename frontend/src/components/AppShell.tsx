import { NavLink } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="app-shell">
      <header className="sticky top-0 z-20 border-b border-white/40 bg-white/55 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div>
            <p className="font-display text-2xl text-wine">סדר פסח</p>
            <p className="text-sm text-ink/70">פאזל לוגי סביב שולחן החג</p>
          </div>

          <nav className="flex items-center gap-2 rounded-full border border-wine/10 bg-white/70 p-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive ? "bg-wine text-white" : "text-ink/70 hover:text-ink"
                }`
              }
            >
              בית
            </NavLink>
            <NavLink
              to="/play"
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive ? "bg-wine text-white" : "text-ink/70 hover:text-ink"
                }`
              }
            >
              אזור שחקנים
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-bold text-ink">{user.username}</p>
                  <p className="text-xs text-ink/60">
                    {user.is_admin ? "אדמין" : "שחקן"}
                  </p>
                </div>
                <button type="button" className="button-secondary" onClick={logout}>
                  התנתקות
                </button>
              </>
            ) : (
              <NavLink to="/auth" className="button-primary">
                התחברות
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="px-4 pb-8 pt-5 text-center text-sm text-ink/62 md:px-8">
        המשחק נבנה על ידי{" "}
        <a
          href="https://www.elbitlaw.com"
          target="_blank"
          rel="noreferrer"
          className="font-bold text-wine underline-offset-4 hover:underline"
        >
          אליהו ביטון
        </a>
      </footer>
    </div>
  );
}
