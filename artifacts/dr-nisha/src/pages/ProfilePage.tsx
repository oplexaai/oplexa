import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../lib/auth";
import { getToken } from "../lib/auth";

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [passMsg, setPassMsg] = useState("");
  const [passErr, setPassErr] = useState("");

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveMsg("");
    try {
      const r = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` },
        body: JSON.stringify({ name, phone, bio }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message);
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
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` },
        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message);
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
  const memberYear = user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear();

  return (
    <div style={{ background:"var(--bg)", minHeight:"100vh", overflowY:"auto" }}>
      <div style={{ maxWidth:"560px", margin:"0 auto", padding:"24px 20px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"28px" }}>
          <button onClick={() => setLocation("/")} style={{ color:"var(--text-muted)",fontSize:"20px",display:"flex",alignItems:"center",justifyContent:"center",width:"36px",height:"36px" }}>←</button>
          <h1 style={{ fontSize:"20px", fontWeight:"700" }}>Profile</h1>
          <div style={{ flex:1 }} />
          <button onClick={() => { logout(); setLocation("/auth"); }} style={{ color:"var(--accent)",fontSize:"14px",fontWeight:"600",padding:"8px 16px",border:"1px solid rgba(220,38,38,0.3)",borderRadius:"8px" }}>
            Sign Out
          </button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"12px", padding:"28px 24px", background:"var(--surface)", borderRadius:"16px", border:"1px solid var(--border)", marginBottom:"20px" }}>
          <div style={{ width:"80px",height:"80px",background:"var(--accent)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px",fontWeight:"700",color:"white" }}>
            {initials}
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
          {passErr && (
            <div style={{ marginTop:"12px",padding:"10px 14px",borderRadius:"8px",fontSize:"14px",background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.3)",color:"#f87171" }}>{passErr}</div>
          )}
          {passMsg && (
            <div style={{ marginTop:"12px",padding:"10px 14px",borderRadius:"8px",fontSize:"14px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",color:"#4ade80" }}>{passMsg}</div>
          )}
          <button className="oplexa-btn" type="submit" disabled={changingPass} style={{ marginTop:"16px" }}>
            {changingPass ? "Changing..." : "Change Password"}
          </button>
        </form>

        <div style={{ background:"var(--surface)",borderRadius:"16px",border:"1px solid var(--border)",padding:"24px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
            <div style={{ width:"36px",height:"36px",background:"var(--accent-light)",border:"1px solid rgba(220,38,38,0.2)",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px" }}>🔒</div>
            <div>
              <p style={{ fontSize:"14px",fontWeight:"600" }}>Oplexa Security</p>
              <p style={{ fontSize:"12px",color:"var(--text-muted)" }}>Your data is encrypted and secure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
