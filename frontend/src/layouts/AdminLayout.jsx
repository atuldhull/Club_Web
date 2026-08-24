import { motion } from "framer-motion";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { adminNavigation } from "@/app/navigation";
import GridBackground from "@/components/backgrounds/GridBackground";
import BrandMark from "@/components/navigation/BrandMark";
import { cn } from "@/lib/cn";

function navClass(isActive) {
  return cn(
    "flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 transition duration-200",
    isActive
      ? "border border-primary/30 bg-primary/12 text-white shadow-orbit"
      : "text-text-muted hover:bg-white/[0.04] hover:text-white",
  );
}

const navIcons = {
  Overview: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Challenges: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  Users: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  Events: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  "Data Ops": (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
  ),
  Moderation: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Settings: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

export default function AdminLayout() {
  const location = useLocation();
  const activeItem =
    adminNavigation.find((item) =>
      item.to === "/admin"
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to),
    ) || adminNavigation[0];

  return (
    <div className="relative min-h-screen overflow-hidden bg-obsidian text-text-primary">
      <GridBackground accent="success" />

      <div className="relative z-10 flex min-h-screen w-full flex-col gap-4 px-4 py-4 lg:flex-row">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:w-[16rem] lg:flex-col"
        >
          <div className="rounded-2xl border border-line/15 bg-surface/60 p-5 shadow-panel backdrop-blur-2xl lg:flex lg:h-full lg:flex-col">
            <div className="flex items-center justify-between gap-3">
              <BrandMark compact />
              <span className="rounded-full border border-danger/25 bg-danger/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-danger">
                Admin
              </span>
            </div>

            {/* Below lg the nav collapses into a horizontally scrollable
                pill row instead of a full-height stacked list. */}
            <nav className="mt-6 flex gap-1.5 overflow-x-auto lg:block lg:flex-1 lg:space-y-1.5 lg:overflow-visible">
              {adminNavigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/admin"}
                  className={({ isActive }) => navClass(isActive)}
                >
                  {navIcons[item.label]}
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="mt-6 space-y-2">
              <NavLink
                to="/"
                className="flex items-center justify-center gap-2 rounded-xl border border-line/15 bg-white/[0.03] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted transition hover:border-secondary/25 hover:text-white"
              >
                Exit Admin
              </NavLink>
            </div>
          </div>
        </motion.aside>

        {/* Main content */}
        <div className="flex-1 lg:min-w-0">
          <motion.header
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="sticky top-4 z-30 mb-6 rounded-2xl border border-line/15 bg-surface/60 px-6 py-4 shadow-panel backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
                  Admin / {activeItem.label}
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold tracking-[-0.04em] text-white">
                  {activeItem.note}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden rounded-full border border-success/25 bg-success/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-success sm:block">
                  System Online
                </span>
              </div>
            </div>
          </motion.header>

          {/* flex-1 + [&>*]:flex-1 — same trick as MainLayout: stretch
              the page's root element to fill remaining height so short
              admin pages (empty user list, etc.) don't sit cramped at
              the top with empty space below. */}
          <main className="flex flex-1 flex-col pb-8 [&>*]:flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
