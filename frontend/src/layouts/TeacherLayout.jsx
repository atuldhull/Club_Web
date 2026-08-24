import { motion } from "framer-motion";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { teacherNavigation } from "@/app/navigation";
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
  Dashboard: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
    </svg>
  ),
  Students: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  Challenges: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  Certificates: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Quiz: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function TeacherLayout() {
  const location = useLocation();
  const activeItem =
    teacherNavigation.find((item) =>
      item.to === "/teacher"
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to),
    ) || teacherNavigation[0];

  return (
    <div className="relative min-h-screen overflow-hidden bg-obsidian text-text-primary">
      <GridBackground accent="primary" />

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
              <span className="rounded-full border border-success/25 bg-success/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-success">
                Teacher
              </span>
            </div>

            {/* Below lg the nav collapses into a horizontally scrollable
                pill row instead of a full-height stacked list. */}
            <nav className="mt-6 flex gap-1.5 overflow-x-auto lg:block lg:flex-1 lg:space-y-1.5 lg:overflow-visible">
              {teacherNavigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/teacher"}
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
                Exit to Site
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
                  Teacher / {activeItem.label}
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

          <main className="flex flex-1 flex-col pb-8 [&>*]:flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
