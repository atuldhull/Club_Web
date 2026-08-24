import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import MathRender from "@/components/math/MathRender";

const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard", "Extreme"];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

export default function AIGenerator({
  aiTopics,
  setAiTopics,
  aiCount,
  setAiCount,
  aiDifficulty,
  setAiDifficulty,
  aiGenerating,
  aiResult,
  handleAiBulk,
}) {
  return (
    <motion.div custom={1} variants={fadeUp}>
      <Card variant="glass">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">
          AI Powered
        </p>
        <h3 className="mt-2 font-display text-xl font-bold text-white">
          Bulk Question Generator
        </h3>

        <div className="mt-5 space-y-4">
          {/* Topics */}
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
              Topics (comma-separated)
            </label>
            <textarea
              placeholder="e.g. Algebra, Geometry, Probability, Number Theory"
              value={aiTopics}
              onChange={(e) => setAiTopics(e.target.value)}
              rows={3}
              className="w-full resize-y rounded-xl border border-line/15 bg-surface/50 px-4 py-3 text-sm text-white placeholder-text-dim backdrop-blur outline-none transition focus:border-primary/30"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Count */}
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                Number of Questions
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={aiCount}
                onChange={(e) =>
                  setAiCount(Math.max(1, Math.min(50, Number(e.target.value))))
                }
                className="w-full rounded-xl border border-line/15 bg-surface/50 px-4 py-3 text-sm text-white backdrop-blur outline-none transition focus:border-primary/30"
              />
            </div>

            {/* Difficulty */}
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                Difficulty
              </label>
              <select
                value={aiDifficulty}
                onChange={(e) => setAiDifficulty(e.target.value)}
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

          <Button
            onClick={handleAiBulk}
            loading={aiGenerating}
            disabled={!aiTopics.trim()}
            size="sm"
            variant="secondary"
          >
            {aiGenerating ? "Generating..." : "Generate Questions"}
          </Button>

          {/* AI result preview */}
          <AnimatePresence>
            {aiResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-secondary">
                    Generated{" "}
                    {aiResult.questions?.length || aiResult.length || 0}{" "}
                    questions
                  </p>
                  <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                    {(aiResult.questions || aiResult || []).slice(0, 10).map((q, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-line/10 bg-black/10 px-3 py-2"
                      >
                        {/* Render through MathRender so AI-generated $\\frac{a}{b}$
                            shows as a real fraction instead of raw LaTeX source. */}
                        <div className="text-sm text-white overflow-x-auto [&_.katex]:whitespace-nowrap">
                          <span className="mr-2 font-mono text-text-dim">{i + 1}.</span>
                          <MathRender source={String(q.title || q.question || q.text || "")} className="inline [&_.katex]:text-white" />
                        </div>
                        <p className="mt-1 font-mono text-[10px] text-text-dim">
                          {q.difficulty || aiDifficulty} &middot; {q.topic || "General"}
                        </p>
                      </div>
                    ))}
                    {(aiResult.questions?.length || aiResult.length || 0) > 10 && (
                      <p className="py-2 text-center text-xs text-text-dim">
                        ...and {(aiResult.questions?.length || aiResult.length) - 10} more
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}
