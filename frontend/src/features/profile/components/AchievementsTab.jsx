/**
 * AchievementsTab — grid of achievements this user has unlocked.
 *
 * Data: GET /api/achievements/user/:userId (existing endpoint).
 *
 * Layout:
 *   Responsive grid of cards — 2 cols mobile / 3 cols tablet /
 *   4 cols desktop. Each card shows the achievement icon, title,
 *   short description, and when it was unlocked.
 *
 * Rarity → subtle border colour so the legendary + epic ones read
 * as special without shouting. Same palette as
 * ActivityTimelineItem so a user recognises the rarity tier.
 */

import { useEffect, useState } from "react";
import { achievements as achApi } from "@/lib/api";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";

const RARITY_BORDER = {
  common:    "border-line/15",
  uncommon:  "border-success/30",
  rare:      "border-secondary/30",
  epic:      "border-primary/40",
  legendary: "border-warning/50",
};

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * @param {{ userId: string }} props
 */
export default function AchievementsTab({ userId }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    achApi.user(userId)
      .then((r) => { if (!cancelled) setItems(r.data || []); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex min-h-[160px] items-center justify-center">
        <Loader variant="dots" size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="glass" className="py-8 text-center text-sm text-danger">
        Couldn&apos;t load achievements.
      </Card>
    );
  }

  if (!items.length) {
    return (
      <Card variant="glass" className="py-10 text-center">
        <p className="text-3xl">🏅</p>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-text-dim">
          No achievements unlocked yet
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((a) => {
        // The /api/achievements/user/:id endpoint returns rows from
        // user_achievements joined with achievements; the inner shape
        // is either flat (old rows) or nested as `achievements:{...}`.
        const info = a.achievements || a;
        const unlocked = a.unlocked_at || a.created_at;
        const rarity = info.rarity || "common";
        const borderClass = RARITY_BORDER[rarity] || RARITY_BORDER.common;
        return (
          <Card
            key={a.id || info.slug}
            variant="glass"
            className={`flex flex-col items-center gap-2 py-4 text-center ${borderClass} border`}
          >
            <div className="text-3xl" aria-hidden>{info.icon || "🏅"}</div>
            <p className="line-clamp-2 text-sm font-semibold text-white">{info.title}</p>
            {info.description && (
              <p className="line-clamp-2 font-mono text-[11px] leading-4 text-text-dim">{info.description}</p>
            )}
            <p className="mt-auto font-mono text-[9px] uppercase tracking-wider text-text-dim">
              {formatDate(unlocked)}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
