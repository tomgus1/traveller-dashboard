import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./presentation/components/ErrorBoundary";
import { initInfrastructure } from "./infrastructure/init";
import "./index.css";

// Initialize infrastructure (Composition Root)
initInfrastructure();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
