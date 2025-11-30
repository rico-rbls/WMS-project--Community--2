import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "next-themes";
import { AppProvider } from "./context/app-context";
import { AuthProvider } from "./context/auth-context";
import { reportError } from "./lib/monitoring";

const TypedThemeProvider = ThemeProvider as unknown as (props: any) => JSX.Element;

createRoot(document.getElementById("root")!).render(
  <TypedThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </TypedThemeProvider>
);

window.addEventListener('error', (e) => {
  const err = e.error instanceof Error ? e.error : new Error(String(e.message))
  reportError(err)
});
