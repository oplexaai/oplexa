import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<User, "name" | "phone" | "bio" | "avatarUrl">>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "oplexa_jwt_token";
const USER_KEY = "oplexa_user_cache";

function getApiBase(): string {
  // Web: Metro dev server proxies /api/* to the API server (port 8080)
  // so we use relative URLs — no cross-origin issues
  if (Platform.OS === "web") return "";
  // Native (Expo Go on phone): use env var domain
  const domain = process.env.EXPO_PUBLIC_DOMAIN || "";
  if (!domain) return "";
  return `https://${domain}/api-server`;
}

async function apiFetch(path: string, options: RequestInit = {}, token?: string | null): Promise<Response> {
  const base = getApiBase();
  // Web: relative URL → Metro proxies /api/* to localhost:8080
  // Native: absolute URL via EXPO_PUBLIC_DOMAIN
  const url = Platform.OS === "web" ? `/api${path}` : `${base}/api${path}`;
  console.log("[Oplexa API]", options.method || "GET", url);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };
  return fetch(url, { ...options, headers });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (storedToken) {
          const res = await apiFetch("/auth/me", {}, storedToken);
          if (res.ok) {
            const data = await res.json();
            setToken(storedToken);
            setUser(data.user);
          } else {
            await AsyncStorage.removeItem(TOKEN_KEY);
            await AsyncStorage.removeItem(USER_KEY);
          }
        }
      } catch {
        const cached = await AsyncStorage.getItem(USER_KEY);
        if (cached) {
          try { setUser(JSON.parse(cached)); } catch {}
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      return { success: false, error: "Email and password required" };
    }
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Login failed" };

      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: "Network error — check connection" };
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      return { success: false, error: "All fields are required" };
    }
    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }
    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Registration failed" };

      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: "Network error — check connection" };
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Pick<User, "name" | "phone" | "bio" | "avatarUrl">>) => {
    if (!token) return { success: false, error: "Not logged in" };
    try {
      const res = await apiFetch("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(updates),
      }, token);
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Update failed" };

      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Network error" };
    }
  }, [token]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!token) return { success: false, error: "Not logged in" };
    try {
      const res = await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }, token);
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Failed" };
      return { success: true };
    } catch {
      return { success: false, error: "Network error" };
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
