import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { chat } from "@/lib/api";

export default function FriendsSection() {
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [tab, setTab] = useState("friends");
  const [loadingFriends, setLoadingFriends] = useState(true);

  useEffect(() => {
    Promise.all([
      chat.getFriends().catch(() => ({ data: [] })),
      chat.getPending().catch(() => ({ data: [] })),
    ]).then(([f, p]) => {
      setFriends(f.data || []);
      setPending(p.data || []);
      setLoadingFriends(false);
    });
  }, []);

  const handleSearch = async (q) => {
    setSearch(q);
    if (q.length < 2) { setResults([]); return; }
    try {
      const { data } = await chat.searchUsers(q);
      setResults(data || []);
    } catch { setResults([]); }
  };

  return (
    <Card variant="solid">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">
          Friends & Messages
        </p>
        {pending.length > 0 && (
          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {pending.length}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-3 flex gap-1 rounded-lg bg-white/[0.03] p-0.5">
        {[
          { key: "friends", label: `Friends (${friends.length})` },
          { key: "requests", label: `Requests${pending.length ? ` (${pending.length})` : ""}` },
          { key: "find", label: "Find People" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition ${
              tab === t.key ? "bg-primary/15 text-white" : "text-text-dim hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
        {/* Friends tab */}
        {tab === "friends" && (
          loadingFriends ? (
            <p className="py-4 text-center text-xs text-text-dim">Loading...</p>
          ) : friends.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xl">👥</p>
              <p className="mt-2 text-xs text-text-dim">No friends yet</p>
              <button onClick={() => setTab("find")} className="mt-2 text-[10px] text-primary hover:underline">
                Find people to connect with
              </button>
            </div>
          ) : (
            friends.map((f) => (
              <Link
                key={f.user_id}
                to={`/student/${f.user_id}`}
                className="flex items-center gap-3 rounded-xl border border-line/5 bg-black/10 px-3 py-2.5 transition hover:border-primary/20 hover:bg-primary/5"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                  style={{ background: f.avatar_color || "linear-gradient(135deg,#7c3aed,#3b82f6)" }}
                >
                  {f.avatar_emoji || f.name?.charAt(0) || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{f.name}</p>
                  <p className="text-[9px] text-text-dim">{f.title || "Student"} · {(f.xp || 0).toLocaleString()} XP</p>
                </div>
                <svg className="h-4 w-4 shrink-0 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </Link>
            ))
          )
        )}

        {/* Requests tab */}
        {tab === "requests" && (
          pending.length === 0 ? (
            <p className="py-6 text-center text-xs text-text-dim">No pending requests</p>
          ) : (
            pending.map((req) => (
              <div key={req.id} className="flex items-center gap-2.5 rounded-xl border border-line/5 bg-black/10 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{req.requester?.name || "User"}</p>
                  <p className="truncate text-[10px] text-text-dim">{req.requester?.email || ""}</p>
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    await chat.respondRequest(req.id, true);
                    setPending((p) => p.filter((r) => r.id !== req.id));
                    chat.getFriends().then((r) => setFriends(r.data || []));
                  }}
                >
                  Accept
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await chat.respondRequest(req.id, false);
                    setPending((p) => p.filter((r) => r.id !== req.id));
                  }}
                >
                  ✕
                </Button>
              </div>
            ))
          )
        )}

        {/* Find People tab */}
        {tab === "find" && (
          <>
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-xl border border-line/15 bg-black/15 px-3 py-2 text-sm text-white outline-none focus:border-primary/30"
            />
            {results.length === 0 && search.length >= 2 && (
              <p className="py-4 text-center text-xs text-text-dim">No one found</p>
            )}
            {results.map((u) => (
              <div key={u.user_id} className="flex items-center gap-2.5 rounded-xl border border-line/5 bg-black/10 px-3 py-2.5">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                  style={{ background: u.avatar_color || "linear-gradient(135deg,#7c3aed,#3b82f6)" }}
                >
                  {u.avatar_emoji || u.name?.charAt(0) || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{u.name}</p>
                  <p className="text-[9px] text-text-dim">{(u.xp || 0).toLocaleString()} XP</p>
                </div>
                <Link
                  to={`/student/${u.user_id}`}
                  className="rounded-lg bg-primary/15 px-2.5 py-1 text-[10px] font-medium text-primary transition hover:bg-primary/25"
                >
                  View Profile
                </Link>
              </div>
            ))}
          </>
        )}
      </div>
    </Card>
  );
}
