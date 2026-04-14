import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../lib/auth";
import { streamChat, ChatMessage } from "../lib/api";
import { fetchConversations, saveConversation, deleteConversation as apiDeleteConv, pinConversation as apiPinConv } from "../lib/conversations";
import ReactMarkdown from "react-markdown";

function CodeBlock({ inline, className, children }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");
  if (inline) return <code style={{ background:"rgba(255,255,255,0.08)",border:"1px solid var(--border)",borderRadius:"5px",padding:"1px 6px",fontFamily:"'Fira Mono','Consolas',monospace",fontSize:"13px",color:"#f87171" }}>{children}</code>;
  return (
    <div style={{ position:"relative",margin:"10px 0" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"#1a1a1a",borderRadius:"10px 10px 0 0",padding:"7px 14px",borderBottom:"1px solid var(--border)" }}>
        <span style={{ fontSize:"11px",color:"var(--text-dim)",fontFamily:"monospace" }}>{className?.replace("language-","") || "code"}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
          style={{ fontSize:"11px",fontWeight:"600",color:copied?"#4ade80":"var(--text-muted)",background:"rgba(255,255,255,0.06)",border:"1px solid var(--border)",borderRadius:"6px",padding:"3px 10px",cursor:"pointer",transition:"all 0.15s" }}
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <pre style={{ background:"#0d0d0d",border:"1px solid var(--border)",borderRadius:"0 0 10px 10px",padding:"14px 16px",overflowX:"auto",margin:0,borderTop:"none" }}>
        <code style={{ fontFamily:"'Fira Mono','Consolas',monospace",fontSize:"13px",color:"#e5e5e5" }}>{code}</code>
      </pre>
    </div>
  );
}

const MD_COMPONENTS = { code: CodeBlock };

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  pinned?: boolean;
}

