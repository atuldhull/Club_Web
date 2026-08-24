import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import { events as eventsApi } from "@/lib/api";

export default function EventsAttendedSection() {
  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventsApi.list()
      .then(r => {
        const all = Array.isArray(r.data) ? r.data : [];
        // Show events where user has registered (user_registration exists)
        const attended = all.filter(e => e.user_registration && e.user_registration.status === "attended");
        const registered = all.filter(e => e.user_registration && e.user_registration.status !== "cancelled" && e.user_registration.status !== "attended");
        setEventsList([...attended, ...registered].slice(0, 8));
      })
      .catch(() => setEventsList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card variant="glass">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-success">
        My Events
      </p>
      {loading ? (
        <div className="mt-4 flex justify-center"><Loader variant="dots" size="sm" /></div>
      ) : eventsList.length === 0 ? (
        <div className="mt-3 text-center">
          <p className="text-xs text-text-dim">No events yet</p>
          <Link to="/events" className="mt-2 inline-block font-mono text-[10px] text-primary hover:underline">
            Browse events →
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {eventsList.map(ev => (
            <div key={ev.id} className="flex items-center gap-3 rounded-lg border border-line/10 bg-white/[0.02] px-3 py-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                ev.user_registration?.status === "attended"
                  ? "bg-success/15 text-success" : "bg-secondary/15 text-secondary"
              }`}>
                {ev.user_registration?.status === "attended" ? "✓" : "→"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">{ev.title}</p>
                <p className="font-mono text-[9px] text-text-dim">
                  {ev.starts_at || ev.date ? new Date(ev.starts_at || ev.date).toLocaleDateString() : ""}
                  {ev.xp_reward > 0 && <span className="ml-2 text-primary">+{ev.xp_reward} XP</span>}
                </p>
              </div>
              <span className={`rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase ${
                ev.user_registration?.status === "attended" ? "bg-success/10 text-success"
                : ev.user_registration?.status === "waitlisted" ? "bg-warning/10 text-warning"
                : "bg-secondary/10 text-secondary"
              }`}>
                {ev.user_registration?.status || "—"}
              </span>
            </div>
          ))}
          <Link to="/events" className="block text-center font-mono text-[10px] text-primary/60 hover:text-primary transition mt-2">
            View all events →
          </Link>
        </div>
      )}
    </Card>
  );
}
