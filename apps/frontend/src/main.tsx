import "./components/charts/chartSetup";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AdminPage } from "./components/AdminPage";
import { Footer } from "./components/Footer";
import { UpdatePrompt } from "./components/UpdatePrompt";
import "./styles.css";

const queryClient = new QueryClient();
const isAdminRoute = window.location.pathname.startsWith("/admin");

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("No se encontró el elemento #root.");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <UpdatePrompt />
      {isAdminRoute ? <AdminPage /> : <App />}
      <Footer />
    </QueryClientProvider>
  </StrictMode>,
);
