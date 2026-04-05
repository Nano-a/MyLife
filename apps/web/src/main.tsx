import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";
import { ensureSeedData } from "./initDb";

const root = document.getElementById("root");
if (!root) throw new Error("#root manquant");

void ensureSeedData().then(() => {
  const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

  createRoot(root).render(
    <StrictMode>
      <BrowserRouter basename={routerBasename}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </StrictMode>
  );

  /* PWA : en prod (HTTPS), ex. GitHub Pages — chemin aligné sur Vite `base` */
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  }
});
