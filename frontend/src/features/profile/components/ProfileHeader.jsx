/**
 * ProfileHeader — top section of the rich profile page.
 *
 * Responsibilities:
 *   - Big avatar + name + role/title/xp block
 *   - Action button row (FriendButton + MessageButton), self-hidden
 *   - "Private profile" branch when the payload carries isPrivate:true
 *
 * This component trusts the shape returned by /api/users/:id/profile
 * (already privacy-gated server-side). `isSelf` gates the
 * self-only affordances (the "Edit profile" link, email visibility).
 */

import { Link } from "react-router-dom";
import Card from "@/components/ui/Card";
import FriendButton from "@/components/social/FriendButton";
import MessageButton from "@/components/social/MessageButton";
import IdentityGlyph from "@/components/identity/IdentityGlyph";
import CoreBadge from "@/features/coreTeam/components/CoreBadge";

/**
 * @param {{
 *   profile: any,                      // from GET /api/users/:id/profile
 *   access: { isSelf: boolean, reason: string, canViewProfile: boolean },
 *   userId: string,
 * }} props
 */
export default function ProfileHeader({ profile, access, userId, coreBadge }) {
  if (!profile) return null;
  const isPrivate = profile.isPrivate === true;

  return (
    <Card variant="glow" className="relative overflow-hidden">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Avatar — big, with optional colored background */}
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-5xl shadow-xl sm:h-24 sm:w-24"
          style={{ backgroundColor: profile.avatar_color || "rgba(255,255,255,0.06)" }}
          aria-hidden
        >
          {profile.avatar_emoji || "👤"}
        </div>

        {/* Name + role + stats */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Identity glyph — the unique math-sigil derived from this
                user's public key. Same user → same glyph, everywhere
                on the platform. Changes iff they regenerate keys. */}
            {!isPrivate && userId && (
              <IdentityGlyph userId={userId} size={36} title="Identity glyph" />
            )}
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {profile.name || "Unknown user"}
            </h1>
            {isPrivate ? (
              <span className="rounded-full border border-line/20 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-dim">
                Private
              </span>
            ) : (
              profile.role && (
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                  {profile.role}
                </span>
              )
            )}
            {/* Core-team tag — Council / Head / Core. */}
            {!isPrivate && coreBadge?.isCoreMember && (
              <CoreBadge tier={coreBadge.tier} />
            )}
          </div>

          {!isPrivate && coreBadge?.isCoreMember && (
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-secondary">
              {coreBadge.position}{coreBadge.team ? ` · ${coreBadge.team}` : ""} — Club Asymptotes
            </p>
          )}

          {!isPrivate && profile.title && (
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-text-muted">
              {profile.title}
            </p>
          )}

          {/* Self-only: email exposed in a muted line.
              Non-self viewers NEVER see this because the backend
              only serialises email for access.isSelf. */}
          {access.isSelf && profile.email && (
            <p className="mt-1 break-all font-mono text-[11px] text-text-dim">
              {profile.email}
            </p>
          )}

          {/* Stats strip */}
          {!isPrivate && (
            <div className="mt-4 flex flex-wrap gap-6 border-t border-line/10 pt-4">
              {typeof profile.xp === "number" && (
                <div>
                  <p className="math-text text-2xl font-bold text-primary">{profile.xp}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">Total XP</p>
                </div>
              )}
              {typeof profile.friend_count === "number" && (
                <div>
                  <p className="math-text text-2xl font-bold text-white">{profile.friend_count}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                    {profile.friend_count === 1 ? "Friend" : "Friends"}
                  </p>
                </div>
              )}
              {typeof profile.achievement_count === "number" && (
                <div>
                  <p className="math-text text-2xl font-bold text-white">{profile.achievement_count}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                    {profile.achievement_count === 1 ? "Badge" : "Badges"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Bio — only on public + non-self (self edits it elsewhere) */}
          {!isPrivate && profile.bio && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-text-muted">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Action buttons (right side on desktop, wraps under on mobile) */}
        <div className="flex flex-wrap items-start gap-2 sm:flex-col">
          {access.isSelf ? (
            <Link to="/profile">
              <button className="rounded-lg border border-line/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-text-muted transition hover:border-primary/30 hover:text-white">
                Edit profile
              </button>
            </Link>
          ) : (
            <>
              <FriendButton userId={userId} size="sm" />
              <MessageButton userId={userId} size="sm" />
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
