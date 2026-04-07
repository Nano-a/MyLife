import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useSessionStore } from "./sessionStore";

export function RequireAuth({ children }: { children: ReactNode }) {
  const signedIn = useSessionStore((s) => s.googleSignedIn);
  const loc = useLocation();
  if (!signedIn) {
    return <Navigate to="/connexion" state={{ from: loc }} replace />;
  }
  return children;
}
