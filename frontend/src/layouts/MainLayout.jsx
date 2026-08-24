import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { mainNavigation } from "@/app/navigation";
import AnnouncementBar from "@/components/AnnouncementBar";
import BrandMark from "@/components/navigation/BrandMark";
import InstallPwaButton from "@/components/ui/InstallPwaButton";
import CommandPalette from "@/components/search/CommandPalette";
import { useCommandPaletteHotkey } from "@/components/search/useCommandPaletteHotkey";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";

function navClass(isActive) {
  return cn(
    "relative rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition duration-300",
    isActive ? "text-white" : "text-text-muted hover:text-white",
  );
}

export default function MainLayout() {
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const isAuth = status === "authenticated" && user;
  const role = user?.role;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Account dropdown — click-toggled (touch devices ≥md have no hover),
  // with hover-open kept as a convenience on pointer devices.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useCommandPaletteHotkey(paletteOpen, setPaletteOpen);

  // Close the account dropdown on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Logout: wait for backend to clear session, THEN navigate with replace
  // so the back button cannot re-expose protected pages.
  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const navItems = mainNavigation;

  const roleLinks = [];
  if (isAuth) {
    roleLinks.push({ to: "/dashboard", label: "Dashboard" });
    roleLinks.push({ to: "/profile", label: "Profile" });
    // Core Team portal — visible to every signed-in member; the portal
    // itself shows the access gate to anyone who isn't a core member.
    roleLinks.push({ to: "/core", label: "Core Team" });
    if (role === "teacher" || role === "admin" || role === "super_admin") {
      roleLinks.push({ to: "/teacher", label: "Teacher Panel" });
    }
    if (role === "admin" || role === "super_admin") {
      roleLinks.push({ to: "/admin", label: "Admin" });
    }
    if (role === "super_admin") {
      roleLinks.push({ to: "/super-admin", label: "Super Admin" });
    }
  }

  // Close mobile menu on navigation
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-obsidian text-text-primary">
      {/* Outer is FULL WIDTH and so are the header + footer now. The
          earlier cap (max-w-7xl on header + footer) made them feel like
          centred pills floating in a full-bleed page — visually
          inconsistent with the hero scene which bleeds edge-to-edge.
          Now both stretch to the viewport edges, matching the rest of
          the design. Internal padding (px-4/sm:px-8/lg:px-10) keeps
          contents readable from ultra-wide displays down to mobile. */}
      <div className="relative flex min-h-screen w-full flex-col">
        <AnnouncementBar />
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="sticky top-3 z-40 mb-6 w-full px-4 pt-4 sm:px-8 lg:px-10"
        >
          <nav className="rounded-2xl border border-line/15 bg-surface/60 px-4 py-3 shadow-panel backdrop-blur-2xl sm:px-5">
            <div className="flex items-center justify-between gap-3">
              {/* Left: Brand + Desktop Nav */}
              <div className="flex items-center gap-4 sm:gap-6">
                <BrandMark />
                <div className="hidden items-center gap-1 lg:flex">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      className={({ isActive }) => navClass(isActive)}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.span
                              layoutId="nav-pill"
                              className="absolute inset-0 rounded-full border border-primary/30 bg-primary/12"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                            />
                          )}
                          <span className="relative z-[1]">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                  {isAuth && (
                    <>
                      <NavLink to="/dashboard" className={({ isActive }) => navClass(isActive)}>
                        {({ isActive }) => (
                          <>
                            {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full border border-primary/30 bg-primary/12" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                            <span className="relative z-[1]">Dashboard</span>
                          </>
                        )}
                      </NavLink>
                      <NavLink to="/problems" className={({ isActive }) => navClass(isActive)}>
                        {({ isActive }) => (
                          <>
                            {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full border border-primary/30 bg-primary/12" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                            <span className="relative z-[1]">Problems</span>
                          </>
                        )}
                      </NavLink>
                      <NavLink to="/roadmaps" className={({ isActive }) => navClass(isActive)}>
                        {({ isActive }) => (
                          <>
                            {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full border border-primary/30 bg-primary/12" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                            <span className="relative z-[1]">Roadmaps</span>
                          </>
                        )}
                      </NavLink>
                      <NavLink to="/sprints" className={({ isActive }) => navClass(isActive)}>
                        {({ isActive }) => (
                          <>
                            {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full border border-primary/30 bg-primary/12" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                            <span className="relative z-[1]">Sprints</span>
                          </>
                        )}
                      </NavLink>
                      <NavLink to="/projects" className={({ isActive }) => navClass(isActive)}>
                        {({ isActive }) => (
                          <>
                            {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full border border-primary/30 bg-primary/12" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                            <span className="relative z-[1]">Projects</span>
                          </>
                        )}
                      </NavLink>
                    </>
                  )}
                </div>
              </div>

              {/* Right: Actions + Hamburger */}
              <div className="flex items-center gap-2">
                {/* Global search — Ctrl/Cmd+K. Auth-only because the
                    backend endpoint is auth-gated and the palette
                    surfaces personal trails (Notifications, Saved). */}
                {isAuth && (
                  <button
                    type="button"
                    onClick={() => setPaletteOpen(true)}
                    className="hidden items-center gap-2 rounded-full border border-line/15 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-text-muted transition hover:border-primary/30 hover:text-white md:flex"
                    aria-label="Open search (Ctrl+K)"
                    title="Search (Ctrl+K)"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="11" cy="11" r="7" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.3-4.3" />
                    </svg>
                    <span>Search</span>
                    <kbd className="hidden rounded border border-line/20 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] lg:inline-block">⌘K</kbd>
                  </button>
                )}
                {/* Install as PWA (Chrome/Edge show native prompt; iOS Safari shows a hint) */}
                <InstallPwaButton className="hidden md:block" />

                {/* Theme toggle — hidden below md: so it doesn't crowd
                    the BrandMark + auth actions on tablet-portrait
                    widths (sm: 640px is still too narrow once both
                    Sign In + Join show up next to the brand). */}
                <button
                  onClick={toggleTheme}
                  className="hidden items-center gap-1.5 rounded-full border border-line/15 bg-white/[0.03] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wider text-text-muted transition hover:border-primary/25 hover:text-white md:flex"
                  aria-label={`${theme} theme — click to switch`}
                >
                  {theme === "light" ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5" /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                  ) : theme === "eclipse" ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  )}
                  <span className="hidden md:inline">{theme}</span>
                </button>

                {isAuth ? (
                  <>
                    {/* Notification bell */}
                    <Link to="/notifications" className="relative rounded-full border border-line/15 bg-white/[0.03] p-2 text-text-muted transition hover:text-white">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </Link>

                    {/* User dropdown — desktop only (md:+). Below that
                        the bell + hamburger combo handles navigation
                        via the mobile drawer, where Profile / Saved /
                        Sign Out all live. */}
                    <div ref={menuRef} className="group relative hidden md:block">
                      <button
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/30 text-[10px] font-bold">
                          {(user.name || user.email || "U")[0].toUpperCase()}
                        </span>
                        <span>{user.name?.split(" ")[0] || "User"}</span>
                      </button>
                      <div
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "absolute right-0 top-full mt-2 w-48 rounded-xl border border-line/15 bg-surface/95 p-2 shadow-panel backdrop-blur-2xl transition-all",
                          menuOpen ? "visible" : "invisible group-hover:visible",
                        )}
                      >
                        <p className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-text-dim">{role}</p>
                        <Link to="/profile" className="block rounded-lg px-3 py-2 text-sm text-text-muted transition hover:bg-white/5 hover:text-white">Profile</Link>
                        <Link to="/saved" className="block rounded-lg px-3 py-2 text-sm text-text-muted transition hover:bg-white/5 hover:text-white">Saved</Link>
                        <Link to="/certificates" className="block rounded-lg px-3 py-2 text-sm text-text-muted transition hover:bg-white/5 hover:text-white">Certificates</Link>
                        <Link to="/billing" className="block rounded-lg px-3 py-2 text-sm text-text-muted transition hover:bg-white/5 hover:text-white">Billing</Link>
                        {roleLinks.filter((r) => r.to !== "/dashboard" && r.to !== "/profile").map((link) => (
                          <Link key={link.to} to={link.to} className="block rounded-lg px-3 py-2 text-sm text-primary transition hover:bg-primary/5">{link.label}</Link>
                        ))}
                        <hr className="my-1 border-line/10" />
                        <button onClick={handleLogout} className="w-full rounded-lg px-3 py-2 text-left text-sm text-danger transition hover:bg-danger/5">Sign Out</button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="rounded-full border border-line/15 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted transition hover:text-white sm:px-4 sm:text-[11px]">
                      Sign in
                    </Link>
                    {/* Join CTA hidden until md: so the right side of the
                        header doesn't crowd the brand on tablet-portrait
                        widths; the hamburger drawer below has its own
                        'Join the Collective' link for narrow viewports. */}
                    <Link to="/register" className="hidden rounded-full border border-primary/30 bg-primary/12 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white transition hover:bg-primary/20 md:block">
                      Join
                    </Link>
                  </>
                )}

                {/* ── HAMBURGER BUTTON (mobile/tablet) ── */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line/15 bg-white/[0.03] text-text-muted transition hover:text-white lg:hidden"
                  aria-label="Toggle menu"
                >
                  {mobileOpen ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* ── MOBILE DRAWER ── */}
            <AnimatePresence>
              {mobileOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden lg:hidden"
                >
                  <div className="mt-3 space-y-1 border-t border-line/10 pt-3">
                    {/* Search trigger — mobile drawer */}
                    {isAuth && (
                      <button
                        type="button"
                        onClick={() => { closeMobile(); setPaletteOpen(true); }}
                        className="flex w-full items-center gap-3 rounded-xl border border-line/15 bg-white/[0.03] px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.2em] text-text-soft transition active:bg-white/5"
                      >
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <circle cx="11" cy="11" r="7" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.3-4.3" />
                        </svg>
                        Search everything
                      </button>
                    )}
                    {/* Install as PWA — the header instance is hidden below
                        md:, so the drawer is the only install entry point
                        on phones (renders nothing when not installable) */}
                    <InstallPwaButton className="px-4 py-1" />
                    {/* Nav links */}
                    {navItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/"}
                        onClick={closeMobile}
                        className={({ isActive }) =>
                          cn(
                            "block rounded-xl px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] transition",
                            isActive ? "bg-primary/12 text-white" : "text-text-muted active:bg-white/5",
                          )
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}

                    {/* Auth links */}
                    {isAuth && (
                      <>
                        <div className="my-2 border-t border-line/8" />
                        {[
                          { to: "/dashboard", label: "Dashboard" },
                          { to: "/arena", label: "Arena" },
                          { to: "/problems", label: "Problems" },
                          { to: "/roadmaps", label: "Roadmaps" },
                          { to: "/sprints", label: "Sprints" },
                          { to: "/saved", label: "Saved" },
                          { to: "/projects", label: "Projects" },
                          { to: "/profile", label: "Profile" },
                          { to: "/certificates", label: "Certificates" },
                          { to: "/billing", label: "Billing" },
                          { to: "/notifications", label: "Notifications" },
                        ].map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={closeMobile}
                            className={({ isActive }) =>
                              cn(
                                "block rounded-xl px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] transition",
                                isActive ? "bg-primary/12 text-white" : "text-text-muted active:bg-white/5",
                              )
                            }
                          >
                            {item.label}
                          </NavLink>
                        ))}

                        {/* Role-specific links */}
                        {roleLinks.filter(r => r.to !== "/dashboard" && r.to !== "/profile").length > 0 && (
                          <>
                            <div className="my-2 border-t border-line/8" />
                            {roleLinks.filter(r => r.to !== "/dashboard" && r.to !== "/profile").map((link) => (
                              <NavLink
                                key={link.to}
                                to={link.to}
                                onClick={closeMobile}
                                className={({ isActive }) =>
                                  cn(
                                    "block rounded-xl px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] transition",
                                    isActive ? "bg-primary/12 text-primary" : "text-primary/70 active:bg-primary/5",
                                  )
                                }
                              >
                                {link.label}
                              </NavLink>
                            ))}
                          </>
                        )}

                        {/* Theme + Sign out */}
                        <div className="my-2 border-t border-line/8" />
                        <button
                          onClick={() => { toggleTheme(); closeMobile(); }}
                          className="block w-full rounded-xl px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted transition active:bg-white/5"
                        >
                          Theme: {theme}
                        </button>
                        <button
                          onClick={async () => { closeMobile(); await handleLogout(); }}
                          className="block w-full rounded-xl px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.2em] text-danger transition active:bg-danger/5"
                        >
                          Sign Out
                        </button>
                      </>
                    )}

                    {/* Not logged in */}
                    {!isAuth && (
                      <>
                        <div className="my-2 border-t border-line/8" />
                        <Link to="/login" onClick={closeMobile} className="block rounded-xl px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted transition active:bg-white/5">
                          Sign In
                        </Link>
                        <Link to="/register" onClick={closeMobile} className="block rounded-xl bg-primary/12 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white transition active:bg-primary/20">
                          Join the Collective
                        </Link>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </nav>
        </motion.header>

        {/* `flex flex-col [&>*]:flex-1` — Tailwind arbitrary-variant rule
            that says: stretch the FIRST child of <main> to fill all
            remaining vertical space. Without this, a short page (404,
            empty list, login form) sits at the top with empty space
            below it because <main className="flex-1"> only pushes the
            footer down — it doesn't expand the page content itself.

            The inner wrapper applies the SAME horizontal gutters as the
            sticky header (`px-4 sm:px-8 lg:px-10`) + a max-width cap so
            pages align with the header instead of bleeding to the
            viewport edges. Pages that need full-bleed (the 3D hero, any
            future bg-image scenes) escape this container with the
            standard `width: 100vw; margin-left: calc(-50vw + 50%)`
            trick which still works inside a centred parent. */}
        <main className="flex flex-1 flex-col [&>*]:flex-1">
          <div className="flex w-full flex-1 flex-col px-4 sm:px-8 lg:px-10 [&>*]:flex-1">
            <Outlet />
          </div>
        </main>

        <footer className="mt-16 w-full border-t border-line/10 px-4 pb-10 pt-8 sm:px-8 lg:px-10">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <BrandMark />
            <div className="flex flex-wrap justify-center gap-4 font-mono text-[11px] text-text-muted sm:gap-6">
              <Link to="/leaderboard" className="transition hover:text-white">Leaderboard</Link>
              <Link to="/events" className="transition hover:text-white">Events</Link>
              <Link to="/problems" className="transition hover:text-white">Problems</Link>
              <Link to="/roadmaps" className="transition hover:text-white">Roadmaps</Link>
              <Link to="/gallery" className="transition hover:text-white">Gallery</Link>
              <Link to="/contact" className="transition hover:text-white">Contact</Link>
            </div>
            <p className="font-mono text-[10px] text-text-muted">&copy; 2026 Math Collective</p>
          </div>
        </footer>
      </div>

      {/* Global command palette — Ctrl/Cmd+K. Mounted at layout root so
          it overlays every page. Gated on isAuth because the search
          backend requires auth and the palette surfaces personal trails. */}
      {isAuth && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}
