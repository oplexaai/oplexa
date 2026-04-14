import { useLocation } from "wouter";
import { useEffect, useRef } from "react";

const FEATURES = [
  { icon: "⚡", title: "Lightning Fast", desc: "Instant responses powered by advanced AI models" },
  { icon: "🧠", title: "Highly Intelligent", desc: "Ask anything — coding, writing, math, research & more" },
  { icon: "🌐", title: "Multilingual", desc: "Automatically detects your language and replies in it" },
  { icon: "🔒", title: "Private & Secure", desc: "Your conversations are safe and never shared" },
];

export default function WelcomePage() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let anim: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,38,38,${p.alpha})`;
        ctx.fill();
      }
      anim = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(anim); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div style={{ height:"100dvh", background:"#000", display:"flex", flexDirection:"column", overflow:"hidden", position:"relative" }}>
      <canvas ref={canvasRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }} />

      <div style={{ flex:1, overflowY:"auto", position:"relative", zIndex:1 }}>

        <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <img src="/oplexa-logo-text.png" alt="Oplexa" style={{ height:"28px", objectFit:"contain" }} />
          <button onClick={() => setLocation("/auth")}
            style={{ fontSize:"14px",fontWeight:"600",color:"var(--accent)",padding:"8px 18px",border:"1px solid rgba(220,38,38,0.35)",borderRadius:"20px",background:"rgba(220,38,38,0.08)",cursor:"pointer" }}>
            Sign In
          </button>
        </div>

        <div style={{ maxWidth:"480px", margin:"0 auto", padding:"40px 24px 0", textAlign:"center" }}>
          <div style={{ position:"relative", display:"inline-block", marginBottom:"28px" }}>
            <div style={{ position:"absolute", inset:"-8px", borderRadius:"50%", background:"radial-gradient(circle, rgba(220,38,38,0.25) 0%, transparent 70%)", animation:"pulse 2.5s ease-in-out infinite" }} />
            <img src="/oplexa-avatar.jpg" alt="Oplexa" style={{ width:"96px", height:"96px", borderRadius:"28px", objectFit:"cover", border:"2px solid rgba(220,38,38,0.5)", display:"block", position:"relative" }} />
          </div>

          <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:"rgba(220,38,38,0.12)", border:"1px solid rgba(220,38,38,0.25)", borderRadius:"20px", padding:"5px 14px", marginBottom:"20px" }}>
            <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#dc2626", animation:"pulse 1.5s ease-in-out infinite" }} />
            <span style={{ fontSize:"12px", color:"var(--accent)", fontWeight:"600", letterSpacing:"0.05em" }}>INDIA'S No.1 AI</span>
          </div>

          <h1 style={{ fontSize:"clamp(32px,8vw,52px)", fontWeight:"800", lineHeight:"1.15", marginBottom:"16px", letterSpacing:"-0.02em" }}>
            Meet <span style={{ color:"var(--accent)" }}>Oplexa</span>,<br />Your AI Assistant
          </h1>

          <p style={{ fontSize:"16px", color:"var(--text-muted)", lineHeight:"1.7", marginBottom:"36px", maxWidth:"360px", margin:"0 auto 36px" }}>
            Ask anything, get instant answers. Oplexa is powered by cutting-edge AI to help you work smarter, faster, and better.
          </p>

          <div style={{ display:"flex", flexDirection:"column", gap:"12px", marginBottom:"48px" }}>
            <button onClick={() => setLocation("/auth?mode=register")}
              style={{ width:"100%", padding:"16px", borderRadius:"14px", background:"var(--accent)", color:"white", fontSize:"17px", fontWeight:"700", border:"none", cursor:"pointer", boxShadow:"0 4px 24px rgba(220,38,38,0.35)", letterSpacing:"0.01em", transition:"transform 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 8px 32px rgba(220,38,38,0.45)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 4px 24px rgba(220,38,38,0.35)"; }}>
              Get Started — It's Free
            </button>
            <button onClick={() => setLocation("/auth")}
              style={{ width:"100%", padding:"15px", borderRadius:"14px", background:"rgba(255,255,255,0.05)", color:"var(--text)", fontSize:"16px", fontWeight:"600", border:"1px solid var(--border)", cursor:"pointer", transition:"background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.09)"}
              onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.05)"}>
              I already have an account
            </button>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"48px" }}>
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"16px", padding:"16px", textAlign:"left" }}>
                <div style={{ fontSize:"22px", marginBottom:"8px" }}>{icon}</div>
                <p style={{ fontSize:"13px", fontWeight:"700", color:"var(--text)", marginBottom:"4px" }}>{title}</p>
                <p style={{ fontSize:"12px", color:"var(--text-muted)", lineHeight:"1.5" }}>{desc}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize:"11px", color:"var(--text-dim)", paddingBottom:"32px" }}>
            By continuing, you agree to Oplexa's Terms of Service
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.05)} }
      `}</style>
    </div>
  );
}
