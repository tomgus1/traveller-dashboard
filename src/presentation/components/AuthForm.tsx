import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./Button";
import FormField from "./FormField";

export default function AuthForm() {
  const [view, setView] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      let result;
      if (view === "sign_up") {
        result = await signUp(email, password);
        if (result.success) {
          setMessage("Check your email for the confirmation link!");
        } else {
          setMessage(result.error || "Sign up failed");
        }
      } else {
        result = await signIn(email, password);
        if (!result.success) {
          setMessage(result.error || "Sign in failed");
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (loading) return "Loading...";
    return view === "sign_in" ? "Sign In" : "Sign Up";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-50">
            Traveller Campaign Dashboard
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Multi-user campaign management system
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-zinc-50">
              {view === "sign_in" ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {view === "sign_in"
                ? "Sign in to your account"
                : "Create a new account"}
            </p>
          </div>

          <div className="card">
            <div className="flex rounded-xl overflow-hidden mb-6">
              <button
                type="button"
                onClick={() => setView("sign_in")}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  view === "sign_in"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setView("sign_up")}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  view === "sign_up"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                }`}
              >
                Sign Up
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <FormField
                label="Email address"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />

              <FormField
                label="Password"
                type="password"
                autoComplete={
                  view === "sign_up" ? "new-password" : "current-password"
                }
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />

              {message && (
                <div
                  className={`p-3 rounded-xl text-sm ${
                    message.includes("error") || message.includes("Error")
                      ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                      : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  }`}
                >
                  {message}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                className="w-full justify-center py-3"
              >
                {getButtonText()}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
