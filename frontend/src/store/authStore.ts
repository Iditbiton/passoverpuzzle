import { create } from "zustand";

import { apiRequest, persistToken } from "../api/client";
import type { TokenResponse, User } from "../types/api";

interface AuthState {
  token: string | null;
  user: User | null;
  initialized: boolean;
  loading: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  initialized: false,
  loading: false,
  error: null,

  bootstrap: async () => {
    if (get().initialized) {
      return;
    }
    const existingToken = localStorage.getItem("seder-order-token");
    if (!existingToken) {
      set({ initialized: true });
      return;
    }
    set({ token: existingToken, loading: true });
    try {
      const user = await apiRequest<User>("/auth/me");
      set({ user, token: existingToken, initialized: true, loading: false });
    } catch {
      persistToken(null);
      set({ token: null, user: null, initialized: true, loading: false });
    }
  },

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const response = await apiRequest<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
        skipAuth: true,
      });
      persistToken(response.access_token);
      set({
        token: response.access_token,
        user: response.user,
        loading: false,
        initialized: true,
      });
    } catch (error) {
      set({ loading: false, error: "התחברות נכשלה." });
      throw error;
    }
  },

  register: async (username, password) => {
    set({ loading: true, error: null });
    try {
      await apiRequest<User>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password }),
        skipAuth: true,
      });
      await get().login(username, password);
    } catch (error) {
      set({ loading: false, error: "הרשמה נכשלה." });
      throw error;
    }
  },

  logout: () => {
    persistToken(null);
    set({ token: null, user: null, initialized: true, loading: false });
  },
}));
