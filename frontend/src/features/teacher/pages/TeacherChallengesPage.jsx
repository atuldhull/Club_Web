import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { teacher } from "@/lib/api";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import { useMonument } from "@/hooks/useMonument";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

const difficultyColors = {
  Easy: "text-success",
  Medium: "text-warning",
  Hard: "text-danger",
  Extreme: "text-glow",
};

const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard", "Extreme"];

export default function TeacherChallengesPage() {
  useMonument("magma");
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // AI generation state
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [saving, setSaving] = useState(false);
  const [genError, setGenError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchChallenges();
  }, []);

  async function fetchChallenges() {
    try {
      setLoading(true);
      const res = await teacher.challenges();
      setChallenges(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id) {
    try {
      setTogglingId(id);
      await teacher.toggleChallenge(id);
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, is_active: !c.is_active } : c,
        ),
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to toggle challenge");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleGenerate() {
    if (!topic.trim()) return;
    try {
      setGenerating(true);
      setGenError(null);
      setGenerated(null);
      setSaveSuccess(false);
      const res = await teacher.generate(topic, difficulty);
      setGenerated(res.data);
    } catch (err) {
      // Distinguish "backend sent an error reason" from "the request
      // never reached the server" (CORS, offline, timeout with no
      // response). Users were seeing a bare "AI generation failed"
      // when axios had no response object at all — now they see a
      // specific hint that points at the right place to look.
      const data = err?.response?.data;
      const status = err?.response?.status;
      let msg;
      if (data?.error || data?.message) {
        msg = data.error || data.message;
      } else if (!err?.response) {
        msg = `Network error — the request didn't reach the server (${err?.code || err?.message || "unknown"}). Check your connection and try again.`;
      } else {
        msg = `AI generation failed (HTTP ${status}). Try again or lower the difficulty.`;
      }
      setGenError(msg);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveQuestion() {
    if (!generated) return;
    try {
      setSaving(true);
      await teacher.saveQuestion(generated);
      setSaveSuccess(true);
      setGenerated(null);
      setTopic("");
      // Refresh challenges list
      fetchChallenges();
    } catch (err) {
      setGenError(err.response?.data?.message || "Failed to save question");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ position: "relative" }}>
        <MonumentBackground monument="magma" intensity={0.1} />
        <div className="space-y-6">
          <div className="h-12 w-64 animate-pulse rounded-xl bg-surface/40" />
          <div className="h-96 animate-pulse rounded-[1.75rem] border border-line/15 bg-surface/40" />
          <div className="h-64 animate-pulse rounded-[1.75rem] border border-line/15 bg-surface/40" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
    <MonumentBackground monument="magma" intensity={0.1} />
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Challenge Manager</h2>
          <p className="text-sm text-text-muted">{challenges.length} total challenges</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Challenge table */}
      <motion.div custom={0} variants={fadeUp}>
        <Card variant="solid" className="overflow-hidden">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
            Question Bank
          </p>
          <h3 className="mt-2 font-display text-xl font-bold text-white">
            All Challenges
          </h3>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line/10 font-mono text-[10px] uppercase tracking-wider text-text-dim">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Difficulty</th>
                  <th className="px-4 py-3">Points</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {challenges.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-text-dim">
                      No challenges found. Generate one below!
                    </td>
                  </tr>
                ) : (
                  challenges.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-line/5 transition hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 font-medium text-white">{c.title}</td>
                      <td
                        className={`px-4 py-3 font-mono text-xs ${
                          difficultyColors[c.difficulty] || "text-text-muted"
                        }`}
                      >
                        {c.difficulty}
                      </td>
                      <td className="px-4 py-3 font-mono text-primary">{c.points ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase ${
                            c.is_active
                              ? "bg-success/10 text-success"
                              : "bg-warning/10 text-warning"
                          }`}
                        >
                          {c.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggle(c.id)}
                          disabled={togglingId === c.id}
                          className={`font-mono text-[11px] transition ${
                            togglingId === c.id
                              ? "text-text-dim"
                              : c.is_active
                                ? "text-warning hover:text-danger"
                                : "text-success hover:text-primary"
                          }`}
                        >
                          {togglingId === c.id
                            ? "..."
                            : c.is_active
                              ? "Deactivate"
                              : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* AI Question Generation */}
      <motion.div custom={1} variants={fadeUp}>
        <Card variant="glass">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">
            AI Powered
          </p>
          <h3 className="mt-2 font-display text-xl font-bold text-white">
            Question Generator
          </h3>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                Topic
              </label>
              <input
                type="text"
                placeholder="e.g. Quadratic equations, Probability, Set theory..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-xl border border-line/15 bg-surface/50 px-4 py-3 text-sm text-white placeholder-text-dim backdrop-blur outline-none transition focus:border-primary/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full rounded-xl border border-line/15 bg-surface/50 px-4 py-3 text-sm text-white backdrop-blur outline-none transition focus:border-primary/30"
              >
                {DIFFICULTY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <Button
              onClick={handleGenerate}
              loading={generating}
              disabled={!topic.trim()}
              size="sm"
              variant="primary"
            >
              {generating ? "Generating..." : "Generate Question"}
            </Button>
          </div>

          {genError && (
            <div className="mt-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              {genError}
            </div>
          )}

          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success"
            >
              Question saved to bank successfully!
            </motion.div>
          )}

          {/* Generated preview */}
          <AnimatePresence>
            {generated && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-5 overflow-hidden"
              >
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
                    Generated Preview
                  </p>
                  <h4 className="mt-2 text-lg font-bold text-white">
                    {generated.title || "Untitled Question"}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {generated.question || generated.text}
                  </p>

                  {generated.options && (
                    <div className="mt-3 space-y-2">
                      {generated.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`rounded-lg border px-3 py-2 text-sm ${
                            i === generated.correct_index || i === generated.correctIndex || i === generated.answer
                              ? "border-success/30 bg-success/10 text-success"
                              : "border-line/10 bg-black/10 text-text-muted"
                          }`}
                        >
                          <span className="mr-2 font-mono text-xs">
                            {String.fromCharCode(65 + i)}.
                          </span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {(generated.explanation || generated.solution) && (
                    <div className="mt-3 rounded-lg border border-line/10 bg-black/10 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                        Explanation
                      </p>
                      <p className="mt-1 text-sm text-text-muted">{generated.explanation || generated.solution}</p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      onClick={handleSaveQuestion}
                      loading={saving}
                      size="sm"
                      variant="secondary"
                    >
                      Save to Bank
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      loading={generating}
                      size="sm"
                      variant="primary"
                    >
                      Regenerate
                    </Button>
                    <Button
                      onClick={() => setGenerated(null)}
                      size="sm"
                      variant="ghost"
                    >
                      Discard
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </motion.div>
    </div>
  );
}
