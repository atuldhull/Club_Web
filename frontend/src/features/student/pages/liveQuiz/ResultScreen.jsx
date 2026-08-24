import { motion } from "framer-motion";
import SpaceBackground from "@/components/backgrounds/SpaceBackground";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";

function medalForRank(rank) {
  if (rank === 1) return { icon: "1st", color: "text-warning", bg: "bg-warning/15 border-warning/30" };
  if (rank === 2) return { icon: "2nd", color: "text-text-muted", bg: "bg-white/5 border-line/20" };
  if (rank === 3) return { icon: "3rd", color: "text-[#cd7f32]", bg: "bg-[#cd7f32]/10 border-[#cd7f32]/20" };
  return { icon: `#${rank}`, color: "text-text-dim", bg: "bg-white/[0.03] border-line/10" };
}

export default function ResultScreen({ result, question, selectedAnswer, playerName }) {
  const wasCorrect = selectedAnswer === result.correctIndex;
  const didNotAnswer = selectedAnswer === null;

  return (
    <>
      <SpaceBackground />
      <div className="relative z-10 space-y-8 pb-16">
        {/* Result header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          {didNotAnswer ? (
            <>
              <p className="font-display text-5xl font-extrabold text-warning">--</p>
              <p className="mt-2 font-display text-2xl font-bold text-white">No Answer</p>
              <p className="mt-1 text-sm text-text-muted">You did not answer this question.</p>
            </>
          ) : wasCorrect ? (
            <>
              <motion.div
                initial={{ rotate: -15, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <p className="font-display text-6xl font-extrabold text-success">Correct!</p>
              </motion.div>
              <p className="mt-2 text-sm text-text-muted">Great job, keep it going!</p>
            </>
          ) : (
            <>
              <p className="font-display text-5xl font-extrabold text-danger">Wrong</p>
              <p className="mt-2 text-sm text-text-muted">The correct answer was highlighted below.</p>
            </>
          )}
        </motion.div>

        {/* Answer reveal */}
        {question && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card variant="solid">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
                Question {question.questionNumber}
              </p>
              <h3 className="mt-2 break-words font-display text-lg font-bold text-white">
                {question.question}
              </h3>

              <div className="mt-5 space-y-2">
                {(question.options || []).map((opt, oi) => {
                  const isCorrect = oi === result.correctIndex;
                  const isYours = oi === selectedAnswer;
                  const optText = typeof opt === "string" ? opt : opt.text || opt.label;

                  return (
                    <motion.div
                      key={oi}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + oi * 0.08 }}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                        isCorrect
                          ? "border-success/30 bg-success/10"
                          : isYours && !isCorrect
                            ? "border-danger/30 bg-danger/10"
                            : "border-line/10 bg-white/[0.02]"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isCorrect
                            ? "bg-success/20 text-success"
                            : isYours && !isCorrect
                              ? "bg-danger/20 text-danger"
                              : "bg-white/5 text-text-dim"
                        }`}
                      >
                        {isCorrect ? "\u2713" : isYours && !isCorrect ? "\u2717" : String.fromCharCode(65 + oi)}
                      </span>
                      <span className={`text-sm ${isCorrect ? "font-medium text-white" : "text-text-muted"}`}>
                        {optText}
                      </span>
                      {isYours && (
                        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-text-dim">
                          Your pick
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {result.solution && (
                <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
                    Solution
                  </p>
                  <p className="mt-1 text-sm leading-7 text-text-muted">{result.solution}</p>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Podium */}
        {result.podium && result.podium.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card variant="glass">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-warning">
                Top Players
              </p>

              <div className="mt-4 space-y-2">
                {result.podium.map((p, i) => {
                  const medal = medalForRank(p.rank);
                  const isMe = p.name === playerName;

                  return (
                    <motion.div
                      key={p.rank}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.08 }}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 ${medal.bg} ${
                        isMe ? "ring-1 ring-primary/30" : ""
                      }`}
                    >
                      <span className={`font-mono text-sm font-bold ${medal.color}`}>
                        {medal.icon}
                      </span>
                      <span className={`flex-1 text-sm font-medium ${isMe ? "text-white" : "text-text-muted"}`}>
                        {p.name}
                        {isMe && (
                          <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-primary">
                            You
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-sm font-bold text-white">
                        {p.score}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Waiting for next question */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <Loader variant="dots" label={result.isLast ? "Final results incoming..." : "Next question starting soon..."} />
        </motion.div>
      </div>
    </>
  );
}
