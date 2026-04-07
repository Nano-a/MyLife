import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RequireAuth } from "./auth/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { useThemePrefs } from "./theme/ThemeProvider";
import { FirebaseAuthSync } from "./auth/FirebaseAuthSync";

const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const AgendaPage = lazy(() => import("./pages/AgendaPage").then((m) => ({ default: m.AgendaPage })));
const HabitsPage = lazy(() => import("./pages/HabitsPage").then((m) => ({ default: m.HabitsPage })));
const SportPage = lazy(() => import("./pages/SportPage").then((m) => ({ default: m.SportPage })));
const FinancePage = lazy(() => import("./pages/FinancePage").then((m) => ({ default: m.FinancePage })));
const GoalsPage = lazy(() => import("./pages/GoalsPage").then((m) => ({ default: m.GoalsPage })));
const NotesPage = lazy(() => import("./pages/NotesPage").then((m) => ({ default: m.NotesPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const DayJournalPage = lazy(() => import("./pages/DayJournalPage").then((m) => ({ default: m.DayJournalPage })));

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8 text-center text-sm text-muted">
      Chargement…
    </div>
  );
}

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
          <Route
            path="accueil"
            element={
              <Suspense fallback={<PageFallback />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="agenda"
            element={
              <Suspense fallback={<PageFallback />}>
                <AgendaPage />
              </Suspense>
            }
          />
          <Route
            path="habitudes"
            element={
              <Suspense fallback={<PageFallback />}>
                <HabitsPage />
              </Suspense>
            }
          />
          <Route
            path="sport"
            element={
              <Suspense fallback={<PageFallback />}>
                <SportPage />
              </Suspense>
            }
          />
          <Route
            path="finances"
            element={
              <Suspense fallback={<PageFallback />}>
                <FinancePage />
              </Suspense>
            }
          />
          <Route
            path="objectifs"
            element={
              <Suspense fallback={<PageFallback />}>
                <GoalsPage />
              </Suspense>
            }
          />
          <Route
            path="notes"
            element={
              <Suspense fallback={<PageFallback />}>
                <NotesPage />
              </Suspense>
            }
          />
          <Route
            path="parametres"
            element={
              <Suspense fallback={<PageFallback />}>
                <SettingsPage />
              </Suspense>
            }
          />
          <Route
            path="carnet"
            element={
              <Suspense fallback={<PageFallback />}>
                <DayJournalPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="/" element={<Navigate to="/app/accueil" replace />} />
        <Route path="*" element={<Navigate to="/app/accueil" replace />} />
      </Routes>
    </>
  );
}
