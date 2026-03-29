import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogIn, X, Stethoscope } from "lucide-react";
import drNishaAvatar from "@assets/WhatsApp_Image_2026-03-29_at_8.15.33_PM_1774795561459.jpeg";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (name: string) => void;
}

export function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "create">("login");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onLogin(trimmed);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:bg-black/5 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg mb-3">
                <img src={drNishaAvatar} alt="Dr. Nisha" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground">Dr. Nisha</h2>
              <p className="text-sm text-muted-foreground mt-1">Your Medical AI Assistant</p>
            </div>

            <div className="flex rounded-xl bg-muted p-1 mb-6">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "login" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setMode("create")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "create" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  {mode === "login" ? "Enter your name to continue" : "Choose your name"}
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={mode === "login" ? "Your name..." : "Enter your name..."}
                    autoFocus
                    className="w-full pl-9 pr-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!name.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
              >
                <LogIn size={18} />
                {mode === "login" ? "Login" : "Create Account"}
              </button>
            </form>

            <div className="mt-4 flex items-start gap-2 p-3 bg-primary/5 rounded-xl">
              <Stethoscope size={14} className="text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your name helps personalize the experience. No password needed — just enter your name to get started.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
