"use client";

import { useState } from "react";
import { X, Mail, Lock, User, Eye, EyeOff } from "lucide-react";

interface Props {
  mode: "login" | "create";
  onClose: () => void;
  onSuccess: (user: { username: string; email: string }) => void;
}

export function LoginModal({ mode: initialMode, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { email, username, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kuch gadbad ho gayi.");
        return;
      }

      onSuccess({ username: data.user.username, email: data.user.email });
    } catch {
      setError("Connection error. Dobara try karo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111] border border-[#222] rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src="/oplexa-logo.png" alt="Oplexa" className="w-8 h-8 object-contain" />
            <h2 className="font-bold text-lg text-white">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 text-sm transition-all"
            />
          </div>

          {mode === "create" && (
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
                minLength={2}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 text-sm transition-all"
              />
            </div>
          )}

          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 text-sm transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm disabled:opacity-50 transition-colors mt-1"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          {mode === "login" ? "Account nahi hai? " : "Pehle se account hai? "}
          <button
            onClick={() => { setMode(mode === "login" ? "create" : "login"); setError(""); }}
            className="text-red-500 hover:text-red-400 font-medium"
          >
            {mode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}
