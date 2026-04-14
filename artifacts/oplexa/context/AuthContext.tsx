import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USERS_KEY = "oplexa_users";
const CURRENT_USER_KEY = "oplexa_current_user";

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(CURRENT_USER_KEY).then((data) => {
      if (data) {
        try {
          setUser(JSON.parse(data));
        } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const getUsers = async (): Promise<StoredUser[]> => {
    const data = await AsyncStorage.getItem(USERS_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  };

  const saveUsers = async (users: StoredUser[]) => {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  };

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      return { success: false, error: "All fields are required" };
    }
    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }

    const users = await getUsers();
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: "Email already registered" };
    }

    const newUser: StoredUser = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: simpleHash(password + email.toLowerCase()),
    };

    users.push(newUser);
    await saveUsers(users);

    const publicUser: User = { id: newUser.id, name: newUser.name, email: newUser.email };
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(publicUser));
    setUser(publicUser);
    return { success: true };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      return { success: false, error: "Email and password required" };
    }

    const users = await getUsers();
    const found = users.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase().trim() &&
        u.passwordHash === simpleHash(password + email.toLowerCase().trim())
    );

    if (!found) {
      return { success: false, error: "Invalid email or password" };
    }

    const publicUser: User = { id: found.id, name: found.name, email: found.email };
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(publicUser));
    setUser(publicUser);
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
