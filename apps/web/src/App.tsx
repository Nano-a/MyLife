import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RequireAuth } from "./auth/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { Dashboard } from "./pages/Dashboard";
import { AgendaPage } from "./pages/AgendaPage";
import { HabitsPage } from "./pages/HabitsPage";
import { SportPage } from "./pages/SportPage";
import { FinancePage } from "./pages/FinancePage";
import { GoalsPage } from "./pages/GoalsPage";
import { NotesPage } from "./pages/NotesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useThemePrefs } from "./theme/ThemeProvider";
import { useEffect } from "react";
import { FirebaseAuthSync } from "./auth/FirebaseAuthSync";

function DocumentTitle() {
  const { prefs } = useThemePrefs();
  useEffect(() => {
    document.title = prefs.appDisplayName || "MyLife";
  }, [prefs.appDisplayName]);
  return null;
}

export default function App() {
  return (
    <>
      <DocumentTitle />
      <FirebaseAuthSync />
      <Routes>
        <Route path="/connexion" element={<LoginPage />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="accueil" replace />} />
          <Route path="accueil" element={<Dashboard />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="habitudes" element={<HabitsPage />} />
          <Route path="sport" element={<SportPage />} />
          <Route path="finances" element={<FinancePage />} />
          <Route path="objectifs" element={<GoalsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="parametres" element={<SettingsPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/app/accueil" replace />} />
        <Route path="*" element={<Navigate to="/app/accueil" replace />} />
      </Routes>
    </>
  );
}
