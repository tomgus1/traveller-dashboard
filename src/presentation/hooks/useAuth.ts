import { useEffect, useState } from "react";
import { getAuthService } from "../../core/container";
import type {
  User,
  CompleteProfileRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from "../../core/entities";

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
  completeProfile: (
    request: CompleteProfileRequest
  ) => Promise<{ success: boolean; error?: string; user?: User }>;
  updateProfile: (
    request: UpdateProfileRequest
  ) => Promise<{ success: boolean; error?: string; user?: User }>;
  changePassword: (
    request: ChangePasswordRequest
  ) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

export const useAuth = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const authService = getAuthService();

  useEffect(() => {
    // Get initial user
    const getCurrentUser = async () => {
      const currentUser = await authService.getCurrentUser();
      // eslint-disable-next-line no-console
      console.log("useAuth: getCurrentUser result:", currentUser);
      setUser(currentUser);
      setLoading(false);
    };

    getCurrentUser();

    // Listen for auth changes
    const unsubscribe = authService.onAuthStateChange((user) => {
      // eslint-disable-next-line no-console
      console.log("useAuth: onAuthStateChange triggered with user:", user);
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

  const completeProfile = async (request: CompleteProfileRequest) => {
    const result = await authService.completeProfile(request);

    if (result.success && result.data) {
      setUser(result.data);
      return { success: true, user: result.data };
    }

    return { success: false, error: result.error };
  };

  const updateProfile = async (request: UpdateProfileRequest) => {
    const result = await authService.updateProfile(request);

    if (result.success && result.data) {
      setUser(result.data);
      return { success: true, user: result.data };
    }

    return { success: false, error: result.error };
  };

  const changePassword = async (request: ChangePasswordRequest) => {
    const result = await authService.changePassword(request);

    if (result.success) {
      return { success: true };
    }

    return { success: false, error: result.error };
  };

  const deleteAccount = async () => {
    const result = await authService.deleteAccount();

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
    completeProfile,
    updateProfile,
    changePassword,
    deleteAccount,
  };
};
