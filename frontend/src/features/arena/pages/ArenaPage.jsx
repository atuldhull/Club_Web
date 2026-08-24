import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import MonumentHero from "@/components/monument/MonumentHero";
import { useMonument } from "@/hooks/useMonument";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import { arena, challenges, leaderboard, comments as commentsApi } from "@/lib/api";
import MathRender from "@/components/math/MathRender";

function getDiffBadgeStyle(d) {
  const key = (d || "medium").toLowerCase();
  const map = {
    easy: { background: "rgba(45,212,191,0.15)", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.3)" },
    medium: { background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" },
    hard: { background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" },
    extreme: { background: "rgba(110,231,255,0.15)", color: "#6ee7ff", border: "1px solid rgba(110,231,255,0.3)" },
  };
  return { clipPath: "var(--clip-para)", padding: "0.25rem 0.85rem", ...map[key] || map.medium };
}

export default function ArenaPage() {
  useMonument("desert");
  const [challenge, setChallenge] = useState(null);
  const [weeklyBoard, setWeeklyBoard] = useState([]);
  const [arenaStats, setArenaStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [difficulty, setDifficulty] = useState("All");
  const [timer, setTimer] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);
  const [commentsList, setCommentsList] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [aiAsking, setAiAsking] = useState(false);
  const [noMore, setNoMore] = useState(false);

  // Load a random challenge automatically
  const loadRandomChallenge = async (diff) => {
    setLoading(true);
    setResult(null);
    setSelectedAnswer(null);
    setNoMore(false);
    try {
      const { data } = await challenges.next(diff === "All" ? undefined : diff.toLowerCase());
      if (data && data.id) {
        setChallenge(data);
      } else {
        setNoMore(true);
        setChallenge(null);
      }
    } catch {
      setNoMore(true);
      setChallenge(null);
    }
    setLoading(false);
  };

  // Load comments when challenge selected
  useEffect(() => {
    if (!challenge) { setCommentsList([]); return; }
    commentsApi.list(challenge.id).then((r) => setCommentsList(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [challenge]);

  const postComment = async () => {
    if (!commentInput.trim() || !challenge) return;
    setCommentLoading(true);
    try {
      await commentsApi.post(challenge.id, commentInput);
      setCommentInput("");
      const { data } = await commentsApi.list(challenge.id);
      setCommentsList(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setCommentLoading(false);
  };

  const askAi = async () => {
    if (!commentInput.trim() || !challenge) return;
    setAiAsking(true);
    try {
      await commentsApi.post(challenge.id, commentInput);
      await commentsApi.askAi(challenge.id, commentInput, challenge.title);
      setCommentInput("");
      const { data } = await commentsApi.list(challenge.id);
      setCommentsList(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setAiAsking(false);
  };

  // Timer
  useEffect(() => {
    if (!challenge || result) { clearInterval(timerRef.current); return; }
    const timeLimit = { easy: 120, medium: 180, hard: 300, extreme: 600 };
    const secs = timeLimit[(challenge.difficulty || "medium").toLowerCase()] || 180;
    setTimer(secs);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [challenge, result]);

  // Cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // Initial load — fetch stats, leaderboard, and first random challenge
  useEffect(() => {
    Promise.all([
      leaderboard.weekly().catch(() => ({ data: [] })),
      arena.stats().catch(() => ({ data: null })),
    ]).then(([lb, st]) => {
      setWeeklyBoard(Array.isArray(lb.data) ? lb.data : []);
      setArenaStats(st.data);
    });
    loadRandomChallenge(difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (selectedAnswer === null || cooldown > 0 || !challenge) return;
    setSubmitting(true);
    setResult(null);
    clearInterval(timerRef.current);
    try {
      const { data } = await arena.submit(challenge.id, selectedAnswer);
      setResult(data);
      setCooldown(5);
      // Refresh stats
      arena.stats().then((r) => setArenaStats(r.data)).catch(() => {});
    } catch (err) {
      setResult({ error: err.response?.data?.error || "Submission failed" });
    }
    setSubmitting(false);
  };

  const handleNext = () => {
    loadRandomChallenge(difficulty);
  };

  const handleDifficultyChange = (d) => {
    setDifficulty(d);
    loadRandomChallenge(d);
  };

  return (
    <div style={{ position: "relative" }}>
      <MonumentBackground monument="desert" intensity={0.18} />

      {/* Ambient math glyphs — desert-themed (warning/gold tint) to
          match the page's monument backdrop. Same visual signature
          as auth + dashboard + events; the family of decoration
          binds every surface in the app together. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 select-none">
        <span className="math-text absolute left-[4%] top-[10%] text-[9rem] text-warning/[0.04]">∂</span>
        <span className="math-text absolute right-[6%] top-[18%] text-[8rem] text-white/[0.03]">θ</span>
        <span className="math-text absolute left-[12%] top-[62%] text-[6rem] text-white/[0.03]">∮</span>
        <span className="math-text absolute right-[8%] bottom-[12%] text-[7rem] text-primary/[0.04]">Δ</span>
        <span className="math-text absolute left-[46%] top-[42%] text-[5rem] text-white/[0.025]">ξ</span>
      </div>

      <div className="relative z-10 space-y-10 pb-16">
        <MonumentHero
          monument="desert"
          title="The Arena"
          subtitle="Challenge Zone"
          description="Random challenges. Solve them. Earn points. Climb the leaderboard."
        >
          {arenaStats && (
            <div className="flex flex-wrap justify-center gap-6">
              <div className="text-center">
                <p className="math-text text-2xl font-bold text-white">{arenaStats.total || 0}</p>
                <p className="font-mono text-[10px] text-text-dim">Attempts</p>
              </div>
              <div className="text-center">
                <p className="math-text text-2xl font-bold text-success">{arenaStats.correct || 0}</p>
                <p className="font-mono text-[10px] text-text-dim">Correct</p>
              </div>
              <div className="text-center">
                <p className="math-text text-2xl font-bold text-primary">{arenaStats.totalXP || 0}</p>
                <p className="font-mono text-[10px] text-text-dim">Total XP</p>
              </div>
              <div className="text-center">
                <p className="math-text text-2xl font-bold text-warning">{arenaStats.accuracy || 0}%</p>
                <p className="font-mono text-[10px] text-text-dim">Accuracy</p>
              </div>
            </div>
          )}
        </MonumentHero>

        {/* Difficulty filter — stacks label above buttons on mobile
           so the label + 5 pills don't wrap awkwardly on ~375px. */}
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim">Difficulty:</span>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {["All", "Easy", "Medium", "Hard", "Extreme"].map((d) => (
              <Button
                key={d}
                variant={difficulty === d ? "primary" : "ghost"}
                size="sm"
                onClick={() => handleDifficultyChange(d)}
              >
                {d}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
          <div>
            {/* Loading state */}
            {loading && (
              <div className="flex min-h-[40vh] items-center justify-center">
                <Loader variant="orbit" size="lg" label="Loading challenge..." />
              </div>
            )}

            {/* No more challenges */}
            {!loading && noMore && (
              <div className="py-16 text-center">
                <svg
                  aria-hidden="true"
                  className="mx-auto h-14 w-14 text-text-dim/50"
                  viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={1.4}
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                </svg>
                <p className="mt-4 text-lg text-text-muted">No more challenges available</p>
                <p className="mt-2 text-sm text-text-dim">You've solved them all or none match this difficulty. Check back later!</p>
                <Button variant="secondary" className="mt-6" onClick={() => handleDifficultyChange("All")}>
                  Try All Difficulties
                </Button>
              </div>
            )}

            {/* Active Challenge */}
            {!loading && challenge && (
              <motion.section
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto max-w-3xl"
              >
                <Card variant="glow">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-block font-mono text-[10px] uppercase" style={getDiffBadgeStyle(challenge.difficulty)}>
                        {challenge.difficulty || "Medium"}
                      </span>
                      <span className="math-text text-[11px] text-primary">{challenge.points || 50} pts</span>
                      {!result && timer > 0 && (
                        <span className={`math-text rounded-full border px-3 py-0.5 text-xs font-bold ${
                          timer <= 30 ? "animate-pulse border-danger/40 bg-danger/10 text-danger" : timer <= 60 ? "border-warning/30 bg-warning/10 text-warning" : "border-line/20 bg-white/5 text-text-muted"
                        }`}>
                          {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
                        </span>
                      )}
                      {!result && timer === 0 && (
                        <span className="math-text rounded-full border border-danger/40 bg-danger/10 px-3 py-0.5 text-xs font-bold text-danger">
                          Time's up!
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleNext}>
                      Skip
                    </Button>
                  </div>

                  {/* Question — math segments rendered via KaTeX so
                      authored $\int_0^1 x\,dx$ shows as a real integral. */}
                  <h2 className="mt-4 font-display text-2xl font-bold text-white">{challenge.title}</h2>
                  <div className="overflow-x-auto">
                    <MathRender
                      source={String(challenge.question || "")}
                      className="mt-3 text-sm leading-7 text-text-muted [&_.katex]:text-text-muted"
                    />
                  </div>

                  {/* Options */}
                  {!result && (
                    <div className="mt-6 space-y-3">
                      {(challenge.options || []).length === 0 && (
                        <p className="text-sm text-danger">This question has no options. Skipping...</p>
                      )}
                      {(challenge.options || []).map((opt, i) => (
                        <motion.button
                          key={i}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedAnswer(i)}
                          className={`w-full border px-4 py-3 text-left text-sm transition-all duration-200 ${
                            selectedAnswer === i
                              ? "border-primary/40 bg-primary/15 text-white shadow-[0_0_16px_var(--page-glow)]"
                              : "border-line/15 bg-white/[0.03] text-text-muted hover:border-primary/25 hover:text-white"
                          }`}
                          style={{ clipPath: "var(--clip-notch)" }}
                        >
                          <span className="math-text mr-3 text-xs text-primary">{String.fromCharCode(65 + i)}.</span>
                          <MathRender source={String(opt || "")} className="inline break-words [&_.katex]:text-current [&_.katex]:whitespace-normal" />
                        </motion.button>
                      ))}
                      <Button
                        onClick={handleSubmit}
                        loading={submitting}
                        disabled={selectedAnswer === null || (challenge.options || []).length === 0}
                        className="mt-4 w-full justify-center"
                      >
                        Submit Answer
                      </Button>
                    </div>
                  )}

                  {/* Result */}
                  {result && !result.error && (
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="mt-6 space-y-4">
                      <div className={`border px-5 py-4 text-center ${
                        result.correct ? "border-success/30 bg-success/10" : "border-danger/30 bg-danger/10"
                      }`} style={{ clipPath: "var(--clip-notch)" }}>
                        <p className={`font-display text-2xl font-bold ${result.correct ? "text-success" : "text-danger"}`}>
                          {result.correct ? "Correct!" : "Incorrect"}
                        </p>
                        {result.correct && result.xpEarned > 0 && <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }} className="math-text mt-1 text-sm text-success">+{result.xpEarned} XP earned</motion.p>}
                        {!result.correct && result.xpEarned < 0 && <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }} className="math-text mt-1 text-sm text-danger">{result.xpEarned} XP penalty</motion.p>}
                        {result.alreadySolved && <p className="mt-1 text-xs text-text-dim">Already solved before</p>}
                      </div>
                      {/* Show correct answer */}
                      {!result.correct && challenge.options && (
                        <div className="rounded-xl border border-success/15 bg-success/5 px-4 py-3">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-success">Correct Answer</p>
                          <p className="mt-1 text-sm text-white">
                            <span className="math-text mr-2 text-success">{String.fromCharCode(65 + (challenge.correct_index ?? 0))}.</span>
                            {challenge.options[challenge.correct_index ?? 0]}
                          </p>
                        </div>
                      )}
                      {result.solution && (
                        <div className="rounded-xl border border-line/15 bg-black/15 px-4 py-3">
                          <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim">Solution</p>
                          <p className="mt-2 text-sm text-text-muted whitespace-pre-wrap">{result.solution}</p>
                        </div>
                      )}
                      <Button variant="secondary" onClick={handleNext} disabled={cooldown > 0} className="w-full justify-center">
                        {cooldown > 0 ? `Next Challenge (${cooldown}s)` : "Next Challenge"}
                      </Button>
                    </motion.div>
                  )}
                  {result?.error && (
                    <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                      {result.error}
                    </div>
                  )}

                  {/* Discussion */}
                  <div className="mt-6 border-t border-line/15 pt-5">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim">Discussion</p>
                    <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                      {commentsList.length === 0 && <p className="text-xs text-text-dim">No comments yet. Be the first!</p>}
                      {commentsList.map((c) => (
                        <div key={c.id} className={`rounded-lg px-3 py-2 text-xs ${c.is_ai ? "border border-primary/15 bg-primary/5 text-text-muted" : "bg-white/[0.03] text-text-muted"}`}>
                          <span className="font-medium text-white">{c.user_name}</span>
                          {c.is_ai && <span className="ml-1.5 rounded bg-primary/15 px-1 py-0.5 font-mono text-[8px] text-primary">AI</span>}
                          <span className="ml-2 font-mono text-[9px] text-text-dim">{c.created_at ? new Date(c.created_at).toLocaleString() : ""}</span>
                          <p className="mt-1 whitespace-pre-wrap">{c.content}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input type="text" value={commentInput} onChange={(e) => setCommentInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && postComment()}
                        placeholder="Comment or ask a question..."
                        className="min-w-0 flex-1 basis-full rounded-lg border border-line/15 bg-black/15 px-3 py-2 text-xs text-white outline-none focus:border-primary/30 sm:basis-auto" />
                      <Button variant="ghost" size="sm" onClick={postComment} disabled={commentLoading || !commentInput.trim()}>
                        Post
                      </Button>
                      <Button variant="secondary" size="sm" onClick={askAi} disabled={aiAsking || !commentInput.trim()}>
                        {aiAsking ? "..." : "Ask AI 🐼"}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.section>
            )}
          </div>

          {/* Leaderboard sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <Card variant="solid" className="xl:sticky xl:top-24">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Weekly Leaderboard</p>
              <h3 className="mt-2 font-display text-xl font-bold text-white">Top Performers</h3>
              <div className="mt-5 space-y-3">
                {weeklyBoard.length === 0 && (
                  <p className="py-4 text-center text-sm text-text-dim">No rankings yet</p>
                )}
                {weeklyBoard.slice(0, 10).map((player, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl border border-line/10 bg-black/15 px-4 py-3">
                    <span className={`math-text flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      i === 0 ? "bg-warning/20 text-warning" : i === 1 ? "bg-text-muted/15 text-text-muted" : i === 2 ? "bg-warning/10 text-warning/70" : "bg-white/5 text-text-dim"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{player.name || player.student_name}</p>
                    </div>
                    <span className="math-text text-lg font-bold text-primary">{player.weekly_xp || player.xp || 0}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