function mkId() {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadConversations(): Conversation[] {
  try { return JSON.parse(localStorage.getItem("oplexa_convs") || "[]"); }
  catch { return []; }
}

function saveConversations(convs: Conversation[]) {
  localStorage.setItem("oplexa_convs", JSON.stringify(convs));
}

function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name} style={{ width:"32px",height:"32px",minWidth:"32px",borderRadius:"50%",objectFit:"cover",border:"2px solid var(--accent)",flexShrink:0 }} />
    );
  }
  return (
    <div style={{ width:"32px",height:"32px",minWidth:"32px",background:"var(--accent)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"700",color:"white",flexShrink:0 }}>
      {initials}
    </div>
  );
}

function OplexaAvatar() {
  return (
    <img
      src="/oplexa-avatar.jpg"
      alt="Oplexa"
      style={{ width:"32px",height:"32px",minWidth:"32px",borderRadius:"8px",objectFit:"cover",border:"1px solid var(--border)" }}
    />
  );
}

function ConvItem({ c, activeId, setActiveId, setSidebarOpen, pinConv, deleteConv }: {
  c: Conversation & { pinned?: boolean };
  activeId: string | null;
  setActiveId: (id: string) => void;
  setSidebarOpen: (v: boolean) => void;
  pinConv: (id: string, e: React.MouseEvent) => void;
  deleteConv: (id: string, e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isActive = activeId === c.id;
  return (
    <div
      onClick={() => { setActiveId(c.id); setSidebarOpen(false); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding:"9px 10px", borderRadius:"8px", cursor:"pointer", marginBottom:"2px",
        background: isActive ? "var(--surface2)" : hovered ? "rgba(255,255,255,0.04)" : "transparent",
        border: isActive ? "1px solid var(--border)" : "1px solid transparent",
        display:"flex", alignItems:"center", gap:"8px", transition:"background 0.15s",
      }}
    >
      {c.pinned && <span style={{ fontSize:"10px", flexShrink:0, opacity:0.6 }}>📌</span>}
      <span style={{ fontSize:"13px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,color:"var(--text)" }}>{c.title}</span>
      {(hovered || isActive) && (
        <div style={{ display:"flex",gap:"2px",flexShrink:0 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={e => pinConv(c.id, e)}
            title={c.pinned ? "Unpin" : "Pin"}
            style={{ width:"22px",height:"22px",borderRadius:"5px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",color:c.pinned?"var(--accent)":"var(--text-dim)",background:"transparent",transition:"background 0.1s" }}
            onMouseEnter={e => (e.currentTarget.style.background="rgba(255,255,255,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background="transparent")}
          >
            📌
          </button>
          <button
            onClick={e => deleteConv(c.id, e)}
            title="Delete"
            style={{ width:"22px",height:"22px",borderRadius:"5px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",color:"var(--text-dim)",background:"transparent",transition:"background 0.1s" }}
            onMouseEnter={e => (e.currentTarget.style.background="rgba(220,38,38,0.15)")}
            onMouseLeave={e => (e.currentTarget.style.background="transparent")}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const { user, token, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeId, setActiveId] = useState<string | null>(() => {
    const c = loadConversations(); return c[0]?.id ?? null;
  });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dbSyncedRef = useRef(false);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (!token || dbSyncedRef.current) return;
    dbSyncedRef.current = true;
    fetchConversations(token).then((dbConvs) => {
      if (dbConvs.length === 0) return;
      const merged = dbConvs.map(dc => ({
        id: dc.id,
        title: dc.title,
        messages: dc.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        createdAt: dc.createdAt,
        pinned: dc.pinned,
      } as Conversation));
      setConversations(merged);
      saveConversations(merged);
      setActiveId(prev => prev ?? merged[0]?.id ?? null);
    });
  }, [token]);

  const activeConv = conversations.find(c => c.id === activeId) ?? null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages.length, streamText]);

  const startNewChat = useCallback(() => {
    const conv: Conversation = { id: mkId(), title: "New Chat", messages: [], createdAt: Date.now() };
    const updated = [conv, ...conversations];
    setConversations(updated);
    saveConversations(updated);
    setActiveId(conv.id);
    setSidebarOpen(false);
  }, [conversations]);

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    const userText = input.trim();
    setInput("");
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }

    let convId = activeId;
    let convs = conversations;

    if (!convId) {
      const conv: Conversation = { id: mkId(), title: userText.slice(0, 40), messages: [], createdAt: Date.now() };
      convs = [conv, ...conversations];
      convId = conv.id;
      setConversations(convs);
      setActiveId(convId);
    }

    const userMsg: ChatMessage = { role: "user", content: userText };
    const updatedWithUser = convs.map(c =>
      c.id === convId ? { ...c, messages: [...c.messages, userMsg], title: c.messages.length === 0 ? userText.slice(0, 40) : c.title } : c
    );
    setConversations(updatedWithUser);
    saveConversations(updatedWithUser);

    setStreaming(true);
    setStreamText("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let full = "";
    let rafId: number | null = null;
    let pendingText = "";

    const flushText = () => {
      if (pendingText !== full) {
        pendingText = full;
        setStreamText(full);
      }
      rafId = null;
    };

    const scheduleFlush = () => {
      if (!rafId) rafId = requestAnimationFrame(flushText);
    };

    try {
      const conv = updatedWithUser.find(c => c.id === convId)!;
      await streamChat(
        conv.messages,
        chunk => { full += chunk; scheduleFlush(); },
        ctrl.signal,
        errMsg => { full = errMsg; scheduleFlush(); }
      );
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        full = `Sorry, something went wrong: ${(err as Error)?.message || "Unknown error"}. Please try again.`;
      }
    }

    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    setStreamText(full);

    const aiMsg: ChatMessage = { role: "assistant", content: full || "No response received. Please try again." };
    const finalConvs = updatedWithUser.map(c =>
      c.id === convId ? { ...c, messages: [...c.messages, aiMsg] } : c
    );
    setConversations(finalConvs);
    saveConversations(finalConvs);

    if (token) {
      const savedConv = finalConvs.find(c => c.id === convId);
      if (savedConv) {
        saveConversation(token, {
          id: savedConv.id,
          title: savedConv.title,
          pinned: savedConv.pinned ?? false,
          createdAt: savedConv.createdAt,
          updatedAt: Date.now(),
          messages: savedConv.messages.map((m, i) => ({ id: String(i), role: m.role as "user" | "assistant", content: m.content, createdAt: savedConv.createdAt + i })),
        });
      }
    }

    setStreamText("");
    setStreaming(false);
    abortRef.current = null;
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function deleteConv(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    saveConversations(updated);
    if (activeId === id) setActiveId(updated[0]?.id ?? null);
    if (token) apiDeleteConv(token, id);
  }

  function pinConv(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const conv = conversations.find(c => c.id === id);
    const newPinned = !conv?.pinned;
    const updated = conversations.map(c => c.id === id ? { ...c, pinned: newPinned } : c);
    setConversations(updated);
    saveConversations(updated);
    if (token) apiPinConv(token, id, newPinned);
  }

  const displayMessages = activeConv?.messages ?? [];
  const userInitials = user?.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "U";

  const filteredConvs = conversations.filter(c =>
    searchQuery.trim() === "" ||
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const pinnedConvs = filteredConvs.filter(c => c.pinned);
  const unpinnedConvs = filteredConvs.filter(c => !c.pinned);

  const sidebar = (
    <div style={{
      width:"260px", minWidth:"260px", background:"var(--surface)", borderRight:"1px solid var(--border)",
      display:"flex", flexDirection:"column", height:"100%",
      ...(isMobile ? { position:"fixed",left:sidebarOpen?"0":"-260px",top:0,bottom:0,height:"100dvh",zIndex:30,transition:"left 0.25s ease" } : {}),
    }}>
      <div style={{ padding:"16px", borderBottom:"1px solid var(--border)" }}>
        <div style={{ display:"flex", alignItems:"center", marginBottom:"12px" }}>
          <img src="/oplexa-logo-text.png" alt="Oplexa" style={{ height:"30px", objectFit:"contain" }} />
        </div>
        <button onClick={startNewChat} style={{ width:"100%",padding:"10px 14px",background:"var(--accent-light)",border:"1px solid rgba(220,38,38,0.25)",borderRadius:"9px",color:"var(--accent)",fontSize:"14px",fontWeight:"600",display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px" }}>
          <span style={{ fontSize:"18px", lineHeight:1 }}>+</span> New Chat
        </button>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",fontSize:"14px",color:"var(--text-dim)",pointerEvents:"none" }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            style={{
              width:"100%", padding:"8px 10px 8px 32px",
              background:"var(--surface2)", border:"1px solid var(--border)",
              borderRadius:"8px", color:"var(--text)", fontSize:"13px",
              outline:"none", fontFamily:"inherit",
            }}
            onFocus={e => e.target.style.borderColor="var(--accent)"}
            onBlur={e => e.target.style.borderColor="var(--border)"}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{ position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",color:"var(--text-dim)",fontSize:"14px",lineHeight:1 }}>×</button>
          )}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
        {conversations.length === 0 ? (
          <p style={{ textAlign:"center",color:"var(--text-dim)",fontSize:"13px",padding:"24px 12px" }}>No conversations yet</p>
        ) : filteredConvs.length === 0 ? (
          <p style={{ textAlign:"center",color:"var(--text-dim)",fontSize:"13px",padding:"24px 12px" }}>No results found</p>
        ) : (
          <>
            {pinnedConvs.length > 0 && (
              <>
                <div style={{ padding:"4px 8px 2px",fontSize:"10px",fontWeight:"700",color:"var(--text-dim)",letterSpacing:"0.8px",textTransform:"uppercase",display:"flex",alignItems:"center",gap:"5px" }}>
                  <span>📌</span> Pinned
                </div>
                {pinnedConvs.map(c => <ConvItem key={c.id} c={c} activeId={activeId} setActiveId={setActiveId} setSidebarOpen={setSidebarOpen} pinConv={pinConv} deleteConv={deleteConv} />)}
                {unpinnedConvs.length > 0 && (
                  <div style={{ padding:"8px 8px 2px",fontSize:"10px",fontWeight:"700",color:"var(--text-dim)",letterSpacing:"0.8px",textTransform:"uppercase" }}>
                    Chats
                  </div>
                )}
              </>
            )}
            {unpinnedConvs.map(c => <ConvItem key={c.id} c={c} activeId={activeId} setActiveId={setActiveId} setSidebarOpen={setSidebarOpen} pinConv={pinConv} deleteConv={deleteConv} />)}
          </>
        )}
      </div>

      <div style={{ padding:"12px", borderTop:"1px solid var(--border)" }}>
        <button onClick={() => setLocation("/profile")} style={{ width:"100%",display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",borderRadius:"9px",background:"var(--surface2)",border:"1px solid var(--border)" }}>
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="avatar" style={{ width:"32px",height:"32px",borderRadius:"50%",objectFit:"cover",flexShrink:0 }} />
            : <div style={{ width:"32px",height:"32px",background:"var(--accent)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"700",color:"white",flexShrink:0 }}>{userInitials}</div>
          }
          <div style={{ flex:1,textAlign:"left",overflow:"hidden" }}>
            <div style={{ fontSize:"14px",fontWeight:"600",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user?.name}</div>
            <div style={{ fontSize:"11px",color:"var(--text-dim)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user?.email}</div>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", height:"100dvh", background:"var(--bg)", overflow:"hidden" }}>
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:20 }} />
      )}

      {sidebar}

      <div style={{ flex:1, display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
        <div style={{ padding:"10px 16px", borderBottom:"2px solid var(--accent)", display:"flex", alignItems:"center", gap:"10px", background:"#1a0000", minHeight:"54px", flexShrink:0 }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ width:"38px",height:"38px",color:"#ffffff",fontSize:"24px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:"rgba(220,38,38,0.18)",borderRadius:"8px",border:"1px solid rgba(220,38,38,0.3)" }}>☰</button>
          )}
          <div style={{ display:"flex",alignItems:"center",flex:1,overflow:"hidden" }}>
            <img src="/oplexa-logo-text.png" alt="Oplexa" style={{ height:"28px", objectFit:"contain", maxWidth:"140px" }} />
          </div>
          <button onClick={() => setLocation("/profile")} style={{ width:"36px",height:"36px",background:"var(--accent)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:"700",color:"white",flexShrink:0,overflow:"hidden",padding:0,border:"2px solid rgba(255,255,255,0.2)" }}>
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="avatar" style={{ width:"36px",height:"36px",objectFit:"cover" }} />
              : userInitials
            }
          </button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"24px 20px", display:"flex", flexDirection:"column", gap:"20px" }}>
          {displayMessages.length === 0 && !streaming && (
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:"12px",textAlign:"center" }}>
              <img src="/oplexa-logo.jpg" alt="Oplexa" style={{ width:"80px",height:"80px",borderRadius:"24px",objectFit:"cover" }} />
              <h2 style={{ fontSize:"24px", fontWeight:"700" }}>How can I help you today?</h2>
              <p style={{ color:"var(--text-muted)", fontSize:"14px", maxWidth:"320px" }}>Ask me anything. I'm Oplexa, your AI assistant powered by advanced language models.</p>
            </div>
          )}

          {displayMessages.map((msg, i) => (
            <div key={i} className="fade-up" style={{ display:"flex", gap:"12px", flexDirection:msg.role==="user"?"row-reverse":"row", alignItems:"flex-start" }}>
              {msg.role === "user" ? <UserAvatar name={user?.name ?? "U"} avatarUrl={user?.avatarUrl} /> : <OplexaAvatar />}
              <div style={{
                maxWidth:"78%", padding: msg.role==="user" ? "10px 16px" : "14px 18px",
                borderRadius: msg.role==="user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                background: msg.role==="user" ? "var(--accent)" : "var(--surface2)",
                border: msg.role==="assistant" ? "1px solid var(--border)" : "none",
              }}>
                {msg.role === "user" ? (
                  <span style={{ fontSize:"15px", lineHeight:"1.6", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                    {msg.content}
                  </span>
                ) : (
                  <div className="md-content">
                    <ReactMarkdown components={MD_COMPONENTS}>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {streaming && (
            <div className="fade-up" style={{ display:"flex", gap:"12px", alignItems:"flex-start" }}>
              <OplexaAvatar />
              <div style={{ maxWidth:"78%",padding:"14px 18px",borderRadius:"4px 18px 18px 18px",background:"var(--surface2)",border:"1px solid var(--border)" }}>
                {streamText
                  ? <div className="md-content">
                      <ReactMarkdown components={MD_COMPONENTS}>{streamText}</ReactMarkdown>
                      <span className="cursor" />
                    </div>
                  : <div style={{ display:"flex",gap:"5px",alignItems:"center",padding:"4px 0" }}>
                      {[0,1,2].map(i => <div key={i} style={{ width:"7px",height:"7px",borderRadius:"50%",background:"var(--text-dim)",animation:`blink 1.2s ${i*0.3}s infinite` }} />)}
                    </div>
                }
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding:"14px 20px", background:"var(--surface)", borderTop:"1px solid var(--border)" }}>
          <div style={{ display:"flex",gap:"10px",alignItems:"center",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"14px",padding:"10px 14px" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Message Oplexa..."
              rows={1}
              disabled={streaming}
              style={{ flex:1,background:"none",color:"var(--text)",fontSize:"15px",resize:"none",maxHeight:"120px",overflow:"auto",lineHeight:"1.5",border:"none",fontFamily:"inherit" }}
              onInput={e => { const t = e.currentTarget; t.style.height="auto"; t.style.height=Math.min(t.scrollHeight,120)+"px"; }}
            />
            <button
              onClick={streaming ? () => { abortRef.current?.abort(); setStreaming(false); setStreamText(""); } : sendMessage}
              disabled={!streaming && !input.trim()}
              style={{
                width:"36px",height:"36px",minWidth:"36px",borderRadius:"9px",
                background: streaming ? "var(--surface2)" : (input.trim() ? "var(--accent)" : "var(--surface2)"),
                border: `1px solid ${streaming || !input.trim() ? "var(--border)" : "transparent"}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                color: input.trim() || streaming ? "white" : "var(--text-dim)",
                fontSize:"18px",transition:"all 0.15s",
              }}
            >
              {streaming ? "⬛" : "↑"}
            </button>
          </div>
          <p style={{ textAlign:"center",fontSize:"11px",color:"var(--accent)",marginTop:"8px",fontWeight:"600",letterSpacing:"0.02em",width:"100%",display:"block" }}>
            India's No.1 First AI — Oplexa
          </p>
        </div>
      </div>
    </div>
  );
}
