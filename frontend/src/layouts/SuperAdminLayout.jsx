import { motion } from "framer-motion";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { superAdminNavigation } from "@/app/navigation";
import GridBackground from "@/components/backgrounds/GridBackground";
import BrandMark from "@/components/navigation/BrandMark";
import { cn } from "@/lib/cn";

function navClass(isActive) {
  return cn(
    "flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 transition duration-200",
    isActive
      ? "border border-danger/30 bg-danger/12 text-white shadow-[0_0_24px_rgba(248,113,113,0.15)]"
      : "text-text-muted hover:bg-white/[0.04] hover:text-white",
  );
}

const navIcons = {
  Analytics: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  Organisations: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  ),
  "Plans & Billing": (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  ),
  "Access Control": (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
};

export default function SuperAdminLayout() {
  const location = useLocation();
  const activeItem =
    superAdminNavigation.find((item) =>
      item.to === "/super-admin"
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to),
    ) || superAdminNavigation[0];

  return (
    <div className="relative min-h-screen overflow-hidden bg-obsidian text-text-primary">
      <GridBackground accent="super" />

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
              <span className="rounded-full border border-danger/40 bg-danger/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-danger shadow-[0_0_12px_rgba(248,113,113,0.25)]">
                Super Admin
              </span>
            </div>

            {/* Below lg the nav collapses into a horizontally scrollable
                pill row instead of a full-height stacked list. */}
            <nav className="mt-6 flex gap-1.5 overflow-x-auto lg:block lg:flex-1 lg:space-y-1.5 lg:overflow-visible">
              {superAdminNavigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/super-admin"}
                  className={({ isActive }) => navClass(isActive)}
                >
                  {navIcons[item.label]}
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="mt-6 space-y-2">
              <NavLink
                to="/admin"
                className="flex items-center justify-center gap-2 rounded-xl border border-line/15 bg-white/[0.03] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted transition hover:border-primary/25 hover:text-white"
              >
                Admin Panel
              </NavLink>
              <NavLink
                to="/"
                className="flex items-center justify-center gap-2 rounded-xl border border-line/15 bg-white/[0.03] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted transition hover:border-secondary/25 hover:text-white"
              >
                Back to Site
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
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-danger">
                  Super Admin / {activeItem.label}
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold tracking-[-0.04em] text-white">
                  {activeItem.note}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden rounded-full border border-danger/25 bg-danger/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-danger sm:block">
                  Root Access
                </span>
                <span className="hidden rounded-full border border-success/25 bg-success/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-success sm:block">
                  System Online
                </span>
              </div>
            </div>
          </motion.header>

          <main className="flex flex-1 flex-col pb-8 [&>*]:flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
