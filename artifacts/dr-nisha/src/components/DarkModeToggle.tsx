import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("dr_nisha_dark_mode");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("dr_nisha_dark_mode", String(isDark));
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 shadow-sm"
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
