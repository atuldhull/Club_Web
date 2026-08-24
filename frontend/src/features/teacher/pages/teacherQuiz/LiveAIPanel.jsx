import Button from "@/components/ui/Button";

const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard", "Extreme"];

/**
 * Inline AI generation panel used inside the Live Quiz Host setup view.
 * Generates questions, lets the teacher review/select them, then saves chosen
 * ones to the question bank so they appear in the picker immediately.
 */
export default function LiveAIPanel({
  aiTopics,
  setAiTopics,
  aiCount,
  setAiCount,
  aiDifficulty,
  setAiDifficulty,
  aiGenerating,
  setAiGenerating,
  aiResult,
  setAiResult,
  setChallengePool,
  setError,
  setSuccess,
}) {
  return (
    <div>
      <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
        Or Generate with AI 🐼
      </label>
      <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 space-y-3">
        <div>
          <label className="mb-1 block text-[10px] text-text-dim">Topics (comma separated)</label>
          <input
            type="text"
            value={aiTopics}
            onChange={(e) => setAiTopics(e.target.value)}
            placeholder="Calculus, Number Theory, Probability"
            className="w-full rounded-lg border border-line/15 bg-black/15 px-3 py-2 text-xs text-white outline-none focus:border-primary/30"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] text-text-dim">Count</label>
            <input
              type="number"
              min="1"
              max="20"
              value={aiCount}
              onChange={(e) => setAiCount(Number(e.target.value))}
              className="w-full rounded-lg border border-line/15 bg-black/15 px-3 py-2 text-xs text-white outline-none focus:border-primary/30"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[10px] text-text-dim">Difficulty</label>
            <select
              value={aiDifficulty}
              onChange={(e) => setAiDifficulty(e.target.value)}
              className="w-full rounded-lg border border-line/15 bg-black/15 px-3 py-2 text-xs text-white outline-none"
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
          size="sm"
          loading={aiGenerating}
          onClick={async () => {
            if (!aiTopics.trim()) { setError("Enter at least one topic"); return; }
            setAiGenerating(true);
            setAiResult(null);
            try {
              const { quiz } = await import("@/lib/api");
              const { data } = await quiz.aiBulk({
                topics: aiTopics.split(",").map((t) => t.trim()).filter(Boolean),
                count: aiCount,
                difficulty: aiDifficulty,
                saveToBank: false,
              });
              const qs = (data.questions || []).map((q, i) => ({ ...q, _selected: true, _idx: i }));
              setAiResult({ ...data, questions: qs });
              setSuccess(
                `Generated ${data.generated || qs.length} questions — review below and save the ones you like`,
              );
            } catch (err) {
              setError(err.response?.data?.error || "AI generation failed");
            }
            setAiGenerating(false);
          }}
        >
          Generate {aiCount} Questions
        </Button>

        {/* AI result: full preview with accept/reject per question */}
        {aiResult && aiResult.questions && aiResult.questions.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] text-success">
                {aiResult.questions.length} generated — pick the ones you want to save
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setAiResult({
                      ...aiResult,
                      questions: aiResult.questions.map((q) => ({ ...q, _selected: true })),
                    })
                  }
                  className="rounded px-2 py-2 -my-1 font-mono text-[11px] text-primary hover:underline"
                >
                  Select all
                </button>
                <button
                  onClick={() =>
                    setAiResult({
                      ...aiResult,
                      questions: aiResult.questions.map((q) => ({ ...q, _selected: false })),
                    })
                  }
                  className="rounded px-2 py-2 -my-1 font-mono text-[11px] text-text-dim hover:underline"
                >
                  Deselect all
                </button>
              </div>
            </div>

            <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
              {aiResult.questions.map((q, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-3 transition ${
                    q._selected
                      ? "border-primary/25 bg-primary/5"
                      : "border-line/10 bg-black/10 opacity-60"
                  }`}
                >
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={q._selected}
                      onChange={() => {
                        const updated = [...aiResult.questions];
                        updated[i] = { ...updated[i], _selected: !updated[i]._selected };
                        setAiResult({ ...aiResult, questions: updated });
                      }}
                      className="mt-1 accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white">{q.title}</p>
                      <p className="mt-1 text-[11px] text-text-muted line-clamp-2">{q.question}</p>
                      {q.options && (
                        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                          {q.options.map((opt, oi) => (
                            <div
                              key={oi}
                              className={`rounded px-2 py-1 text-[11px] break-words ${
                                oi === q.correct_index
                                  ? "bg-success/10 text-success font-medium"
                                  : "bg-white/[0.02] text-text-dim"
                              }`}
                            >
                              {String.fromCharCode(65 + oi)}. {opt}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.solution && (
                        <p className="mt-1.5 text-[10px] italic text-text-dim">
                          Solution: {q.solution}
                        </p>
                      )}
                      <div className="mt-1 flex gap-2 font-mono text-[9px] text-text-dim">
                        <span>{q.difficulty || aiDifficulty}</span>
                        <span>{q.points || 50} pts</span>
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </div>

            {/* Save selected to bank */}
            <Button
              size="sm"
              loading={aiGenerating}
              onClick={async () => {
                const toSave = aiResult.questions.filter((q) => q._selected);
                if (toSave.length === 0) { setError("Select at least one question to save"); return; }
                setAiGenerating(true);
                // Route to the teacher endpoint (accessible to both
                // teacher AND admin roles per requireTeacher) instead
                // of challenges.create which is admin-only and 403s
                // for teachers — the root of every teacher hitting
                // "Saved 0/1 questions to bank" on this page.
                const { teacher } = await import("@/lib/api");
                let saved = 0;
                let firstErr = null;
                for (const q of toSave) {
                  try {
                    await teacher.saveQuestion({
                      title: q.title,
                      question: q.question,
                      options: q.options,
                      correct_index: q.correct_index ?? 0,
                      difficulty: (q.difficulty || aiDifficulty).toLowerCase(),
                      points: q.points || 50,
                      solution: q.solution || "",
                    });
                    saved++;
                  } catch (err) {
                    // Capture the first failure reason so we can show
                    // it to the admin instead of the silent "0/1" that
                    // left them staring at a broken form with no clue.
                    if (!firstErr) {
                      firstErr = err?.response?.data?.error
                        || err?.response?.data?.message
                        || err?.message
                        || "Save failed";
                    }
                  }
                }
                if (saved === toSave.length) {
                  setSuccess(`Saved ${saved}/${toSave.length} questions to bank`);
                } else if (saved > 0) {
                  setError(`Saved ${saved}/${toSave.length} — the rest failed: ${firstErr}`);
                } else {
                  setError(`Could not save any questions: ${firstErr}`);
                }
                setAiResult(null);
                const { quiz } = await import("@/lib/api");
                const poolRes = await quiz.challenges();
                setChallengePool(poolRes.data || []);
                setAiGenerating(false);
              }}
            >
              Save {aiResult.questions.filter((q) => q._selected).length} Selected to Bank
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
