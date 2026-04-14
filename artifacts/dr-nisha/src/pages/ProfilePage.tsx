import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth, getToken } from "../lib/auth";

const SOCIAL = [
  { icon: "𝐟", label: "Facebook", url: "https://facebook.com/oplexaai", handle: "/oplexaai" },
  { icon: "📸", label: "Instagram", url: "https://instagram.com/oplexaai", handle: "/oplexaai" },
  { icon: "𝕏", label: "Twitter / X", url: "https://twitter.com/oplexaai", handle: "/oplexaai" },
  { icon: "▶", label: "YouTube", url: "https://youtube.com/@oplexaai", handle: "@oplexaai" },
  { icon: "in", label: "LinkedIn", url: "https://linkedin.com/company/oplexaai", handle: "/oplexaai" },
];

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [passMsg, setPassMsg] = useState("");
  const [passErr, setPassErr] = useState("");

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatarPreview(dataUrl);
      try {
        const r = await fetch("/api/auth/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ avatarUrl: dataUrl }),
        });
        const data = await r.json();
        if (r.ok) setUser(data.user);
      } catch {}
      setAvatarUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveMsg("");
    try {
      const r = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name, phone, bio }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || data.error);
      setUser(data.user);
      setSaveMsg("Profile updated successfully!");
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPassErr(""); setPassMsg("");
    if (newPass.length < 6) { setPassErr("New password must be at least 6 characters"); return; }
    setChangingPass(true);
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ currentPassword: oldPass, newPassword: newPass }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || data.error);
      setOldPass(""); setNewPass("");
      setPassMsg("Password changed successfully!");
    } catch (err) {
      setPassErr(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setChangingPass(false);
      setTimeout(() => setPassMsg(""), 3000);
    }
  }

  const initials = user?.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "U";
  const memberYear = user?.createdAt ? new Date(user.createdAt).getFullYear() : (user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear());

  return (
    <div style={{ background:"var(--bg)", minHeight:"100vh", overflowY:"auto" }}>
      <div style={{ maxWidth:"560px", margin:"0 auto", padding:"24px 20px 60px" }}>

        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"28px" }}>
          <button onClick={() => setLocation("/")} style={{ color:"var(--text-muted)",fontSize:"20px",display:"flex",alignItems:"center",justifyContent:"center",width:"36px",height:"36px" }}>←</button>
          <h1 style={{ fontSize:"20px", fontWeight:"700" }}>Profile</h1>
          <div style={{ flex:1 }} />
          <button onClick={() => { logout(); setLocation("/auth"); }} style={{ color:"var(--accent)",fontSize:"14px",fontWeight:"600",padding:"8px 16px",border:"1px solid rgba(220,38,38,0.3)",borderRadius:"8px" }}>
            Sign Out
          </button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"12px", padding:"28px 24px", background:"var(--surface)", borderRadius:"16px", border:"1px solid var(--border)", marginBottom:"20px" }}>
          <div style={{ position:"relative" }}>
            {avatarPreview
              ? <img src={avatarPreview} alt="avatar" style={{ width:"90px",height:"90px",borderRadius:"50%",objectFit:"cover",border:"2px solid var(--border)" }} />
              : <div style={{ width:"90px",height:"90px",background:"var(--accent)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"32px",fontWeight:"700",color:"white" }}>{initials}</div>
            }
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              style={{ position:"absolute",bottom:"0",right:"0",width:"28px",height:"28px",background:"var(--accent)",border:"2px solid var(--bg)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",color:"white",cursor:"pointer" }}
            >
              {avatarUploading ? "…" : "📷"}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display:"none" }} />
          </div>
          <div style={{ textAlign:"center" }}>
            <p style={{ fontSize:"20px", fontWeight:"700" }}>{user?.name}</p>
            <p style={{ fontSize:"14px", color:"var(--text-muted)", marginTop:"4px" }}>{user?.email}</p>
          </div>
          <div style={{ display:"flex", gap:"24px", marginTop:"8px" }}>
            <div style={{ textAlign:"center" }}>
              <p style={{ fontSize:"11px", color:"var(--text-muted)" }}>VERSION</p>
              <p style={{ fontSize:"14px", fontWeight:"600", color:"var(--accent)" }}>Oplexa 1.1</p>
            </div>
            <div style={{ textAlign:"center" }}>
              <p style={{ fontSize:"11px", color:"var(--text-muted)" }}>MEMBER SINCE</p>
              <p style={{ fontSize:"14px", fontWeight:"600" }}>{memberYear}</p>
            </div>
          </div>
        </div>

        <form onSubmit={saveProfile} style={{ background:"var(--surface)",borderRadius:"16px",border:"1px solid var(--border)",padding:"24px",marginBottom:"20px" }}>
          <h2 style={{ fontSize:"16px", fontWeight:"700", marginBottom:"20px" }}>Personal Info</h2>
          <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
            <div>
              <label style={{ fontSize:"13px",color:"var(--text-muted)",display:"block",marginBottom:"6px" }}>Full Name</label>
              <input className="oplexa-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label style={{ fontSize:"13px",color:"var(--text-muted)",display:"block",marginBottom:"6px" }}>Phone</label>
              <input className="oplexa-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 xxxxx xxxxx" type="tel" />
            </div>
            <div>
              <label style={{ fontSize:"13px",color:"var(--text-muted)",display:"block",marginBottom:"6px" }}>Bio</label>
              <textarea className="oplexa-input" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} style={{ resize:"vertical" }} />
            </div>
          </div>
          {saveMsg && (
            <div style={{ marginTop:"12px",padding:"10px 14px",borderRadius:"8px",fontSize:"14px",background:saveMsg.includes("success")?"rgba(34,197,94,0.1)":"rgba(220,38,38,0.1)",border:`1px solid ${saveMsg.includes("success")?"rgba(34,197,94,0.3)":"rgba(220,38,38,0.3)"}`,color:saveMsg.includes("success")?"#4ade80":"#f87171" }}>
              {saveMsg}
            </div>
          )}
          <button className="oplexa-btn" type="submit" disabled={saving} style={{ marginTop:"16px" }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        <form onSubmit={changePassword} style={{ background:"var(--surface)",borderRadius:"16px",border:"1px solid var(--border)",padding:"24px",marginBottom:"20px" }}>
          <h2 style={{ fontSize:"16px", fontWeight:"700", marginBottom:"20px" }}>Change Password</h2>
          <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
            <div>
              <label style={{ fontSize:"13px",color:"var(--text-muted)",display:"block",marginBottom:"6px" }}>Current Password</label>
              <input className="oplexa-input" type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="••••••••" required />
            </div>
            <div>
              <label style={{ fontSize:"13px",color:"var(--text-muted)",display:"block",marginBottom:"6px" }}>New Password</label>
              <input className="oplexa-input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min 6 characters" required minLength={6} />
            </div>
          </div>
          {passErr && <div style={{ marginTop:"12px",padding:"10px 14px",borderRadius:"8px",fontSize:"14px",background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.3)",color:"#f87171" }}>{passErr}</div>}
          {passMsg && <div style={{ marginTop:"12px",padding:"10px 14px",borderRadius:"8px",fontSize:"14px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",color:"#4ade80" }}>{passMsg}</div>}
          <button className="oplexa-btn" type="submit" disabled={changingPass} style={{ marginTop:"16px" }}>
            {changingPass ? "Changing..." : "Change Password"}
          </button>
        </form>

        <div style={{ background:"var(--surface)",borderRadius:"16px",border:"1px solid var(--border)",padding:"20px",marginBottom:"20px" }}>
          <p style={{ fontSize:"12px",fontWeight:"700",color:"var(--text-dim)",letterSpacing:"0.8px",textTransform:"uppercase",marginBottom:"14px" }}>About</p>
          {[
            { icon:"ℹ️", label:"About Oplexa", value:"AI Assistant v1.1" },
            { icon:"✉️", label:"Contact Us", value:"contact@oplexa.in", href:"mailto:contact@oplexa.in" },
            { icon:"🌐", label:"Website", value:"oplexa.in", href:"https://oplexa.in" },
          ].map(({ icon, label, value, href }) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" style={{ display:"flex",alignItems:"center",gap:"12px",padding:"10px 0",borderBottom:"1px solid var(--border)",textDecoration:"none",color:"inherit" }}>
              <span style={{ fontSize:"16px",width:"24px",textAlign:"center" }}>{icon}</span>
              <span style={{ flex:1,fontSize:"14px" }}>{label}</span>
              <span style={{ fontSize:"13px",color:"var(--text-muted)" }}>{value}</span>
              {href && <span style={{ color:"var(--text-dim)",fontSize:"12px" }}>→</span>}
            </a>
          ))}
        </div>

        <div style={{ background:"var(--surface)",borderRadius:"16px",border:"1px solid var(--border)",padding:"20px",marginBottom:"20px" }}>
          <p style={{ fontSize:"12px",fontWeight:"700",color:"var(--text-dim)",letterSpacing:"0.8px",textTransform:"uppercase",marginBottom:"14px" }}>Follow Us</p>
          {SOCIAL.map(({ icon, label, url, handle }) => (
            <a key={label} href={url} target="_blank" rel="noreferrer" style={{ display:"flex",alignItems:"center",gap:"12px",padding:"10px 0",borderBottom:"1px solid var(--border)",textDecoration:"none",color:"inherit" }}>
              <span style={{ fontSize:"15px",fontWeight:"700",width:"24px",textAlign:"center",color:"var(--accent)" }}>{icon}</span>
              <span style={{ flex:1,fontSize:"14px" }}>{label}</span>
              <span style={{ fontSize:"13px",color:"var(--text-muted)" }}>{handle}</span>
              <span style={{ color:"var(--text-dim)",fontSize:"12px" }}>→</span>
            </a>
          ))}
        </div>

        <div style={{ textAlign:"center", padding:"24px 0", color:"var(--text-dim)" }}>
          <p style={{ fontSize:"13px",marginBottom:"4px" }}>Designed & Developed by</p>
          <p style={{ fontSize:"18px",fontWeight:"700",color:"var(--accent)",marginBottom:"6px" }}>Niskutech</p>
          <p style={{ fontSize:"12px" }}>Oplexa v1.1 • © 2025 Niskutech. All rights reserved.</p>
        </div>

      </div>
    </div>
  );
}
