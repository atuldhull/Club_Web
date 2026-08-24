import { motion } from "framer-motion";
import SpaceBackground from "@/components/backgrounds/SpaceBackground";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

function medalForRank(rank) {
  if (rank === 1) return { icon: "1st", color: "text-warning", bg: "bg-warning/15 border-warning/30" };
  if (rank === 2) return { icon: "2nd", color: "text-text-muted", bg: "bg-white/5 border-line/20" };
  if (rank === 3) return { icon: "3rd", color: "text-[#cd7f32]", bg: "bg-[#cd7f32]/10 border-[#cd7f32]/20" };
  return { icon: `#${rank}`, color: "text-text-dim", bg: "bg-white/[0.03] border-line/10" };
}

export default function FinishedScreen({ leaderboard, playerName, onLeave }) {
  return (
    <>
      <SpaceBackground />
      <div className="relative z-10 space-y-8 pb-16">
        <motion.section
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-warning">
            Final Results
          </p>
          <h1 className="mt-3 font-display text-5xl font-extrabold tracking-[-0.06em] text-white sm:text-6xl">
            Quiz Complete!
          </h1>
        </motion.section>

        {/* Top 3 podium */}
        {leaderboard.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mx-auto flex max-w-lg items-end justify-center gap-2 sm:gap-3"
          >
            {/* 2nd place */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex w-24 flex-col items-center sm:w-28"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line/20 bg-white/5 text-lg font-bold text-text-muted">
                {leaderboard[1].name.charAt(0).toUpperCase()}
              </div>
              <div className="mt-2 w-full rounded-t-2xl border border-line/15 bg-white/[0.03] px-3 pb-4 pt-6 text-center">
                <p className="truncate text-sm font-medium text-white">{leaderboard[1].name}</p>
                <p className="mt-1 font-mono text-lg font-bold text-text-muted">{leaderboard[1].score}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">2nd</p>
              </div>
            </motion.div>

            {/* 1st place */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex w-28 flex-col items-center sm:w-32"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-warning/40 bg-warning/15 text-2xl font-bold text-warning shadow-orbit">
                {leaderboard[0].name.charAt(0).toUpperCase()}
              </div>
              <div className="mt-2 w-full rounded-t-2xl border border-warning/20 bg-warning/5 px-3 pb-4 pt-8 text-center">
                <p className="truncate text-sm font-bold text-white">{leaderboard[0].name}</p>
                <p className="mt-1 font-mono text-2xl font-bold text-warning">{leaderboard[0].score}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-warning">1st</p>
              </div>
            </motion.div>

            {/* 3rd place */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex w-24 flex-col items-center sm:w-28"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#cd7f32]/20 bg-[#cd7f32]/10 text-lg font-bold text-[#cd7f32]">
                {leaderboard[2].name.charAt(0).toUpperCase()}
              </div>
              <div className="mt-2 w-full rounded-t-2xl border border-[#cd7f32]/15 bg-[#cd7f32]/5 px-3 pb-4 pt-5 text-center">
                <p className="truncate text-sm font-medium text-white">{leaderboard[2].name}</p>
                <p className="mt-1 font-mono text-lg font-bold text-[#cd7f32]">{leaderboard[2].score}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">3rd</p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Full leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mx-auto max-w-lg"
        >
          <Card variant="solid">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">
              Full Leaderboard
            </p>

            <div className="mt-5 space-y-2">
              {leaderboard.map((entry, i) => {
                const medal = medalForRank(entry.rank);
                const isMe = entry.name === playerName;

                return (
                  <motion.div
                    key={entry.rank}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.06 }}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${medal.bg} ${
                      isMe ? "ring-1 ring-primary/30" : ""
                    }`}
                  >
                    <span className={`font-mono text-sm font-bold ${medal.color}`}>
                      {medal.icon}
                    </span>
                    <span className={`flex-1 text-sm font-medium ${isMe ? "text-white" : "text-text-muted"}`}>
                      {entry.name}
                      {isMe && (
                        <span className="ml-2 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                          You
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                      {entry.score} pts
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center"
        >
          <Button onClick={onLeave}>Play Again</Button>
        </motion.div>
      </div>
    </>
  );
}
