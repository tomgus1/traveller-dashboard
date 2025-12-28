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
    <div className="min-h-screen mesh-gradient transition-colors duration-700">
      {/* Header */}
      <div className="glass px-4 py-6 border-b">
        <div className="max-w-7xl mx-auto text-center md:text-left">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Traveller Dashboard
          </h1>
          <p className="text-sm text-muted">
            The ultimate multi-user campaign management system
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 animate-in">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-black tracking-tighter">
              {view === "sign_in" ? "WELCOME BACK" : "JOIN THE CREW"}
            </h2>
            <p className="text-muted font-medium">
              {view === "sign_in"
                ? "Authorization required to access campaign logs."
                : "Register your subspace frequency to begin."}
            </p>
          </div>

          <div className="card-modern shadow-2xl">
            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl mb-8">
              <button
                type="button"
                onClick={() => setView("sign_in")}
                className={`flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-all duration-300 ${view === "sign_in"
                    ? "bg-white dark:bg-zinc-700 shadow-md text-primary scale-[1.02]"
                    : "text-muted hover:text-primary"
                  }`}
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => setView("sign_up")}
                className={`flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-all duration-300 ${view === "sign_up"
                    ? "bg-white dark:bg-zinc-700 shadow-md text-primary scale-[1.02]"
                    : "text-muted hover:text-primary"
                  }`}
              >
                SIGN UP
              </button>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <FormField
                label="Subspace Email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="commander@imperium.org"
              />

              <FormField
                label="Security Key"
                type="password"
                autoComplete={
                  view === "sign_up" ? "new-password" : "current-password"
                }
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              {message && (
                <div
                  className={`p-4 rounded-xl text-xs font-bold border transition-all animate-in ${message.includes("error") || message.includes("Error") || message.includes("failed")
                      ? "bg-red-500/10 border-red-500/20 text-red-500"
                      : "bg-green-500/10 border-green-500/20 text-green-500"
                    }`}
                >
                  {message.toUpperCase()}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                className="btn-premium w-full py-4 text-xs tracking-widest uppercase font-black"
              >
                {getButtonText().toUpperCase()}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
