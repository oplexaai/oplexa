import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth, getToken } from "../lib/auth";

const SOCIAL = [
  { icon: "📘", label: "Facebook", url: "https://facebook.com/oplexaai" },
  { icon: "📸", label: "Instagram", url: "https://instagram.com/oplexaai" },
  { icon: "𝕏", label: "Twitter / X", url: "https://twitter.com/oplexaai" },
  { icon: "▶", label: "YouTube", url: "https://youtube.com/@oplexaai" },
  { icon: "💼", label: "LinkedIn", url: "https://linkedin.com/company/oplexaai" },
];

function SectionHeader({ title }: { title: string }) {
  return (
    <p style={{ fontSize:"11px",fontWeight:"600",color:"var(--text-dim)",letterSpacing:"1px",textTransform:"uppercase",padding:"0 4px",marginBottom:"6px",marginTop:"24px" }}>
      {title}
    </p>
  );
}

function RowItem({ icon, label, value, valueColor, chevron = true, onClick, href }: {
  icon: string; label: string; value?: string; valueColor?: string;
  chevron?: boolean; onClick?: () => void; href?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const el = (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:"flex", alignItems:"center", gap:"12px", padding:"13px 16px",
        borderBottom:"1px solid var(--border)", cursor:onClick||href?"pointer":"default",
        background: hovered && (onClick||href) ? "rgba(255,255,255,0.03)" : "transparent",
        transition:"background 0.15s",
      }}
    >
      <div style={{ width:"32px",height:"32px",borderRadius:"8px",background:"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",flexShrink:0 }}>
        {icon}
      </div>
      <span style={{ flex:1,fontSize:"15px",color:"var(--text)" }}>{label}</span>
      {value && <span style={{ fontSize:"14px",color:valueColor||"var(--text-muted)",maxWidth:"45%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right" }}>{value}</span>}
      {chevron && (onClick||href) && <span style={{ color:"var(--text-dim)",fontSize:"13px",marginLeft:"4px" }}>›</span>}
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration:"none",color:"inherit" }}>{el}</a>;
  return el;
}

interface EditModalProps {
  title: string; value: string; multiline?: boolean;
  onClose: () => void; onSave: (v: string) => void;
}

