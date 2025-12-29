import { useState } from "react";
import { useAuth } from "./useAuth";

export function useAuthForm() {
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

    return {
        view,
        setView,
        email,
        setEmail,
        password,
        setPassword,
        loading,
        message,
        handleSubmit,
    };
}
