import { motion, AnimatePresence } from "framer-motion";
import SpaceBackground from "@/components/backgrounds/SpaceBackground";
import Card from "@/components/ui/Card";
import MathRender from "@/components/math/MathRender";

const optionLetters = "ABCDEFGH";
const optionColors = [
  { bg: "bg-primary/15", border: "border-primary/40", text: "text-primary" },
  { bg: "bg-secondary/15", border: "border-secondary/40", text: "text-secondary" },
  { bg: "bg-glow/15", border: "border-glow/40", text: "text-glow" },
  { bg: "bg-warning/15", border: "border-warning/40", text: "text-warning" },
  { bg: "bg-success/15", border: "border-success/40", text: "text-success" },
  { bg: "bg-danger/15", border: "border-danger/40", text: "text-danger" },
];

export default function QuestionScreen({
  question,
  selectedAnswer,
  answerSubmitted,
  timeLeft,
  timerPercent,
  timerColor,
  onSubmitAnswer,
}) {
  return (
    <>
      <SpaceBackground />
      <div className="relative z-10 space-y-6 pb-16">
        {/* Header bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-danger">
              Live Quiz
            </p>
            <p className="mt-1 font-mono text-sm text-text-muted">
              Question{" "}
              <span className="font-bold text-white">{question.questionNumber}</span>
              {" / "}
              <span className="text-white">{question.total}</span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                Points
              </p>
              <p className="font-display text-xl font-bold text-warning">
                {question.points || 50}
              </p>
            </div>

            {/* Timer circle */}
            <div className="relative flex h-14 w-14 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="4"
                />
                <motion.circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke={timerPercent > 50 ? "#22c55e" : timerPercent > 25 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * (1 - timerPercent / 100)}
                  transition={{ duration: 0.5 }}
                />
              </svg>
              <span className={`font-mono text-lg font-bold ${
                timerPercent > 50 ? "text-success" : timerPercent > 25 ? "text-warning" : "text-danger"
              }`}>
                {timeLeft}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Timer bar */}
        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${timerColor}`}
            animate={{ width: `${timerPercent}%` }}
            transition={{ duration: 0.8, ease: "linear" }}
          />
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={question.questionNumber}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card variant="glass">
              {question.title && (
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary/80">
                  {question.title}
                </p>
              )}
              {/* MathRender so questions authored with $...$ / $$...$$
                  delimiters render as actual maths instead of raw LaTeX
                  source. Plain-text questions pass through unchanged. */}
              <div className="overflow-x-auto">
                <MathRender
                  source={String(question.question || "")}
                  className="mt-3 font-display text-xl font-bold leading-8 text-white sm:text-2xl [&_.katex]:text-white"
                />
              </div>

              {/* Options */}
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {(question.options || []).map((option, oi) => {
                  const colors = optionColors[oi % optionColors.length];
                  const isSelected = selectedAnswer === oi;
                  const isLocked = answerSubmitted;

                  return (
                    <motion.button
                      key={oi}
                      whileHover={isLocked ? undefined : { scale: 1.02 }}
                      whileTap={isLocked ? undefined : { scale: 0.98 }}
                      onClick={() => !isLocked && onSubmitAnswer(oi)}
                      disabled={isLocked}
                      className={`relative w-full rounded-2xl border px-5 py-4 text-left transition duration-200 ${
                        isSelected
                          ? `${colors.border} ${colors.bg} shadow-pulse`
                          : isLocked
                            ? "border-line/10 bg-white/[0.02] opacity-50"
                            : "border-line/15 bg-white/[0.03] hover:border-primary/25 hover:bg-white/[0.05]"
                      } ${isLocked && !isSelected ? "pointer-events-none" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold ${
                            isSelected
                              ? `${colors.border} ${colors.bg} ${colors.text}`
                              : "border-line/20 bg-white/[0.05] text-text-dim"
                          }`}
                        >
                          {optionLetters[oi]}
                        </span>
                        <MathRender
                          source={String(typeof option === "string" ? option : (option.text || option.label || ""))}
                          className={`min-w-0 overflow-x-auto text-sm font-medium ${isSelected ? "text-white [&_.katex]:text-white" : "text-text-muted [&_.katex]:text-text-muted"}`}
                        />
                      </div>
                      {isSelected && answerSubmitted && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-wider text-success"
                        >
                          Locked
                        </motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {answerSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-center"
                >
                  <p className="text-sm font-medium text-success">
                    Answer submitted! Waiting for results...
                  </p>
                </motion.div>
              )}

              {timeLeft === 0 && !answerSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-center"
                >
                  <p className="text-sm font-medium text-warning">
                    Time is up! Waiting for results...
                  </p>
                </motion.div>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
