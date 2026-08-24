import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { bot } from "@/lib/api";

const panelVariants = {
  hidden: {
    opacity: 0,
    scale: 0.6,
    y: 60,
    borderRadius: "50%",
    filter: "blur(10px)",
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    borderRadius: "1.5rem",
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 22,
      mass: 0.8,
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.5,
    y: 80,
    borderRadius: "50%",
    filter: "blur(8px)",
    transition: { duration: 0.35, ease: "easeIn" },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey! I'm **ΣBot** — your dramatic math genius 🧮✨\n\nCalculus? Linear Algebra? Probability? Number Theory?\n\nHit me with your best shot!" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 400);
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const { data } = await bot.chat(
        updated.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content }))
      );
      setMessages([...updated, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([...updated, { role: "assistant", content: "The AI dimension is experiencing turbulence 🌀 Try again in a moment!" }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  function renderContent(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/`(.*?)`/g, '<code class="whitespace-pre-wrap break-all rounded bg-primary/15 px-1.5 py-0.5 font-mono text-xs text-glow">$1</code>')
      .replace(/\n/g, "<br/>");
  }

  return (
    <>
      {/* ── Floating trigger button ── */}
      <div className="fixed bottom-7 right-7 z-50">
        {/* Outer pulse rings */}
        {!open && (
          <>
            <motion.div animate={{ scale: [1, 2.2], opacity: [0.3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-primary/30" />
            <motion.div animate={{ scale: [1, 1.8], opacity: [0.2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
              className="absolute inset-0 rounded-full bg-secondary/20" />
          </>
        )}

        <motion.button
          onClick={() => setOpen(!open)}
          whileHover={{ scale: 1.12, rotate: open ? 0 : 15 }}
          whileTap={{ scale: 0.85 }}
          className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full bg-gradient-to-br from-primary via-secondary to-glow text-white shadow-[0_10px_50px_rgba(131,82,255,0.5)]"
          style={{ border: "3px solid rgba(255,255,255,0.15)" }}
          aria-label="Toggle ΣBot"
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.svg key="x" initial={{ rotate: -180, opacity: 0, scale: 0 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 180, opacity: 0, scale: 0 }}
                transition={{ type: "spring", bounce: 0.4 }}
                className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </motion.svg>
            ) : (
              <motion.div key="sigma" initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="flex flex-col items-center">
                <span className="font-display text-2xl font-extrabold leading-none">Σ</span>
                <span className="mt-0.5 font-mono text-[7px] uppercase tracking-widest opacity-80">Bot</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed bottom-[108px] right-7 z-50 flex flex-col overflow-hidden border-2 border-primary/15 shadow-[0_40px_120px_rgba(0,0,0,0.65)]"
            style={{
              width: "min(480px, calc(100vw - 2rem))",
              height: "min(680px, calc(100dvh - 10rem))",
            }}
          >
            {/* Glass bg */}
            <div className="absolute inset-0 bg-obsidian/95 backdrop-blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(131,82,255,0.06),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(35,193,255,0.04),transparent_50%)]" />

            {/* Animated top border glow */}
            <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="pointer-events-none absolute left-0 top-0 z-30 h-[2px] w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent" />

            {/* ── Header ── */}
            <motion.div variants={childVariants} className="relative z-10 flex items-center gap-4 border-b border-line/15 px-6 py-5">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-secondary to-glow"
                style={{ boxShadow: "0 6px 30px rgba(131,82,255,0.4), inset 0 1px 0 rgba(255,255,255,0.2)" }}
              >
                <span className="font-display text-2xl font-extrabold text-white drop-shadow-lg">Σ</span>
                {/* Orbiting dot */}
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-4px]">
                  <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-glow shadow-[0_0_8px_rgba(110,231,255,0.8)]" />
                </motion.div>
              </motion.div>
              <div className="flex-1">
                <p className="text-lg font-bold text-white">ΣBot</p>
                <div className="flex items-center gap-2">
                  <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                    className="h-2 w-2 rounded-full bg-success shadow-[0_0_6px_rgba(45,212,191,0.6)]" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-success">Online</span>
                  <span className="font-mono text-[10px] text-text-dim">&middot; Math AI</span>
                </div>
              </div>
              <button onClick={() => setMessages([{ role: "assistant", content: "Fresh start! 🧮 What math problem are we conquering?" }])}
                className="rounded-xl border border-line/15 bg-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-text-dim transition hover:bg-white/10 hover:text-white">
                Clear
              </button>
            </motion.div>

            {/* ── Messages ── */}
            <div ref={scrollRef} className="relative z-10 flex-1 space-y-4 overflow-y-auto px-5 py-5 [scrollbar-width:thin] [scrollbar-color:rgba(131,82,255,0.3)_transparent]">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="mr-2.5 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20 shadow-sm">
                      <span className="font-display text-xs font-bold text-primary">Σ</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] break-words rounded-2xl px-4 py-3 text-[13.5px] leading-[1.7] ${
                      msg.role === "user"
                        ? "rounded-br-sm bg-gradient-to-br from-primary/30 to-primary/15 text-white shadow-[0_4px_16px_rgba(131,82,255,0.15)]"
                        : "rounded-bl-sm border border-line/10 bg-surface/80 text-text-muted"
                    }`}
                    dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                  />
                </motion.div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="flex items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20">
                    <motion.span animate={{ rotate: [0, 360] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="font-display text-xs font-bold text-primary">Σ</motion.span>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-sm border border-line/10 bg-surface/80 px-5 py-4">
                    {[0, 0.15, 0.3].map((delay, idx) => (
                      <motion.span key={idx} animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay }}
                        className="h-3 w-3 rounded-full"
                        style={{ background: idx === 0 ? "rgb(var(--color-primary))" : idx === 1 ? "rgb(var(--color-secondary))" : "rgb(var(--color-glow))" }} />
                    ))}
                    <span className="ml-1 font-mono text-[10px] italic text-text-dim">thinking...</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* ── Input ── */}
            <motion.div variants={childVariants} className="relative z-10 border-t border-line/15 px-5 py-4">
              <div className="flex items-end gap-3">
                <div className="relative flex-1">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about math..."
                    rows={1}
                    className="max-h-28 min-h-[50px] w-full resize-none rounded-2xl border border-line/15 bg-panel/60 px-5 py-3.5 text-sm text-white outline-none placeholder:text-text-dim focus:border-primary/40 focus:shadow-[0_0_0_4px_rgba(131,82,255,0.08)]"
                  />
                </div>
                <motion.button
                  onClick={send}
                  disabled={!input.trim() || loading}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-[0_6px_24px_rgba(131,82,255,0.35)] transition disabled:opacity-25 disabled:shadow-none"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </motion.button>
              </div>
              <p className="mt-3 text-center font-mono text-[8px] uppercase tracking-[0.2em] text-text-dim">
                ΣBot AI &middot; Guides with hints, never spoils the answer
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
