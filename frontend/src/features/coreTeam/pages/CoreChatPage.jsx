import { useEffect, useRef, useState, useCallback } from "react";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { core } from "@/lib/api";

/**
 * CoreChatPage — anonymous live chat for the core team.
 *
 * Every member posts; everyone reads it anonymously. Only the owner
 * account sees who actually sent each message (the backend decides
 * and sends `isOwner` + per-message `author`). Refreshes by polling
 * every 5s — simple and robust for a small team.
 */

function timeOf(d) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function CoreChatPage() {
  const [messages, setMessages] = useState(null);
  const [isOwner, setIsOwner]   = useState(false);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const scrollRef  = useRef(null);
  const atBottomRef = useRef(true);

  // AbortController so an in-flight fetch is cancelled when the
  // component unmounts or the poll is restarted. Prevents a "set
  // state after unmount" warning and saves a wasted Supabase hit if
  // the user navigates away mid-request.
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const { data } = await core.chatMessages({ signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      setMessages(data.messages || []);
      setIsOwner(!!data.isOwner);
    } catch (err) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;
      setMessages((m) => m || []);
    }
  }, []);

  useEffect(() => {
    // Visibility-paused poll. When the tab goes background we
    // clearInterval; when it comes back we run a catch-up load() and
    // restart the 5s loop. This stops a backgrounded /core/chat tab
    // from burning a /api/core/chat hit every 5 seconds — adds up
    // fast on a shared school IP behind the route limiter.
    let timer = null;
    const start = () => {
      load();
      timer = setInterval(load, 5000);
    };
    const stop = () => {
      if (timer) { clearInterval(timer); timer = null; }
      abortRef.current?.abort();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (!timer) start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  // Keep the view pinned to the latest message unless the user has
  // scrolled up to read history.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  const send = async () => {
    const body = input.trim();
    if (!body) return;
    setSending(true);
    try {
      await core.sendChatMessage(body);
      setInput("");
      atBottomRef.current = true;
      await load();
    } catch { /* surfaced on next poll */ }
    setSending(false);
  };

  const remove = async (id) => {
    try {
      await core.deleteChatMessage(id);
      setMessages((m) => m.filter((x) => x.id !== id));
    } catch { /* ignore */ }
  };

  if (!messages) {
    return <div className="flex justify-center py-20"><Loader variant="orbit" size="lg" label="Loading chat…" /></div>;
  }

  // dvh (vh fallback) because mobile 100vh includes the collapsed
  // URL-bar area, which pushes the composer below the visible viewport.
  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[360px] flex-col supports-[height:100dvh]:h-[calc(100dvh-13rem)]">
      {/* anonymity banner */}
      <div className={`mb-3 rounded-xl border px-4 py-2.5 text-xs ${
        isOwner
          ? "border-warning/30 bg-warning/10 text-warning"
          : "border-primary/25 bg-primary/10 text-primary"
      }`}>
        {isOwner
          ? "Owner view — you can see who sent each message. Everyone else sees this chat anonymously."
          : "This chat is anonymous — no one can see who sent what. Speak freely."}
      </div>

      {/* messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-line/12 bg-black/25 p-4"
      >
        {messages.length === 0 && (
          <p className="py-12 text-center text-sm text-text-dim">No messages yet — say something.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`group max-w-[80%] rounded-2xl border px-4 py-2.5 ${
              m.mine
                ? "rounded-br-sm border-primary/30 bg-primary/15"
                : "rounded-bl-sm border-line/12 bg-white/[0.05]"
            }`}>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[10px] uppercase tracking-wider ${
                  m.mine ? "text-primary" : "text-text-dim"
                }`}>
                  {m.mine ? "You" : (m.author || "Anonymous")}
                </span>
                <span className="font-mono text-[9px] text-text-dim">{timeOf(m.created_at)}</span>
                {isOwner && (
                  <button
                    onClick={() => remove(m.id)}
                    aria-label="Delete message"
                    className="-m-1 ml-1 p-2 text-[13px] text-text-dim transition hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-text-primary">{m.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* composer */}
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type anonymously…"
          maxLength={1000}
          className="flex-1 rounded-xl border border-line/20 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/50"
        />
        <Button size="md" variant="primary" magnetic={false} loading={sending} onClick={send}>
          Send
        </Button>
      </div>
    </div>
  );
}