function EditModal({ title, value, multiline, onClose, onSave }: EditModalProps) {
  const [text, setText] = useState(value);
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
      <div style={{ background:"var(--surface)",borderRadius:"20px",border:"1px solid var(--border)",padding:"24px",width:"100%",maxWidth:"400px" }}>
        <p style={{ fontSize:"18px",fontWeight:"700",marginBottom:"16px" }}>{title}</p>
        {multiline
          ? <textarea value={text} onChange={e => setText(e.target.value)} rows={4} autoFocus className="oplexa-input" style={{ resize:"vertical",marginBottom:"16px",display:"block",width:"100%",fontFamily:"inherit" }} />
          : <input value={text} onChange={e => setText(e.target.value)} autoFocus className="oplexa-input" style={{ marginBottom:"16px",display:"block",width:"100%" }} />
        }
        <div style={{ display:"flex",gap:"12px" }}>
          <button onClick={onClose} style={{ flex:1,padding:"13px",borderRadius:"12px",background:"var(--surface2)",color:"var(--text)",fontWeight:"600",fontSize:"15px",border:"none",cursor:"pointer" }}>Cancel</button>
          <button onClick={() => onSave(text)} className="oplexa-btn" style={{ flex:1,padding:"13px",borderRadius:"12px",fontSize:"15px" }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function PasswordModal({ onClose, onSave }: { onClose: () => void; onSave: (cur: string, next: string) => void }) {
  const [cur, setCur] = useState(""); const [next, setNext] = useState(""); const [conf, setConf] = useState("");
  const [err, setErr] = useState("");
  function handle() {
    if (!cur || !next || !conf) { setErr("All fields required"); return; }
    if (next !== conf) { setErr("Passwords don't match"); return; }
    if (next.length < 6) { setErr("Minimum 6 characters"); return; }
    onSave(cur, next);
  }
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
      <div style={{ background:"var(--surface)",borderRadius:"20px",border:"1px solid var(--border)",padding:"24px",width:"100%",maxWidth:"400px" }}>
        <p style={{ fontSize:"18px",fontWeight:"700",marginBottom:"16px" }}>Change Password</p>
        {[["Current Password",cur,setCur],["New Password",next,setNext],["Confirm New Password",conf,setConf]].map(([ph, v, set]) => (
          <input key={ph as string} type="password" value={v as string} onChange={e => (set as any)(e.target.value)} placeholder={ph as string} className="oplexa-input" style={{ marginBottom:"10px",display:"block",width:"100%" }} />
        ))}
        {err && <p style={{ color:"#f87171",fontSize:"13px",marginBottom:"10px" }}>{err}</p>}
        <div style={{ display:"flex",gap:"12px",marginTop:"6px" }}>
          <button onClick={onClose} style={{ flex:1,padding:"13px",borderRadius:"12px",background:"var(--surface2)",color:"var(--text)",fontWeight:"600",fontSize:"15px",border:"none",cursor:"pointer" }}>Cancel</button>
          <button onClick={handle} className="oplexa-btn" style={{ flex:1,padding:"13px",borderRadius:"12px",fontSize:"15px" }}>Update</button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editField, setEditField] = useState<null | { title: string; key: "name"|"phone"|"bio"; multiline?: boolean }>(null);
  const [showPwModal, setShowPwModal] = useState(false);

  const initials = user?.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "U";
  const memberYear = user?.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();
  const chatCount = (() => { try { return JSON.parse(localStorage.getItem("oplexa_convs") || "[]").length; } catch { return 0; } })();

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatarPreview(dataUrl);
      try {
        const r = await fetch("/api/auth/profile", { method:"PATCH", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` }, body:JSON.stringify({ avatarUrl: dataUrl }) });
        const data = await r.json(); if (r.ok) setUser(data.user);
      } catch {}
      setAvatarUploading(false);
    };
    reader.readAsDataURL(file); e.target.value = "";
  }

  async function saveField(val: string) {
    if (!editField) return;
    setSaving(true);
    try {
      const r = await fetch("/api/auth/profile", { method:"PATCH", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` }, body:JSON.stringify({ [editField.key]: val }) });
      const data = await r.json(); if (r.ok) setUser(data.user);
    } catch {}
    setSaving(false); setEditField(null);
  }

  async function changePassword(cur: string, next: string) {
    try {
      const r = await fetch("/api/auth/change-password", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` }, body:JSON.stringify({ currentPassword: cur, newPassword: next }) });
      const data = await r.json();
      if (!r.ok) alert(data.message || "Failed");
      else { setShowPwModal(false); alert("Password updated!"); }
    } catch {}
  }

  return (
    <div style={{ height:"100dvh", background:"var(--bg)", display:"flex", flexDirection:"column", overflow:"hidden" }}>

      <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, background:"var(--bg)" }}>
        <button onClick={() => setLocation("/")} style={{ width:"40px",height:"40px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"12px",background:"transparent",border:"none",color:"var(--text)",fontSize:"22px" }}>←</button>
        <span style={{ fontSize:"17px",fontWeight:"700",color:"var(--text)" }}>Profile</span>
        <div style={{ width:"40px" }} />
      </div>

      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" } as any}>
        <div style={{ maxWidth:"560px", margin:"0 auto", padding:"0 16px 48px" }}>

          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",paddingTop:"28px",paddingBottom:"20px",gap:"4px" }}>
            <div style={{ position:"relative",marginBottom:"14px" }}>
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" style={{ width:"90px",height:"90px",borderRadius:"50%",objectFit:"cover",border:"2px solid var(--border)" }} />
                : <div style={{ width:"90px",height:"90px",background:"var(--accent)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"32px",fontWeight:"700",color:"white" }}>{initials}</div>
              }
              <button onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
                style={{ position:"absolute",bottom:0,right:0,width:"28px",height:"28px",background:"var(--accent)",border:"2px solid var(--bg)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",color:"white",cursor:"pointer" }}>
                {avatarUploading ? "…" : "📷"}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display:"none" }} />
            </div>
            <p style={{ fontSize:"22px",fontWeight:"700",color:"var(--text)" }}>{user?.name}</p>
            <p style={{ fontSize:"14px",color:"var(--text-muted)",marginTop:"2px" }}>{user?.email}</p>
          </div>

          <div style={{ display:"flex",borderRadius:"16px",border:"1px solid var(--border)",overflow:"hidden",background:"var(--surface)",marginBottom:"8px" }}>
            {[["Oplexa 1.1","AI"],[String(chatCount),"Chats"],[String(memberYear),"Member"]].map(([val,lbl],i,arr) => (
              <div key={lbl} style={{ flex:1,textAlign:"center",padding:"14px 8px",borderRight:i<arr.length-1?"1px solid var(--border)":"none" }}>
                <p style={{ fontSize:"15px",fontWeight:"700",color:lbl==="AI"?"var(--accent)":"var(--text)" }}>{val}</p>
                <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px",textTransform:"uppercase",letterSpacing:"0.5px" }}>{lbl}</p>
              </div>
            ))}
          </div>

          <SectionHeader title="PERSONAL INFO" />
          <div style={{ borderRadius:"16px",border:"1px solid var(--border)",overflow:"hidden",background:"var(--surface)" }}>
            <RowItem icon="👤" label="Display Name" value={user?.name} onClick={() => setEditField({ title:"Display Name", key:"name" })} />
            <RowItem icon="✉️" label="Email" value={user?.email} chevron={false} />
            <RowItem icon="📞" label="Phone" value={user?.phone || "Add phone"} onClick={() => setEditField({ title:"Phone Number", key:"phone" })} />
            <RowItem icon="📝" label="Bio" value={user?.bio || "Add a bio..."} onClick={() => setEditField({ title:"Bio", key:"bio", multiline:true })} />
          </div>

          <SectionHeader title="ACCOUNT" />
          <div style={{ borderRadius:"16px",border:"1px solid var(--border)",overflow:"hidden",background:"var(--surface)" }}>
            <RowItem icon="🔒" label="Change Password" onClick={() => setShowPwModal(true)} />
            {user?.isAdmin && (
              <RowItem icon="⚙️" label="Admin Panel" value="Manage" valueColor="var(--accent)" onClick={() => setLocation("/admin")} />
            )}
          </div>

          <SectionHeader title="APP" />
          <div style={{ borderRadius:"16px",border:"1px solid var(--border)",overflow:"hidden",background:"var(--surface)" }}>
            <RowItem icon="🤖" label="AI Model" value="Oplexa 1.1" valueColor="var(--accent)" chevron={false} />
            <RowItem icon="🛡️" label="Security" value="Oplexa Security" valueColor="#22c55e" chevron={false} />
          </div>

          <button onClick={() => { logout(); setLocation("/auth"); }}
            style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",width:"100%",marginTop:"24px",padding:"15px",borderRadius:"14px",border:"1.5px solid var(--accent)",background:"transparent",color:"var(--accent)",fontSize:"16px",fontWeight:"600",cursor:"pointer" }}>
            ⬡ Sign Out
          </button>

          <SectionHeader title="ABOUT" />
          <div style={{ borderRadius:"16px",border:"1px solid var(--border)",overflow:"hidden",background:"var(--surface)" }}>
            <RowItem icon="ℹ️" label="About Oplexa" value="AI Assistant v1.1" chevron={false} />
            <RowItem icon="✉️" label="Contact Us" value="contact@oplexa.in" href="mailto:contact@oplexa.in" />
            <RowItem icon="🌐" label="Website" value="oplexa.in" href="https://oplexa.in" />
          </div>

          <SectionHeader title="FOLLOW US" />
          <div style={{ borderRadius:"16px",border:"1px solid var(--border)",overflow:"hidden",background:"var(--surface)" }}>
            {SOCIAL.map(({ icon, label, url }) => (
              <RowItem key={label} icon={icon} label={label} href={url} />
            ))}
          </div>

          <div style={{ textAlign:"center",paddingTop:"32px",paddingBottom:"8px" }}>
            <p style={{ fontSize:"12px",color:"var(--text-muted)" }}>Designed & Developed by</p>
            <p style={{ fontSize:"16px",fontWeight:"700",color:"var(--accent)",marginTop:"4px" }}>Niskutech</p>
            <p style={{ fontSize:"11px",color:"var(--text-dim)",marginTop:"4px" }}>Oplexa v1.1 • © 2026 Niskutech. All rights reserved.</p>
          </div>

        </div>
      </div>

      {editField && (
        <EditModal title={editField.title} value={(user as any)?.[editField.key] || ""} multiline={editField.multiline}
          onClose={() => setEditField(null)} onSave={saveField} />
      )}
      {saving && <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center" }}><div style={{ width:"40px",height:"40px",border:"3px solid var(--accent)",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite" }} /></div>}
      {showPwModal && <PasswordModal onClose={() => setShowPwModal(false)} onSave={changePassword} />}
    </div>
  );
}
