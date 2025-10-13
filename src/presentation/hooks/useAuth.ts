import { useEffect, useState } from "react";
import { getAuthService } from "../../core/container";
import type { User } from "../../core/entities";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
}

export const useAuth = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const authService = getAuthService();

  useEffect(() => {
    // Get initial user
    const getCurrentUser = async () => {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };

    getCurrentUser();

    // Listen for auth changes
    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [authService]);

  const signIn = async (email: string, password: string) => {
    const result = await authService.signIn(email, password);

    if (result.success && result.data) {
      setUser(result.data);
      return { success: true };
    }

    return { success: false, error: result.error };
  };

  const signUp = async (email: string, password: string) => {
    const result = await authService.signUp(email, password);

    if (result.success && result.data) {
      setUser(result.data);
      return { success: true };
    }

    return { success: false, error: result.error };
  };

  const signOut = async () => {
    const result = await authService.signOut();

    if (result.success) {
      setUser(null);
      return { success: true };
    }

    return { success: false, error: result.error };
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };
};
