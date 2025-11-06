import { useEffect, useState } from "react";
import { supabase } from "../../infrastructure/database/supabase";

export default function DebugPanel() {
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Testing...");
  
  const envVars = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
      ? "***SET***"
      : "MISSING",
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
  };

  useEffect(() => {
    // Test Supabase connection
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setConnectionStatus(`Auth Error: ${error.message}`);
        } else {
          setConnectionStatus(
            `Connection OK - Session: ${data.session ? "Active" : "None"}`
          );
        }
      } catch (err) {
        setConnectionStatus(
          `Connection Failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    };

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Debug Panel</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Environment Variables</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(envVars, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Supabase Connection</h2>
          <p
            className={`p-4 rounded ${connectionStatus.includes("OK") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
          >
            {connectionStatus}
          </p>
        </div>
      </div>
    </div>
  );
}
