import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./presentation/components/ErrorBoundary";
import { initInfrastructure } from "./infrastructure/init";
import "./index.css";

import { ThemeProvider } from "./context/ThemeContext";

// Initialize infrastructure (Composition Root)
initInfrastructure();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
