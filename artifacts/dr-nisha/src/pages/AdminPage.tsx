import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth, getToken } from "../lib/auth";

const API = "/api";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  isAdmin: boolean;
  createdAt: string;
}

interface AiConfig {
  systemPrompt: string;
  personality: string;
  restrictions: string;
}

interface Stats {
  total: number;
  admins: number;
  newToday: number;
}

function Avatar({ user, size = 36 }: { user: AdminUser; size?: number }) {
  const initials = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "var(--red)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, color: "#fff", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{
      flex: 1, background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "14px 16px", textAlign: "center",
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2, letterSpacing: "0.5px" }}>{label}</div>
    </div>
  );
}

interface EditModalProps {
  user: AdminUser;
  onClose: () => void;
  onSave: (updated: AdminUser) => void;
}

function EditUserModal({ user, onClose, onSave }: EditModalProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || "");
  const [bio, setBio] = useState(user.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const token = getToken();
      const body: any = { name, email, phone, bio, avatarUrl, isAdmin };
      if (password) body.password = password;
      const r = await fetch(`${API}/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Update failed");
      onSave(data.user);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: 14,
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)",
        padding: 24, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <p style={{ fontSize: 18, fontWeight: 700 }}>Edit User</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Name", value: name, setter: setName, placeholder: "Full name" },
            { label: "Email", value: email, setter: setEmail, placeholder: "Email address" },
            { label: "Phone", value: phone, setter: setPhone, placeholder: "Phone number (optional)" },
            { label: "Profile Photo URL", value: avatarUrl, setter: setAvatarUrl, placeholder: "https://..." },
            { label: "New Password", value: password, setter: setPassword, placeholder: "Leave blank to keep current", type: "password" },
          ].map(({ label, value, setter, placeholder, type }) => (
            <div key={label}>
              <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4, fontWeight: 600 }}>{label}</p>
              <input
                type={type || "text"}
                value={value}
                onChange={e => setter(e.target.value)}
                placeholder={placeholder}
                style={inputStyle}
              />
            </div>
          ))}

          <div>
            <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4, fontWeight: 600 }}>Bio</p>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="User bio (optional)"
              rows={2}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </div>

          <div
            onClick={() => setIsAdmin(!isAdmin)}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
              background: "var(--surface2)", borderRadius: 10, cursor: "pointer",
              border: `1px solid ${isAdmin ? "var(--red)" : "var(--border)"}`,
            }}
          >
            <div style={{
              width: 40, height: 22, borderRadius: 11, position: "relative",
              background: isAdmin ? "var(--red)" : "rgba(255,255,255,0.1)",
              transition: "background 0.2s", flexShrink: 0,
            }}>
              <div style={{
                position: "absolute", top: 2, left: isAdmin ? 20 : 2, width: 18, height: 18,
                borderRadius: "50%", background: "#fff", transition: "left 0.2s",
              }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: isAdmin ? "var(--red)" : "var(--text)" }}>Admin Access</p>
              <p style={{ fontSize: 11, color: "var(--text-dim)" }}>This user can access the admin panel</p>
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(255,50,50,0.1)", border: "1px solid rgba(255,50,50,0.3)", borderRadius: 8, padding: "10px 12px", color: "#ff6b6b", fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--border)",
                background: "transparent", color: "var(--text)", fontSize: 14, cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 2, padding: "12px", borderRadius: 10, border: "none",
                background: "var(--red)", color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"users" | "ai">("users");
  const [users_list, setUsersList] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, admins: 0, newToday: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [aiConfig, setAiConfig] = useState<AiConfig>({ systemPrompt: "", personality: "", restrictions: "" });
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!user?.isAdmin) {
      setLocation("/");
      return;
    }
    loadUsers();
    loadStats();
  }, [user]);

  async function loadUsers() {
    setLoading(true);
    try {
      const token = getToken();
      const r = await fetch(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      if (r.ok) setUsersList(data.users || []);
    } catch {}
    setLoading(false);
  }

  async function loadStats() {
    try {
      const token = getToken();
      const r = await fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      if (r.ok) setStats(data);
    } catch {}
  }

  async function loadAiConfig() {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const token = getToken();
      const r = await fetch(`${API}/admin/ai-config`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      if (r.ok && data.config) {
        setAiConfig({
          systemPrompt: data.config.systemPrompt || "",
          personality: data.config.personality || "",
          restrictions: data.config.restrictions || "",
        });
      }
    } catch {}
    setAiLoading(false);
  }

  async function saveAiConfig() {
    setAiSaving(true);
    setAiSaved(false);
    try {
      const token = getToken();
      const r = await fetch(`${API}/admin/ai-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(aiConfig),
      });
      if (r.ok) {
        setAiSaved(true);
        setTimeout(() => setAiSaved(false), 3000);
      }
    } catch {}
    setAiSaving(false);
  }

  async function handleDelete(id: number) {
    try {
      const token = getToken();
      const r = await fetch(`${API}/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        setUsersList(prev => prev.filter(u => u.id !== id));
        setStats(prev => ({ ...prev, total: prev.total - 1 }));
      }
    } catch {}
    setDeleteConfirm(null);
  }

  function handleTabChange(tab: "users" | "ai") {
    setActiveTab(tab);
    if (tab === "ai") loadAiConfig();
  }

  const filtered = users_list.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const textareaStyle: React.CSSProperties = {
    width: "100%", background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: 10, padding: "12px 14px", color: "var(--text)", fontSize: 14,
    outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6,
    boxSizing: "border-box",
  };

  if (!user?.isAdmin) return null;

  return (
    <div style={{ minHeight: "100dvh", background: "#000", color: "var(--text)", fontFamily: "inherit" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 40px" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "16px 0 20px",
          borderBottom: "1px solid var(--border)", marginBottom: 20,
        }}>
          <button
            onClick={() => setLocation("/")}
            style={{
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
              padding: "8px 12px", color: "var(--text)", fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            ← Back
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
              <span style={{ color: "var(--red)" }}>Admin</span> Panel
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-dim)", margin: 0 }}>Oplexa Management Dashboard</p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <StatCard label="TOTAL USERS" value={stats.total} />
          <StatCard label="NEW TODAY" value={stats.newToday} color="var(--red)" />
          <StatCard label="ADMINS" value={stats.admins} color="#f59e0b" />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--surface)", borderRadius: 12, padding: 4, border: "1px solid var(--border)" }}>
          {[
            { key: "users", label: "👥 Users" },
            { key: "ai", label: "🤖 AI Training" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key as "users" | "ai")}
              style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer",
                background: activeTab === tab.key ? "var(--red)" : "transparent",
                color: activeTab === tab.key ? "#fff" : "var(--text-dim)",
                fontWeight: activeTab === tab.key ? 700 : 400, fontSize: 14,
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", fontSize: 15 }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                style={{
                  width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "12px 14px 12px 40px", color: "var(--text)", fontSize: 14,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                <div className="spinner" />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)" }}>
                {search ? "Koi user nahi mila" : "Abhi koi user registered nahi hai"}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.map(u => (
                  <div
                    key={u.id}
                    style={{
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: 14, padding: "14px 16px",
                      display: "flex", alignItems: "center", gap: 12,
                    }}
                  >
                    <Avatar user={u} size={42} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{u.name}</p>
                        {u.isAdmin && (
                          <span style={{
                            background: "rgba(245,158,11,0.15)", color: "#f59e0b",
                            fontSize: 10, fontWeight: 700, padding: "2px 8px",
                            borderRadius: 20, border: "1px solid rgba(245,158,11,0.3)",
                          }}>
                            ADMIN
                          </span>
                        )}
                        {u.id === user?.id && (
                          <span style={{
                            background: "rgba(220,38,38,0.15)", color: "var(--red)",
                            fontSize: 10, fontWeight: 700, padding: "2px 8px",
                            borderRadius: 20, border: "1px solid rgba(220,38,38,0.3)",
                          }}>
                            YOU
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.email}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "2px 0 0", opacity: 0.6 }}>
                        Joined: {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => setEditUser(u)}
                        style={{
                          background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)",
                          borderRadius: 8, padding: "7px 14px", color: "var(--red)",
                          fontSize: 13, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                      {u.id !== user?.id && (
                        deleteConfirm === u.id ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              onClick={() => handleDelete(u.id)}
                              style={{
                                background: "rgba(220,38,38,0.2)", border: "1px solid var(--red)",
                                borderRadius: 8, padding: "7px 10px", color: "#ff6b6b",
                                fontSize: 12, fontWeight: 700, cursor: "pointer",
                              }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              style={{
                                background: "var(--surface2)", border: "1px solid var(--border)",
                                borderRadius: 8, padding: "7px 10px", color: "var(--text-dim)",
                                fontSize: 12, cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(u.id)}
                            style={{
                              background: "transparent", border: "1px solid var(--border)",
                              borderRadius: 8, padding: "7px 10px", color: "var(--text-dim)",
                              fontSize: 13, cursor: "pointer",
                            }}
                          >
                            🗑
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Training Tab */}
        {activeTab === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{
              background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)",
              borderRadius: 12, padding: "12px 16px",
            }}>
              <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>
                ⚡ Yahan likhi settings <strong style={{ color: "var(--text)" }}>sabhi users</strong> ke AI responses mein apply hogi. Changes ~30 seconds mein live ho jate hain.
              </p>
            </div>

            {aiLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                <div className="spinner" />
              </div>
            ) : (
              <>
                {[
                  {
                    key: "personality" as const,
                    label: "🎭 Personality & Tone",
                    placeholder: `Udaaharan:\nTu Oplexa hai — India ka No.1 AI assistant. Tera andaaz friendly, confident, aur smart hai. Hinglish mein baat kar — seedhi baat, no bakwas. User ko feel ho ki ek dost help kar raha hai.`,
                    hint: "AI ka personality aur talking style define karo",
                    rows: 5,
                  },
                  {
                    key: "systemPrompt" as const,
                    label: "📋 System Instructions",
                    placeholder: `Udaaharan:\n- Hamesha accurate aur helpful reply do\n- Code ke saath explanation bhi do\n- Agar user Hindi mein pooche toh Hindi mein jawab do\n- Kabhi galat info mat do, agar pata nahi toh seedha bolo`,
                    hint: "AI ko kya karna chahiye, kaise karna chahiye — main instructions",
                    rows: 7,
                  },
                  {
                    key: "restrictions" as const,
                    label: "🚫 Restrictions",
                    placeholder: `Udaaharan:\n- Kisi bhi illegal activity mein help mat karo\n- Hateful ya offensive content mat banao\n- Personal information share mat karo`,
                    hint: "AI ko kya NAHI karna chahiye",
                    rows: 4,
                  },
                ].map(({ key, label, placeholder, hint, rows }) => (
                  <div key={key} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>{label}</p>
                    <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 10px" }}>{hint}</p>
                    <textarea
                      value={aiConfig[key]}
                      onChange={e => setAiConfig(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      rows={rows}
                      style={textareaStyle}
                    />
                  </div>
                ))}

                <button
                  onClick={saveAiConfig}
                  disabled={aiSaving}
                  style={{
                    padding: "14px", borderRadius: 12,
                    background: aiSaved ? "rgba(34,197,94,0.2)" : "var(--red)",
                    color: aiSaved ? "#4ade80" : "#fff",
                    fontSize: 15, fontWeight: 700, cursor: aiSaving ? "not-allowed" : "pointer",
                    opacity: aiSaving ? 0.7 : 1, transition: "all 0.3s",
                    border: aiSaved ? "1px solid rgba(34,197,94,0.4)" : "none",
                  } as any}
                >
                  {aiSaving ? "Saving..." : aiSaved ? "✓ Saved! Changes live in ~30s" : "Save AI Training"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={(updated) => {
            setUsersList(prev => prev.map(u => u.id === updated.id ? updated : u));
            setEditUser(null);
          }}
        />
      )}
    </div>
  );
}
