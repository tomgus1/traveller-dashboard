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


  return (
    <div className="min-h-screen bg-transparent selection:bg-primary/20 relative flex flex-col items-center justify-center p-4">
      <div className="scanlines" />

      <div className="max-w-md w-full space-y-8 animate-hud relative z-10">
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex flex-col items-center">
            <div className="flex items-baseline gap-2">
              <h1 className="text-5xl font-black tracking-tighter uppercase text-text-main leading-none">
                TRAVELLER
              </h1>
              <span className="text-xs font-black text-primary border-2 border-primary px-2 py-0.5">DASH</span>
            </div>
            <div className="h-1.5 w-full bg-primary mt-2 flex justify-between px-1">
              <div className="w-4 h-full bg-white/20" />
              <div className="w-12 h-full bg-white/20" />
              <div className="w-4 h-full bg-white/20" />
            </div>
          </div>
          <p className="text-[10px] text-muted font-black uppercase tracking-[0.4em] mt-4">
            Unified Stellar Operations Framework // RC-01
          </p>
        </div>

        <div className="card-mgt hud-frame shadow-2xl p-8 bg-card/80 backdrop-blur-md">
          <div className="mgt-header-bar -mx-8 -mt-8 mb-8">
            <span className="text-xs">{view === "sign_in" ? "AUTH // COMM-LINK" : "REG // ENROLLMENT"}</span>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-primary animate-pulse" />
              <div className="w-2 h-2 bg-white/40" />
            </div>
          </div>

          <div className="flex border border-border bg-surface-low mb-8 p-1">
            <button
              type="button"
              onClick={() => setView("sign_in")}
              className={`flex-1 py-2 text-[10px] font-black tracking-[0.2em] transition-all duration-300 ${view === "sign_in"
                ? "bg-primary text-white"
                : "text-muted hover:text-text-main"
                }`}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => setView("sign_up")}
              className={`flex-1 py-2 text-[10px] font-black tracking-[0.2em] transition-all duration-300 ${view === "sign_up"
                ? "bg-primary text-white"
                : "text-muted hover:text-text-main"
                }`}
            >
              SIGN UP
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <FormField
              label="Personnel Identifier (Email)"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="commander@imperium.org"
            />

            <FormField
              label="Security Key (Password)"
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
                className={`p-3 border text-[8px] font-black uppercase tracking-widest transition-all animate-hud ${message.toLowerCase().includes("error") || message.toLowerCase().includes("failed")
                  ? "border-accent bg-accent/5 text-accent"
                  : "border-primary bg-primary/5 text-primary"
                  }`}
              >
                {message.toLowerCase().includes("error") ? "INIT_FAILURE: " : ""}{message}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              variant="premium"
              className="w-full py-4"
            >
              {loading ? "INITIALIZING..." : `AUTHORIZE ${view === "sign_in" ? "ACCESS" : "REGISTRATION"}`}
            </Button>
          </form>
        </div>

        <div className="text-center opacity-40">
          <p className="text-[8px] font-black tracking-[0.5em] uppercase">Mongoose Traveller 2nd Edition Dashboard</p>
        </div>
      </div>
    </div>
  );
}
