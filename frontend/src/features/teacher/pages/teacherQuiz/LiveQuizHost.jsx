import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LiveAIPanel from "./LiveAIPanel";

export default function LiveQuizHost({
  // State
  liveActive,
  liveCode,
  livePlayers,
  liveStatus,
  liveQuestionNum,
  liveTotalQ,
  liveAnswered,
  livePodium,
  liveSelectedQs,
  setLiveSelectedQs,
  teacherName,
  setTeacherName,
  challengePool,
  poolLoading,
  // AI state (inline panel inside the host setup)
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
  // Actions
  startLiveQuiz,
  nextQuestion,
  revealAnswer,
  endLiveQuiz,
}) {
  return (
    <Card variant="glow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15 text-base">&#9889;</span>
          <div>
            <p className="font-display text-lg font-bold text-white">Host Live Quiz</p>
            <p className="text-xs text-text-dim">Real-time quiz — students join with a code</p>
          </div>
        </div>
        {!liveActive && liveSelectedQs.length > 0 && (
          <span className="rounded-full bg-primary/15 px-3 py-1 font-mono text-[10px] text-primary">
            {liveSelectedQs.length} questions ready
          </span>
        )}
      </div>

      {!liveActive ? (
        <div className="mt-5 space-y-5">
          {/* Teacher name */}
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
              Your Name
            </label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full rounded-lg border border-line/15 bg-black/15 px-3 py-2 text-sm text-white outline-none focus:border-primary/30 sm:w-60"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Left: Select from existing questions */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                  Pick from Question Bank ({liveSelectedQs.length} selected)
                </label>
                {liveSelectedQs.length > 0 && (
                  <button
                    onClick={() => setLiveSelectedQs([])}
                    className="rounded px-2 py-2 -my-1 font-mono text-[11px] text-danger hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-[360px] space-y-1 overflow-y-auto rounded-xl border border-line/10 bg-black/10 p-2.5">
                {poolLoading ? (
                  <p className="py-6 text-center text-xs text-text-dim">Loading challenges...</p>
                ) : (challengePool || []).length === 0 ? (
                  <p className="py-6 text-center text-xs text-text-dim">
                    No challenges in bank. Use AI to generate some &rarr;
                  </p>
                ) : (
                  (challengePool || []).map((c) => (
                    <label
                      key={c.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition ${
                        liveSelectedQs.includes(c.id)
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-white/[0.03] border border-transparent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={liveSelectedQs.includes(c.id)}
                        onChange={() =>
                          setLiveSelectedQs((prev) =>
                            prev.includes(c.id)
                              ? prev.filter((x) => x !== c.id)
                              : [...prev, c.id],
                          )
                        }
                        className="accent-primary"
                      />
                      <span className="flex-1 text-xs text-white">{c.title}</span>
                      <span
                        className={`font-mono text-[10px] ${
                          (c.difficulty || "").toLowerCase() === "hard"
                            ? "text-danger"
                            : (c.difficulty || "").toLowerCase() === "extreme"
                              ? "text-glow"
                              : (c.difficulty || "").toLowerCase() === "easy"
                                ? "text-success"
                                : "text-warning"
                        }`}
                      >
                        {c.difficulty}
                      </span>
                      <span className="font-mono text-[10px] text-text-dim">{c.points}pts</span>
                    </label>
                  ))
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setLiveSelectedQs((challengePool || []).map((c) => c.id))}
                  className="rounded px-2 py-2 -my-1 font-mono text-[11px] text-primary hover:underline"
                >
                  Select all
                </button>
              </div>
            </div>

            {/* Right: AI Generate questions */}
            <LiveAIPanel
              aiTopics={aiTopics}
              setAiTopics={setAiTopics}
              aiCount={aiCount}
              setAiCount={setAiCount}
              aiDifficulty={aiDifficulty}
              setAiDifficulty={setAiDifficulty}
              aiGenerating={aiGenerating}
              setAiGenerating={setAiGenerating}
              aiResult={aiResult}
              setAiResult={setAiResult}
              setChallengePool={setChallengePool}
              setError={setError}
              setSuccess={setSuccess}
            />
          </div>

          <Button
            onClick={startLiveQuiz}
            disabled={liveSelectedQs.length === 0}
            size="lg"
            className="w-full justify-center"
          >
            Start Live Quiz ({liveSelectedQs.length} questions)
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {/* Session info */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-full rounded-xl border border-success/30 bg-success/10 px-5 py-3 text-center sm:w-auto">
              <p className="font-mono text-[10px] text-success">QUIZ CODE</p>
              <p
                className="math-text text-3xl tracking-[0.25em] sm:text-5xl sm:tracking-[0.5em]"
                style={{ color: "var(--monument-city)" }}
              >
                {liveCode}
              </p>
              <p className="mt-0.5 text-[10px] text-text-dim">Share this with students</p>
            </div>
            <div>
              <p className="text-sm text-white">
                {livePlayers.length} player{livePlayers.length !== 1 ? "s" : ""} joined
              </p>
              <p className="font-mono text-[10px] text-text-dim">
                Status: <span className="text-success">{liveStatus}</span>
                {liveStatus === "question" && ` · Q${liveQuestionNum}/${liveTotalQ}`}
              </p>
              {liveStatus === "question" && (
                <p className="mt-1 font-mono text-[10px] text-secondary">
                  {liveAnswered.answered}/{liveAnswered.total} answered
                </p>
              )}
            </div>
          </div>

          {/* Players */}
          {livePlayers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {livePlayers.map((p, i) => (
                <span
                  key={i}
                  className="rounded-full border border-line/15 bg-white/5 px-3 py-1 font-mono text-[10px] text-text-muted"
                >
                  {p.name} <span className="text-primary">{p.score || 0}</span>
                </span>
              ))}
            </div>
          )}

          {/* Podium (after results) */}
          {(liveStatus === "results" || liveStatus === "finished") && livePodium.length > 0 && (
            <div className="rounded-xl border border-line/10 bg-black/10 p-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-warning">
                {liveStatus === "finished" ? "Final Leaderboard" : "Current Standings"}
              </p>
              {livePodium.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className="text-xs text-white">
                    #{p.rank} {p.name}
                  </span>
                  <span className="font-mono text-xs text-primary">{p.score}</span>
                </div>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap gap-3">
            {liveStatus === "lobby" && (
              <Button size="sm" onClick={nextQuestion} disabled={livePlayers.length === 0}>
                Start First Question
              </Button>
            )}
            {liveStatus === "question" && (
              <Button size="sm" variant="secondary" onClick={revealAnswer}>
                Reveal Answer Now
              </Button>
            )}
            {liveStatus === "results" && liveQuestionNum < liveTotalQ && (
              <Button size="sm" onClick={nextQuestion}>
                Next Question ({liveQuestionNum + 1}/{liveTotalQ})
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={endLiveQuiz}>
              End Quiz
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
