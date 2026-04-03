import { Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

export function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center text-ink/70">
        טוען את המערכת...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (adminOnly && !user.is_admin) {
    return <Navigate to="/play" replace />;
  }

  return <>{children}</>;
}
