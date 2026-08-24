/**
 * ChatPanel — Slide-out messaging panel (like Instagram DMs).
 *
 * Accessible from any page via a floating button.
 * Features:
 *   - Conversation list with unread counts
 *   - Real-time messaging via Socket.IO
 *   - E2EE encryption/decryption
 *   - User search to start new conversations
 *   - Typing indicators + read receipts
 *   - Friend request management
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { chat } from "@/lib/api";
import { encryptMessage, decryptMessage } from "@/lib/crypto";
import { useAuthStore } from "@/store/auth-store";
import { useIdentityStore } from "@/store/identity-store";
import Button from "@/components/ui/Button";
import UserHoverCard from "@/components/social/UserHoverCard";
import IdentityGlyph from "@/components/identity/IdentityGlyph";

// ═══════════════════════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════════════════════

const VIEW = { LIST: "list", CHAT: "chat", SEARCH: "search", REQUESTS: "requests" };

// ═══════════════════════════════════════════════════════════
// MAIN PANEL
// ═══════════════════════════════════════════════════════════

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   initialPeerUserId?: string | null,
 *   onTargetConsumed?: () => void,
 * }} props
 *
 * `initialPeerUserId` — when set and the panel opens, auto-navigate
 * to that user's 1-to-1 conversation (creating it if needed). Used
 * by Phase-15 MessageButton on profiles and hovercards. After the
 * navigation fires we call `onTargetConsumed` so the caller can
 * reset the ui-store target and subsequent re-renders don't re-
 * trigger the navigation.
 */
