/**
 * EngagementPanel — interest beacon + writeups block.
 *
 * Mounts under the "Resources" section on /problems/:slugOrId and
 * turns a read-only catalogue entry into a community board:
 *
 *   • Interest beacon — "🔥 I'm tackling this" toggle. Shows the
 *     total count and a small stack of recent-interest avatars so the
 *     viewer can SEE who else is working on this problem.
 *   • Writeup list   — markdown post-mortems other students have
 *     submitted, ordered by upvote count. Each card has an upvote
 *     toggle that updates the count optimistically.
 *   • Composer       — the viewer's own writeup (one per problem).
 *     Re-submit overwrites; "Remove" soft-deletes.
 *
 * One initial fetch (problems.engagement) populates the whole strip;
 * subsequent toggles are individual round-trips that update local
 * state in place. AbortController guards the initial fetch against
 * route changes.
 */

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { problems } from "@/lib/api";
import Loader from "@/components/ui/Loader";
import BookmarkButton from "@/components/ui/BookmarkButton";
import WriteupComments from "./WriteupComments";

export default function EngagementPanel({ slugOrId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(false);   // interest toggle in flight
  const [error,   setError]   = useState(null);

  // Composer state — controlled inputs, kept local so the parent
  // doesn't re-render on every keystroke.
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft,       setDraft]       = useState({ title: "", body: "", repo_url: "" });
  const [posting,     setPosting]     = useState(false);
  const [postError,   setPostError]   = useState(null);

  // Find my own writeup (if any) — used to seed the composer with
  // the existing record on edit, and to render the "Remove" button.
  const myWriteup = data?.writeups?.find((w) => w.is_mine) || null;

  // ── Initial fetch ────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    problems.engagement(slugOrId, { signal: ctrl.signal })
      .then(({ data }) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
        setError(err?.response?.data?.error || "Couldn't load community panel");
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [slugOrId]);

  // ── Toggle interest ──────────────────────────────────────────
  const onToggleInterest = useCallback(async () => {
    if (busy || !data) return;
    setBusy(true);
    // Optimistic — flip + adjust count immediately. Server response
    // is authoritative but the round trip can be 200ms+ on mobile.
    const before = data.i_am_interested;
    setData((d) => ({
      ...d,
      i_am_interested: !before,
      interest_count:  Math.max(0, (d.interest_count || 0) + (before ? -1 : 1)),
    }));
    try {
      const { data: resp } = await problems.toggleInterest(slugOrId);
      setData((d) => ({ ...d, i_am_interested: resp.i_am_interested }));
    } catch {
      // Roll back — server didn't confirm. Best-effort; if it 4xx'd
      // the user will see the old state and can try again.
      setData((d) => ({
        ...d,
        i_am_interested: before,
        interest_count:  Math.max(0, (d.interest_count || 0) + (before ? 1 : -1)),
      }));
    } finally {
      setBusy(false);
    }
  }, [busy, data, slugOrId]);

  // ── Vote on a writeup ────────────────────────────────────────
  const onVote = useCallback(async (writeupId) => {
    setData((d) => {
      if (!d) return d;
      return {
        ...d,
        writeups: d.writeups.map((w) =>
          w.id === writeupId
            ? { ...w, voted_by_me: !w.voted_by_me, vote_count: w.vote_count + (w.voted_by_me ? -1 : 1) }
            : w,
        ),
      };
    });
    try {
      const { data: resp } = await problems.voteWriteup(writeupId);
      setData((d) => ({
        ...d,
        writeups: d.writeups.map((w) =>
          w.id === writeupId ? { ...w, voted_by_me: resp.voted_by_me, vote_count: resp.vote_count } : w,
        ),
      }));
    } catch {
      // server rejected — roll back local optimistic flip
      setData((d) => ({
        ...d,
        writeups: d.writeups.map((w) =>
          w.id === writeupId
            ? { ...w, voted_by_me: !w.voted_by_me, vote_count: w.vote_count + (w.voted_by_me ? -1 : 1) }
            : w,
        ),
      }));
    }
  }, []);

  // ── Submit / update writeup ──────────────────────────────────
  const onSubmitWriteup = useCallback(async (e) => {
    e?.preventDefault();
    if (posting) return;
    if (!draft.title.trim() || !draft.body.trim()) {
      setPostError("Title and body are both required.");
      return;
    }
    setPosting(true);
    setPostError(null);
    try {
      const { data: row } = await problems.postWriteup(slugOrId, {
        title: draft.title.trim(),
        body:  draft.body.trim(),
        ...(draft.repo_url.trim() ? { repo_url: draft.repo_url.trim() } : {}),
      });
      // Splice into local state — replace existing "mine" row, else
      // prepend. Either way the list keeps its vote-ordered shape.
      setData((d) => {
        const rest = (d.writeups || []).filter((w) => !w.is_mine);
        return {
          ...d,
          writeups: [
            {
              id:            row.id,
              user_id:       row.user_id,
              title:         row.title,
              body:          row.body,
              repo_url:      row.repo_url,
              vote_count:    row.vote_count || 0,
              created_at:    row.created_at,
              author_name:   "You",
              author_avatar: null,
              voted_by_me:   false,
              is_mine:       true,
            },
            ...rest,
          ],
        };
      });
      setComposeOpen(false);
    } catch (err) {
      setPostError(err?.response?.data?.error || "Couldn't post writeup.");
    } finally {
      setPosting(false);
    }
  }, [posting, draft, slugOrId]);

  // ── Remove my writeup ────────────────────────────────────────
  const onRemoveMine = useCallback(async () => {
    if (!myWriteup) return;
    if (!confirm("Remove your writeup? You can always re-post.")) return;
    try {
      await problems.deleteWriteup(slugOrId, myWriteup.id);
      setData((d) => ({ ...d, writeups: d.writeups.filter((w) => !w.is_mine) }));
    } catch {
      alert("Couldn't remove. Try again.");
    }
  }, [myWriteup, slugOrId]);

  // ── Open composer pre-filled with my existing writeup ────────
  const openComposer = useCallback(() => {
    if (myWriteup) {
      setDraft({
        title:    myWriteup.title || "",
        body:     myWriteup.body  || "",
        repo_url: myWriteup.repo_url || "",
      });
    } else {
      setDraft({ title: "", body: "", repo_url: "" });
    }
    setPostError(null);
    setComposeOpen(true);
  }, [myWriteup]);

  // ── Render ───────────────────────────────────────────────────
  if (loading) {
    return (
      <motion.section
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="mt-10 rounded-2xl border border-line/15 bg-white/[0.02] p-6"
      >
        <Loader variant="orbit" />
      </motion.section>
    );
  }

  if (error || !data) {
    return (
      <p className="mt-10 rounded-2xl border border-line/10 bg-white/[0.02] p-4 text-center text-xs text-text-dim">
        {error || "No community data yet."}
      </p>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mt-10 space-y-6"
    >
      {/* ── Interest beacon strip ── */}
      <div className="rounded-2xl border border-line/15 bg-white/[0.025] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] text-text-dim">Working on this</h3>
            <p className="mt-1 text-sm text-text-soft">
              {data.interest_count === 0 ? (
                <>Be the first to mark this — others will see you working on it.</>
              ) : data.interest_count === 1 ? (
                <>1 student is tackling this problem.</>
              ) : (
                <>{data.interest_count} students are tackling this problem.</>
              )}
            </p>
            {data.interested_users?.length > 0 && (
              <div className="mt-3 flex -space-x-2">
                {data.interested_users.map((u) => (
                  <Avatar key={u.user_id} name={u.name} avatar_url={u.avatar_url} />
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleInterest}
            disabled={busy}
            className={
              "w-full shrink-0 rounded-xl px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition sm:w-auto sm:py-2 " +
              (data.i_am_interested
                ? "border border-primary/40 bg-primary/15 text-white hover:bg-primary/20"
                : "border border-line/25 bg-white/[0.04] text-text-soft hover:border-primary/40 hover:text-white")
            }
          >
            {data.i_am_interested ? "🔥 I'm on this" : "+ I'm tackling this"}
          </button>
        </div>
      </div>

      {/* ── Writeups ── */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] text-text-dim">
            Writeups · {data.writeups?.length || 0}
          </h3>
          <button
            type="button"
            onClick={openComposer}
            className="rounded-lg border border-line/25 bg-white/[0.04] px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-text-soft transition hover:border-primary/40 hover:text-white sm:py-1.5"
          >
            {myWriteup ? "Edit my writeup" : "+ Post a writeup"}
          </button>
        </div>

        {composeOpen && (
          <ComposerForm
            draft={draft}
            setDraft={setDraft}
            onSubmit={onSubmitWriteup}
            onCancel={() => setComposeOpen(false)}
            onRemoveMine={myWriteup ? onRemoveMine : null}
            posting={posting}
            postError={postError}
          />
        )}

        {data.writeups?.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line/15 bg-white/[0.015] p-5 text-center text-xs text-text-dim">
            No writeups yet. Be the first to post your approach.
          </p>
        ) : (
          <div className="space-y-3">
            {data.writeups.map((w) => (
              <WriteupCard key={w.id} w={w} onVote={() => onVote(w.id)} />
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Avatar({ name, avatar_url }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      className="flex h-7 w-7 items-center justify-center rounded-full border border-bg/60 bg-white/[0.08] font-mono text-[10px] text-text-soft"
      title={name}
    >
      {avatar_url ? (
        <img src={avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
      ) : initial}
    </div>
  );
}

function WriteupCard({ w, onVote }) {
  return (
    <article className="rounded-xl border border-line/15 bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={w.author_name} avatar_url={w.author_avatar} />
          <span className="truncate text-xs text-text-muted">
            {w.is_mine ? "Your writeup" : w.author_name}
          </span>
          <span className="font-mono text-[10px] text-text-dim">
            · {new Date(w.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {/* Save writeup for later */}
          <BookmarkButton type="writeup" id={w.id} compact />
          <button
            type="button"
            onClick={onVote}
            className={
              "shrink-0 rounded-full px-3 py-1.5 font-mono text-[11px] transition sm:py-1 " +
              (w.voted_by_me
                ? "border border-primary/40 bg-primary/15 text-white"
                : "border border-line/20 bg-white/[0.04] text-text-soft hover:border-primary/40")
            }
            aria-label={w.voted_by_me ? "Remove upvote" : "Upvote"}
          >
            ▲ {w.vote_count}
          </button>
        </div>
      </header>
      <h4 className="mt-2.5 text-base font-semibold text-white">{w.title}</h4>
      <Prose text={w.body} />
      {w.repo_url && (
        <a
          href={w.repo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 break-all font-mono text-[11px] text-primary hover:underline"
        >
          ↗ {w.repo_url.replace(/^https?:\/\//, "").slice(0, 60)}
        </a>
      )}
      <WriteupComments writeupId={w.id} initialCount={w.comment_count || 0} />
    </article>
  );
}

function ComposerForm({ draft, setDraft, onSubmit, onCancel, onRemoveMine, posting, postError }) {
  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
      <input
        type="text"
        placeholder="Title — e.g. 'Solved with a sliding window in 40 lines'"
        value={draft.title}
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        maxLength={200}
        className="w-full rounded-lg border border-line/15 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-text-dim focus:border-primary/50 focus:outline-none"
      />
      <textarea
        placeholder="Approach, gotchas, what you'd do differently. Markdown is rendered as plain paragraphs."
        value={draft.body}
        onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
        maxLength={16000}
        rows={7}
        className="mt-2 w-full resize-y rounded-lg border border-line/15 bg-white/[0.03] px-3 py-2 text-sm text-text-soft placeholder:text-text-dim focus:border-primary/50 focus:outline-none"
      />
      <input
        type="url"
        placeholder="Repo URL (optional) — github.com/..."
        value={draft.repo_url}
        onChange={(e) => setDraft((d) => ({ ...d, repo_url: e.target.value }))}
        maxLength={500}
        className="mt-2 w-full rounded-lg border border-line/15 bg-white/[0.03] px-3 py-2 font-mono text-xs text-text-soft placeholder:text-text-dim focus:border-primary/50 focus:outline-none"
      />
      {postError && (
        <p className="mt-2 text-xs text-danger">{postError}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {onRemoveMine && (
          <button
            type="button"
            onClick={onRemoveMine}
            className="mr-auto rounded-lg border border-danger/30 bg-danger/8 px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-danger transition hover:bg-danger/12 sm:py-1.5"
          >
            Remove
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-line/20 bg-white/[0.04] px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-text-soft transition hover:text-white sm:py-1.5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={posting}
          className="rounded-lg border border-primary/40 bg-primary/15 px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-white transition hover:bg-primary/20 disabled:opacity-50 sm:py-1.5"
        >
          {posting ? "Posting…" : (onRemoveMine ? "Save changes" : "Post writeup")}
        </button>
      </div>
    </form>
  );
}

function Prose({ text }) {
  if (!text) return null;
  const paragraphs = String(text).split(/\n\n+/).filter(Boolean);
  return (
    <div className="mt-2 space-y-2 break-words text-sm leading-7 text-text-soft">
      {paragraphs.map((para, i) => (
        <p key={i} className="whitespace-pre-wrap">{para}</p>
      ))}
    </div>
  );
}
