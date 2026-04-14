import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--bg)",gap:"16px",textAlign:"center",padding:"20px" }}>
      <div style={{ fontSize:"48px",fontWeight:"800",color:"var(--accent)" }}>404</div>
      <h1 style={{ fontSize:"20px",fontWeight:"700" }}>Page not found</h1>
      <p style={{ color:"var(--text-muted)",fontSize:"14px" }}>The page you're looking for doesn't exist.</p>
      <button onClick={() => setLocation("/")} className="oplexa-btn" style={{ width:"auto",marginTop:"8px" }}>
        Go Home
      </button>
    </div>
  );
}
