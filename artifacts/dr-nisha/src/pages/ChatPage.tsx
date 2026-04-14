import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../lib/auth";
import { streamChat, ChatMessage } from "../lib/api";

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
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

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width:"32px",height:"32px",minWidth:"32px",background:"var(--accent)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"700",color:"white" }}>
      {initials}
    </div>
  );
}

function OplexaAvatar() {
  return (
    <img
      src="/oplexa-logo.jpg"
      alt="Oplexa"
      style={{ width:"32px",height:"32px",minWidth:"32px",borderRadius:"50%",objectFit:"cover",border:"1px solid var(--border)" }}
    />
  );
}

export default function ChatPage() {
  const { user, logout } = useAuth();
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

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

    try {
      const conv = updatedWithUser.find(c => c.id === convId)!;
      await streamChat(conv.messages, chunk => { full += chunk; setStreamText(full); }, ctrl.signal);
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") full = "Sorry, something went wrong. Please try again.";
    }

    const aiMsg: ChatMessage = { role: "assistant", content: full || "..." };
    const finalConvs = updatedWithUser.map(c =>
      c.id === convId ? { ...c, messages: [...c.messages, aiMsg] } : c
    );
    setConversations(finalConvs);
    saveConversations(finalConvs);
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
  }

  const displayMessages = activeConv?.messages ?? [];
  const userInitials = user?.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "U";

  const sidebar = (
    <div style={{
      width:"260px", minWidth:"260px", background:"var(--surface)", borderRight:"1px solid var(--border)",
      display:"flex", flexDirection:"column", height:"100%",
      ...(isMobile ? { position:"fixed",left:sidebarOpen?"0":"-260px",top:0,bottom:0,zIndex:30,transition:"left 0.25s ease" } : {}),
    }}>
      <div style={{ padding:"16px", borderBottom:"1px solid var(--border)" }}>
        <div style={{ display:"flex", alignItems:"center", marginBottom:"12px" }}>
          <img src="/oplexa-logo-text.png" alt="Oplexa" style={{ height:"30px", objectFit:"contain" }} />
        </div>
        <button onClick={startNewChat} style={{ width:"100%",padding:"10px 14px",background:"var(--accent-light)",border:"1px solid rgba(220,38,38,0.25)",borderRadius:"9px",color:"var(--accent)",fontSize:"14px",fontWeight:"600",display:"flex",alignItems:"center",gap:"8px" }}>
          <span style={{ fontSize:"18px", lineHeight:1 }}>+</span> New Chat
        </button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
        {conversations.length === 0
          ? <p style={{ textAlign:"center",color:"var(--text-dim)",fontSize:"13px",padding:"24px 12px" }}>No conversations yet</p>
          : conversations.map(c => (
            <div key={c.id} onClick={() => { setActiveId(c.id); setSidebarOpen(false); }} style={{
              padding:"10px 12px", borderRadius:"8px", cursor:"pointer", marginBottom:"2px",
              background: activeId===c.id ? "var(--surface2)" : "transparent",
              border: activeId===c.id ? "1px solid var(--border)" : "1px solid transparent",
              display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px",
            }}>
              <span style={{ fontSize:"13px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1 }}>{c.title}</span>
              <button onClick={e => deleteConv(c.id, e)} style={{ color:"var(--text-dim)",fontSize:"16px",padding:"2px 4px",flexShrink:0 }}>×</button>
            </div>
          ))
        }
      </div>

      <div style={{ padding:"12px", borderTop:"1px solid var(--border)" }}>
        <button onClick={() => setLocation("/profile")} style={{ width:"100%",display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",borderRadius:"9px",background:"var(--surface2)",border:"1px solid var(--border)" }}>
          <div style={{ width:"32px",height:"32px",background:"var(--accent)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"700",color:"white",flexShrink:0 }}>{userInitials}</div>
          <span style={{ fontSize:"14px",fontWeight:"500",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user?.name}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", height:"100vh", background:"var(--bg)", overflow:"hidden" }}>
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:20 }} />
      )}

      {sidebar}

      <div style={{ flex:1, display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:"12px", background:"var(--surface)" }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ width:"36px",height:"36px",color:"var(--text-muted)",fontSize:"20px",display:"flex",alignItems:"center",justifyContent:"center" }}>☰</button>
          )}
          <span style={{ fontWeight:"600", fontSize:"15px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
            {activeConv ? activeConv.title : "Oplexa"}
          </span>
          <button onClick={() => setLocation("/profile")} style={{ width:"36px",height:"36px",background:"var(--accent)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:"700",color:"white",flexShrink:0 }}>
            {userInitials}
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
              {msg.role === "user" ? <UserAvatar name={user?.name ?? "U"} /> : <OplexaAvatar />}
              <div style={{
                maxWidth:"75%", padding:"12px 16px",
                borderRadius: msg.role==="user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                background: msg.role==="user" ? "var(--accent)" : "var(--surface2)",
                border: msg.role==="assistant" ? "1px solid var(--border)" : "none",
                fontSize:"15px", lineHeight:"1.6", whiteSpace:"pre-wrap", wordBreak:"break-word",
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {streaming && (
            <div className="fade-up" style={{ display:"flex", gap:"12px", alignItems:"flex-start" }}>
              <OplexaAvatar />
              <div style={{ maxWidth:"75%",padding:"12px 16px",borderRadius:"4px 18px 18px 18px",background:"var(--surface2)",border:"1px solid var(--border)",fontSize:"15px",lineHeight:"1.6",whiteSpace:"pre-wrap",wordBreak:"break-word" }}>
                {streamText
                  ? <>{streamText}<span className="cursor" /></>
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
          <div style={{ display:"flex",gap:"10px",alignItems:"flex-end",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"14px",padding:"10px 14px" }}>
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
          <p style={{ textAlign:"center",fontSize:"11px",color:"var(--text-dim)",marginTop:"8px" }}>
            Oplexa can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
