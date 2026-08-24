import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import { useMonument } from "@/hooks/useMonument";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { notifications, chat } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
};

const listItem = {
  initial: { opacity: 0, x: -20, scale: 0.97 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 20, height: 0, marginBottom: 0 },
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  useMonument("sky");
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const socketRef = useRef(null);
  const user = useAuthStore((s) => s.user);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await notifications.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Socket.IO real-time connection
  useEffect(() => {
    const socket = io(window.location.origin, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      if (user?.id || user?._id) {
        socket.emit("register_user", user.id || user._id);
      }
    });

    socket.on("notification", (notif) => {
      if (notif && (notif.id || notif._id)) {
        setItems((prev) => {
          const exists = prev.some(
            (n) => (n.id || n._id) === (notif.id || notif._id)
          );
          if (exists) return prev;
          return [notif, ...prev];
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const handleMarkRead = useCallback(async (id) => {
    try {
      setMarkingId(id);
      await notifications.markRead(id);
      setItems((prev) =>
        prev.map((n) =>
          (n.id === id || n._id === id) ? { ...n, is_read: true, read: true } : n
        )
      );
    } catch {
      // Silently fail - the user can retry
    } finally {
      setMarkingId(null);
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      setMarkingAll(true);
      await notifications.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true, read: true })));
    } catch {
      // Silently fail
    } finally {
      setMarkingAll(false);
    }
  }, []);

  const handleClearAll = useCallback(async () => {
    try {
      setClearing(true);
      await notifications.clear();
      setItems([]);
    } catch {
      // Silently fail
    } finally {
      setClearing(false);
    }
  }, []);

  // Fetch pending friend requests
  useEffect(() => {
    chat.getPending().then(r => setPendingRequests(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const handleAcceptFriend = async (requestId, userId) => {
    try {
      await chat.respondRequest(requestId, true);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      // Mark the related notification as read
      const relatedNotif = items.find(n => n.title === "New Friend Request" && !n.is_read);
      if (relatedNotif) {
        await notifications.markRead(relatedNotif.id || relatedNotif._id);
        setItems(prev => prev.map(n => (n.id || n._id) === (relatedNotif.id || relatedNotif._id) ? { ...n, is_read: true } : n));
      }
      // Redirect to friend's profile
      if (userId) navigate(`/student/${userId}`);
    } catch { /* ignore */ }
  };

  const handleRejectFriend = async (requestId) => {
    try {
      await chat.respondRequest(requestId, false);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch { /* ignore */ }
  };

  const unreadCount = items.filter((n) => !n.is_read && !n.read).length;

  if (loading) {
    return (
      <div style={{ position: "relative" }}>
        <MonumentBackground monument="sky" intensity={0.12} />
        <div className="relative z-10 flex min-h-[60vh] items-center justify-center">
          <Loader variant="orbit" size="lg" label="Loading notifications..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ position: "relative" }}>
        <MonumentBackground monument="sky" intensity={0.12} />
        <div className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <svg className="h-12 w-12 text-danger/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-danger">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchNotifications}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <MonumentBackground monument="sky" intensity={0.12} />

      <div className="relative z-10 space-y-8 pb-16">
        {/* Header */}
        <motion.section initial="hidden" animate="visible">
          <motion.div
            custom={0}
            variants={fadeUp}
            className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-secondary">
                Comms Center
              </p>
              <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.05em] text-white sm:text-5xl">
                Notifications
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.3 }}
                    className="ml-3 inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-primary px-2.5 align-middle font-mono text-sm font-bold text-white"
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </h1>
              <p className="mt-2 text-text-muted">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                  : "All caught up!"}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                loading={markingAll}
                disabled={unreadCount === 0}
                onClick={handleMarkAllRead}
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mark All Read
                </span>
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={clearing}
                disabled={items.length === 0}
                onClick={handleClearAll}
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Clear All
                </span>
              </Button>
            </div>
          </motion.div>
        </motion.section>

        {/* Stats Row */}
        <motion.section
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-3"
        >
          {[
            {
              label: "Total",
              value: items.length,
              color: "text-primary",
              bg: "bg-primary/10",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              ),
            },
            {
              label: "Unread",
              value: unreadCount,
              color: "text-warning",
              bg: "bg-warning/10",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              ),
            },
            {
              label: "Read",
              value: items.length - unreadCount,
              color: "text-success",
              bg: "bg-success/10",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
          ].map((stat, i) => (
            <motion.div key={stat.label} custom={i + 1} variants={fadeUp}>
              <Card variant="glass" className="text-center">
                <div className="flex items-center justify-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}>
                    {stat.icon}
                  </span>
                  <div className="text-left">
                    <p className={`math-text text-3xl font-bold ${stat.color}`}>
                      {stat.value}
                    </p>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.section>

        {/* Pending Friend Requests */}
        {pendingRequests.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card variant="glow">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Friend Requests</p>
              <h3 className="mt-2 font-display text-lg font-bold text-white">{pendingRequests.length} Pending</h3>
              <div className="mt-4 space-y-3">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex flex-col gap-3 rounded-xl border border-line/15 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg">
                        {req.avatar_emoji || "👤"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{req.name || "Unknown"}</p>
                        <p className="truncate font-mono text-[10px] text-text-dim">{req.email || ""}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" onClick={() => handleAcceptFriend(req.id, req.user_id || req.requester_id)}>
                        Accept
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRejectFriend(req.id)}>
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.section>
        )}

        {/* Notification List */}
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card variant="solid" className="text-center">
              <div className="py-16">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                >
                  <svg className="mx-auto h-16 w-16 text-text-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                </motion.div>
                <h3 className="mt-6 font-display text-xl font-bold text-white">
                  No Notifications
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  You're all caught up. New notifications will appear here in real time.
                </p>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {items.map((notif, i) => {
                const id = notif.id || notif._id;
                const isUnread = !notif.is_read && !notif.read;
                const isMarking = markingId === id;
                const bodyText = notif.body || notif.message || "";

                const handleClick = async () => {
                  if (isUnread) await handleMarkRead(id);
                  // Navigate to link if present
                  if (notif.link) navigate(notif.link);
                };

                return (
                  <motion.div
                    key={id}
                    layout
                    variants={listItem}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{
                      delay: i * 0.04,
                      duration: 0.35,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <Card
                      variant={isUnread ? "glass" : "solid"}
                      className={`group cursor-pointer transition-all duration-200 ${
                        isUnread
                          ? "border-primary/25 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                          : "opacity-70 hover:opacity-90"
                      }`}
                      style={isUnread ? { borderLeft: "3px solid var(--monument-sky)", background: "rgba(182,149,248,0.04)" } : undefined}
                      onClick={handleClick}
                    >
                      <div className="flex items-start gap-4">
                        {/* Dot indicator */}
                        <div className="relative mt-1.5 flex-shrink-0">
                          <span
                            className={`block h-3 w-3 rounded-full transition-colors ${
                              isUnread ? "bg-primary" : "bg-text-dim/30"
                            }`}
                          />
                          {isUnread && (
                            <motion.span
                              className="absolute inset-0 rounded-full bg-primary"
                              animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                              transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                            />
                          )}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h3
                                className={`text-sm font-semibold ${
                                  isUnread ? "text-white" : "text-text-muted"
                                }`}
                              >
                                {notif.title}
                              </h3>
                              {bodyText && (
                                <p className="mt-1 text-sm leading-relaxed text-text-dim">
                                  {bodyText}
                                </p>
                              )}
                              {notif.link && (
                                <p className="mt-1 font-mono text-[10px] text-primary/60">
                                  Click to view →
                                </p>
                              )}
                              <p className="mt-2 font-mono text-[10px] text-text-dim">
                                {formatDate(notif.created_at || notif.createdAt)}
                              </p>
                            </div>
                            {isUnread && (
                              <Button
                                variant="ghost"
                                size="sm"
                                loading={isMarking}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkRead(id);
                                }}
                                className="flex-shrink-0 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
                              >
                                Mark Read
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
