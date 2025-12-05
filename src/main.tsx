import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "next-themes";
import { AppProvider } from "./context/app-context";
import { AuthProvider } from "./context/auth-context";
import { FavoritesProvider } from "./context/favorites-context";
import { NotificationsProvider } from "./context/notifications-context";
import { reportError } from "./lib/monitoring";

const TypedThemeProvider = ThemeProvider as unknown as (props: any) => JSX.Element;

createRoot(document.getElementById("root")!).render(
  <TypedThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <AuthProvider>
      <NotificationsProvider>
        <FavoritesProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </FavoritesProvider>
      </NotificationsProvider>
    </AuthProvider>
  </TypedThemeProvider>
);

window.addEventListener('error', (e) => {
  const err = e.error instanceof Error ? e.error : new Error(String(e.message))
  reportError(err)
});
