import { useState } from "react";
import { useAuth } from "../lib/auth";

export default function AuthPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        if (!name.trim()) { setError("Name is required"); setLoading(false); return; }
        await register(name.trim(), email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "var(--bg)",
      padding: "20px",
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img
            src="/oplexa-logo.jpg"
            alt="Oplexa"
            style={{
              width: "72px", height: "72px",
              borderRadius: "18px",
              objectFit: "cover",
              marginBottom: "16px",
              display: "block",
              margin: "0 auto 16px auto",
            }}
          />
          <h1 style={{ fontSize: "26px", fontWeight: "700", color: "var(--text)" }}>
            {tab === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "6px" }}>
            {tab === "login" ? "Sign in to Oplexa" : "Join Oplexa today"}
          </p>
        </div>

        <div style={{
          display: "flex",
          background: "var(--surface2)",
          borderRadius: "12px",
          padding: "4px",
          marginBottom: "24px",
          gap: "4px",
        }}>
          {(["login", "register"] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "9px",
                fontSize: "14px",
                fontWeight: "600",
                background: tab === t ? "var(--accent)" : "transparent",
                color: tab === t ? "white" : "var(--text-muted)",
                transition: "all 0.2s",
              }}
            >
              {t === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {tab === "register" && (
            <div>
              <label style={{ fontSize: "13px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Full Name</label>
              <input
                className="oplexa-input"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: "13px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Email</label>
            <input
              className="oplexa-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: "13px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                className="oplexa-input"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: "44px" }}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                  color: "var(--text-muted)", fontSize: "12px", padding: "4px",
                }}
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: "rgba(220,38,38,0.12)",
              border: "1px solid rgba(220,38,38,0.3)",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "14px",
              color: "#f87171",
            }}>
              {error}
            </div>
          )}

          <button className="oplexa-btn" type="submit" disabled={loading} style={{ marginTop: "4px" }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <span className="spinner" style={{ width: "16px", height: "16px" }} />
                {tab === "login" ? "Signing in..." : "Creating account..."}
              </span>
            ) : (
              tab === "login" ? "Sign In" : "Create Account"
            )}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "var(--text-muted)" }}>
          {tab === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setTab(tab === "login" ? "register" : "login"); setError(""); }}
            style={{ color: "var(--accent)", fontWeight: "600" }}
          >
            {tab === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