export default function ChatPanel({ open, onClose, initialPeerUserId = null, onTargetConsumed }) {
  const user = useAuthStore((s) => s.user);
  // Identity is our source of truth for E2EE. If it's not "ready",
  // encrypt/decrypt will throw. ChatPanel reads the CryptoKey + sigil
  // directly and hands them to the crypto lib. The ceremony modal
  // (mounted in ExperienceShell via IdentityModalsRoot) handles the
  // "not yet forged" case — this component just checks the gate.
  const identityStatus     = useIdentityStore((s) => s.status);
  const myPrivateKey       = useIdentityStore((s) => s.privateKey);
  const mySigil            = useIdentityStore((s) => s.sigil);
  const serverSyncError    = useIdentityStore((s) => s.serverSyncError);
  const retryServerSync    = useIdentityStore((s) => s.retryServerSync);
  const [view, setView] = useState(VIEW.LIST);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [typing, setTyping] = useState(null);
  const [peerKey, setPeerKey] = useState(null);
  // User-facing error for the active conversation (peer has no key,
  // encryption failed, send failed, etc.). Cleared when the user
  // switches conversations or types something new.
  const [chatError, setChatError] = useState(null);
  const scrollRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeout = useRef(null);

  // ── Initialize Socket.IO ──
  //
  // Public-key registration has moved to the identity store's
  // hydrate() path — it re-publishes on every app boot. No need
  // to re-register here. The store also exposes `myPrivateKey`,
  // which we pass through to encryptMessage / decryptMessage
  // (they used to fetch it themselves via getOrCreateKeyPair,
  // which no longer exists).
  useEffect(() => {
    if (!user?.id || !open) return;

    // Socket.IO for real-time
    const socket = io(window.location.origin, { withCredentials: true, transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("register_user", user.id));

    socket.on("chat:receive", async (msg) => {
      // Normalise socket payload (camelCase) to the snake_case shape
      // the rest of this component + the DB use. Without this the
      // renderer reads `msg.sender_id` / `msg.created_at` off a
      // spread that only has `senderId` / `createdAt` → alignment
      // breaks and timestamps render as "Invalid Date".
      const normalised = {
        conversation_id:   msg.conversationId,
        sender_id:         msg.senderId,
        encrypted_content: msg.encryptedContent,
        iv:                msg.iv,
        message_type:      msg.messageType,
        created_at:        msg.createdAt,
      };
      if (normalised.conversation_id === activeConv?.id) {
        try {
          if (!myPrivateKey) throw new Error("identity not ready");
          const senderKey = await chat.getKey(normalised.sender_id);
          const decrypted = await decryptMessage(normalised.encrypted_content, normalised.iv, senderKey.data.publicKey, myPrivateKey);
          setMessages((prev) => [...prev, { ...normalised, content: decrypted, decrypted: true }]);
          chat.markAsRead(normalised.conversation_id).catch(() => {});
        } catch {
          setMessages((prev) => [...prev, { ...normalised, content: "[Encrypted]", decrypted: false }]);
        }
      }
      loadConversations();
    });

    socket.on("chat:typing", ({ conversationId, userId }) => {
      if (conversationId === activeConv?.id) {
        setTyping(userId);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTyping(null), 3000);
      }
    });

    socket.on("chat:read", ({ conversationId }) => {
      if (conversationId === activeConv?.id) {
        setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
      }
    });

    return () => { socket.disconnect(); socketRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, open, activeConv?.id, myPrivateKey]);

  // ── Load conversations ──
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await chat.getConversations();
      setConversations(data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (open) loadConversations(); }, [open, loadConversations]);

  // Phase 15 — auto-navigate to a target user's conversation when
  // the panel was opened with an initialPeerUserId (via MessageButton).
  // We gate on `open` so a stale prop doesn't trigger navigation
  // while the panel is closed, and call onTargetConsumed() after so
  // re-renders don't loop.
  useEffect(() => {
    if (!open || !initialPeerUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: conv } = await chat.getOrCreateConversation(initialPeerUserId);
        if (cancelled) return;
        await loadConversations();
        if (cancelled) return;
        openConversation(conv);
      } catch {
        // Silent — the panel still opens to the list view, which is a
        // reasonable fallback when the user can't be messaged (blocked,
        // settings=nobody). MessageButton itself is disabled in those
        // cases, so hitting this path is rare.
      } finally {
        if (!cancelled) onTargetConsumed?.();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPeerUserId]);

  // ── Load messages for active conversation ──
  const loadMessages = useCallback(async (conv) => {
    setChatError(null);
    try {
      const { data: msgs } = await chat.getMessages(conv.id);
      const otherId = conv.participant_a === user.id ? conv.participant_b : conv.participant_a;

      // Get peer's public key for decryption. 404 here means the peer
      // has never registered a public key with the server — either they
      // never completed the Identity Ceremony, or their first registerKey
      // POST failed silently. Merely "opening chat" doesn't trigger a
      // ceremony, so the old copy ("ask them to open chat at least once")
      // was misleading. Tell the peer what to actually do.
      let keyData;
      try {
        ({ data: keyData } = await chat.getKey(otherId));
      } catch (err) {
        if (err?.response?.status === 404) {
          setChatError(
            "This user hasn't finished their identity setup yet. " +
            "Ask them to open their Profile → Identity panel and complete the " +
            "12-word ceremony — that's what registers their encryption key.",
          );
          setPeerKey(null);
          setMessages([]);
          return;
        }
        throw err;
      }
      setPeerKey(keyData.publicKey);

      // Decrypt messages. Requires the identity store to be "ready"
      // (myPrivateKey available) — without it we render a placeholder
      // so the UI explains WHY rather than silently failing.
      const decrypted = await Promise.all(
        (msgs || []).reverse().map(async (m) => {
          try {
            if (!myPrivateKey) throw new Error("identity not ready");
            const senderKeyId = m.sender_id === user.id ? otherId : m.sender_id;
            const { data: sk } = await chat.getKey(senderKeyId);
            const content = await decryptMessage(m.encrypted_content, m.iv, sk.publicKey, myPrivateKey);
            return { ...m, content, decrypted: true };
          } catch {
            return { ...m, content: "[Cannot decrypt]", decrypted: false };
          }
        }),
      );

      setMessages(decrypted);
      chat.markAsRead(conv.id).catch(() => {});
    } catch (err) {
      setChatError(err?.response?.data?.error || "Couldn't load messages — check your connection.");
    }
  }, [user?.id, myPrivateKey]);

  // ── Open a conversation ──
  const openConversation = useCallback(async (conv) => {
    setActiveConv(conv);
    setView(VIEW.CHAT);
    await loadMessages(conv);
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 100);
  }, [loadMessages]);

  // ── Send message ──
  const handleSend = async () => {
    if (!input.trim() || !activeConv || sending) return;
    if (!peerKey) {
      setChatError("This user hasn't set up end-to-end encryption yet.");
      return;
    }
    if (!myPrivateKey) {
      setChatError("Forge your identity first (open chat, click Forge My Identity).");
      return;
    }
    setChatError(null);
    setSending(true);
    const text = input.trim();
    setInput("");

    try {
      const { encrypted, iv } = await encryptMessage(text, peerKey, myPrivateKey);
      const otherId = activeConv.participant_a === user.id ? activeConv.participant_b : activeConv.participant_a;

      // Save to DB
      await chat.sendMessage(activeConv.id, encrypted, iv, "text");

      // Push via Socket.IO for real-time
      socketRef.current?.emit("chat:send", {
        conversationId: activeConv.id,
        recipientId: otherId,
        encryptedContent: encrypted,
        iv,
        messageType: "text",
      });

      // Add to local messages immediately
      setMessages((prev) => [...prev, {
        sender_id: user.id,
        content: text,
        decrypted: true,
        created_at: new Date().toISOString(),
      }]);

      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
    } catch (err) {
      setInput(text); // restore input on failure
      setChatError(err?.response?.data?.error || "Couldn't send — try again.");
    }
    setSending(false);
  };

  // ── Typing indicator ──
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (chatError) setChatError(null);
    if (activeConv && socketRef.current) {
      const otherId = activeConv.participant_a === user.id ? activeConv.participant_b : activeConv.participant_a;
      socketRef.current.emit("chat:typing", { conversationId: activeConv.id, recipientId: otherId });
    }
  };

  // ── Search users ──
  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const { data } = await chat.searchUsers(q);
      setSearchResults(data || []);
    } catch { setSearchResults([]); }
  };

  // ── Start conversation with searched user ──
  const startChat = async (otherUserId) => {
    try {
      const { data: conv } = await chat.getOrCreateConversation(otherUserId);
      await loadConversations();
      openConversation(conv);
    } catch (err) {
      alert(err.response?.data?.error || "Cannot start conversation");
    }
  };

  // ── Load friend requests ──
  const loadRequests = async () => {
    try {
      const { data } = await chat.getPending();
      setPendingRequests(data || []);
    } catch { /* ignore */ }
  };

  if (!open) return null;

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 250 }}
        className="fixed left-0 top-0 z-[60] flex h-full w-full flex-col border-r border-line/10 bg-surface/95 backdrop-blur-2xl sm:w-[400px]"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-line/10 px-4 py-3">
          {view === VIEW.CHAT ? (
            <button onClick={() => { setView(VIEW.LIST); setActiveConv(null); }} className="flex items-center gap-2 text-sm text-text-muted hover:text-white">
              <span>←</span>
              {/* Peer's identity glyph — the "is this still the same person?"
                  visual. A sudden change mid-conversation is a signal that
                  the peer rotated keys. */}
              {activeConv?.otherUser?.user_id && (
                <IdentityGlyph userId={activeConv.otherUser.user_id} size={22} inline />
              )}
              <span>{activeConv?.otherUser?.name || "Back"}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {/* My own sigil — always visible in the list view header so
                  the user gets used to seeing their mathematical self. */}
              {mySigil && identityStatus === "ready" && (
                <IdentityGlyph sigil={mySigil} size={22} inline title="Your identity" />
              )}
              <h3 className="font-display text-sm font-semibold text-white">
                Messages {totalUnread > 0 && <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-white">{totalUnread}</span>}
              </h3>
            </div>
          )}
          <div className="flex items-center gap-2">
            {view === VIEW.LIST && (
              <>
                <button onClick={() => { setView(VIEW.SEARCH); }} className="rounded-lg p-1.5 text-text-dim hover:bg-white/5 hover:text-white" title="New chat" aria-label="New chat">
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
                <button onClick={() => { setView(VIEW.REQUESTS); loadRequests(); }} className="rounded-lg p-1.5 text-text-dim hover:bg-white/5 hover:text-white" title="Friend requests" aria-label="Friend requests">
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                </button>
              </>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-text-dim hover:bg-white/5 hover:text-white" aria-label="Close chat panel">
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* ── Server sync banner ── */}
        {identityStatus === "ready" && serverSyncError && (
          <div className="border-b border-warning/20 bg-warning/10 px-4 py-2 text-[11px] text-warning">
            <div className="flex items-center justify-between gap-2">
              <span>Key not synced to server — others can&apos;t message you until this succeeds.</span>
              <button
                onClick={() => retryServerSync()}
                className="rounded border border-warning/40 px-2 py-0.5 text-[10px] uppercase tracking-wider hover:bg-warning/20"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* ── Conversation List ── */}
        {view === VIEW.LIST && (
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-2xl">💬</p>
                <p className="mt-3 text-sm text-text-muted">No conversations yet</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => setView(VIEW.SEARCH)}>
                  Find people
                </Button>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  className="flex w-full items-center gap-3 border-b border-line/5 px-4 py-3 text-left transition hover:bg-white/[0.03]"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                    style={{ background: conv.otherUser?.avatar_color || "var(--color-avatar-fallback)" }}
                  >
                    {conv.otherUser?.avatar_emoji || conv.otherUser?.name?.charAt(0) || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {conv.otherUser?.user_id
                        ? <UserHoverCard userId={conv.otherUser.user_id}>{conv.otherUser?.name || "User"}</UserHoverCard>
                        : (conv.otherUser?.name || "User")}
                    </p>
                    <p className="truncate text-xs text-text-dim">{conv.otherUser?.title || "Student"}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {/* ── Chat View ── */}
        {view === VIEW.CHAT && (
          <>
            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {messages.map((msg, i) => {
                const isMine = msg.sender_id === user?.id;
                return (
                  <div key={msg.id || i} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`min-w-0 max-w-[80%] break-words px-3 py-2 text-[13px] leading-relaxed ${
                        isMine
                          ? "rounded-2xl rounded-br-sm bg-primary/20 text-white"
                          : "rounded-2xl rounded-bl-sm bg-white/[0.05] text-text-muted"
                      }`}
                    >
                      {msg.content}
                      <span className="mt-0.5 block text-right text-[9px] text-text-dim">
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        {isMine && msg.is_read && " ✓✓"}
                      </span>
                    </div>
                  </div>
                );
              })}
              {typing && <p className="text-xs text-text-dim italic">typing...</p>}
            </div>

            {/* Error banner — shown when peer has no key, send fails, etc. */}
            {chatError && (
              <div className="border-t border-danger/25 bg-danger/10 px-4 py-2 text-[11px] text-danger">
                <div className="flex items-start justify-between gap-2">
                  <span>{chatError}</span>
                  <button onClick={() => setChatError(null)} className="shrink-0 text-danger/70 hover:text-danger" aria-label="Dismiss">×</button>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="sai-bottom border-t border-line/10 px-3 py-2">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl border border-line/15 bg-black/15 px-3 py-2 text-sm text-white outline-none focus:border-primary/30"
                />
                <Button size="sm" onClick={handleSend} loading={sending} disabled={!input.trim()}>
                  Send
                </Button>
              </div>
              <p className="mt-1 text-center text-[8px] text-text-dim">🔒 End-to-end encrypted</p>
            </div>
          </>
        )}

        {/* ── Search View — Find people + Add Friend / Message ── */}
        {view === VIEW.SEARCH && (
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or email..."
              autoFocus
              className="w-full rounded-xl border border-line/15 bg-black/15 px-3 py-2 text-sm text-white outline-none focus:border-primary/30"
            />
            <div className="mt-3 space-y-2">
              {searchResults.map((u) => (
                <div
                  key={u.user_id}
                  className="flex items-center gap-3 rounded-xl border border-line/10 bg-black/10 px-3 py-2.5"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base"
                    style={{ background: u.avatar_color || "var(--color-avatar-fallback)" }}
                  >
                    {u.avatar_emoji || u.name?.charAt(0) || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      <UserHoverCard userId={u.user_id}>{u.name}</UserHoverCard>
                    </p>
                    <p className="text-[10px] text-text-dim">{u.title || "Student"} · {u.xp || 0} XP</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await chat.sendRequest(u.user_id);
                          alert("Friend request sent!");
                        } catch (err) {
                          const msg = err.response?.data?.error || "Failed";
                          if (msg.includes("already exists")) alert("Request already sent!");
                          else alert(msg);
                        }
                      }}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => startChat(u.user_id)}
                    >
                      Chat
                    </Button>
                  </div>
                </div>
              ))}
              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="py-8 text-center text-sm text-text-dim">No users found</p>
              )}
            </div>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setView(VIEW.LIST); setSearchQuery(""); setSearchResults([]); }}>
              Back
            </Button>
          </div>
        )}

        {/* ── Friend Requests View ── */}
        {view === VIEW.REQUESTS && (
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-text-dim">Pending Requests</h4>
            {pendingRequests.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-dim">No pending requests</p>
            ) : (
              <div className="mt-3 space-y-2">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 rounded-lg border border-line/10 bg-black/10 px-3 py-2">
                    <div className="flex-1">
                      <p className="text-sm text-white">
                        {req.requester?.user_id
                          ? <UserHoverCard userId={req.requester.user_id}>{req.requester?.name || "User"}</UserHoverCard>
                          : (req.requester?.name || "User")}
                      </p>
                      <p className="text-[10px] text-text-dim">{req.requester?.email}</p>
                    </div>
                    <Button size="sm" onClick={async () => {
                      await chat.respondRequest(req.id, true);
                      loadRequests();
                    }}>Accept</Button>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      await chat.respondRequest(req.id, false);
                      loadRequests();
                    }}>Decline</Button>
                  </div>
                ))}
              </div>
            )}
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setView(VIEW.LIST)}>Back</Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
