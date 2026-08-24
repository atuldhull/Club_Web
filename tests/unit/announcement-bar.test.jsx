// @vitest-environment jsdom
/**
 * AnnouncementBar — the admin-toggled notice pinned above the header on
 * every MainLayout page. Pins the visibility decision matrix:
 * enabled × notice text × audience (guests/all) × auth status × dismissal.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/api", () => ({ events: { settings: vi.fn() } }));

import { events as eventsApi } from "@/lib/api";
import AnnouncementBar from "@/components/AnnouncementBar";
import { useAuthStore } from "@/store/auth-store";

const NOTICE = "Registrations open for Autumn Cohort!";

function mockSettings(overrides = {}) {
  eventsApi.settings.mockResolvedValue({
    data: {
      banner_enabled: "true",
      site_notice: NOTICE,
      banner_audience: "guests",
      registrations_open: "true",
      ...overrides,
    },
  });
}

function renderBar() {
  return render(
    <MemoryRouter>
      <AnnouncementBar />
    </MemoryRouter>,
  );
}

// Resolve the settings fetch and let React commit before asserting absence.
async function settled() {
  await waitFor(() => expect(eventsApi.settings).toHaveBeenCalled());
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuthStore.setState({ status: "guest", user: null, error: null });
  // jsdom has no matchMedia — stub the minimal MediaQueryList surface the
  // reduced-motion hook needs (defaults to "no preference").
  window.matchMedia = (q) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});

describe("AnnouncementBar", () => {
  it("shows the notice with a Join CTA to a guest when enabled", async () => {
    mockSettings();
    renderBar();
    expect(await screen.findByText(NOTICE)).toBeInTheDocument();
    expect(screen.getByText(/join now/i)).toBeInTheDocument();
  });

  it("stays hidden when the banner toggle is off", async () => {
    mockSettings({ banner_enabled: "false" });
    renderBar();
    await settled();
    expect(screen.queryByText(NOTICE)).toBeNull();
  });

  it("stays hidden when the notice text is empty", async () => {
    mockSettings({ site_notice: "   " });
    renderBar();
    await settled();
    expect(screen.queryByText(NOTICE)).toBeNull();
  });

  it("omits the Join CTA when registrations are closed", async () => {
    mockSettings({ registrations_open: "false" });
    renderBar();
    expect(await screen.findByText(NOTICE)).toBeInTheDocument();
    expect(screen.queryByText(/join now/i)).toBeNull();
  });

  it("hides from signed-in members when audience is guests", async () => {
    useAuthStore.setState({ status: "authenticated", user: { id: "u1", role: "student" }, error: null });
    mockSettings();
    renderBar();
    await settled();
    expect(screen.queryByText(NOTICE)).toBeNull();
  });

  it("shows to signed-in members when audience is all — without the Join CTA", async () => {
    useAuthStore.setState({ status: "authenticated", user: { id: "u1", role: "student" }, error: null });
    mockSettings({ banner_audience: "all" });
    renderBar();
    expect(await screen.findByText(NOTICE)).toBeInTheDocument();
    expect(screen.queryByText(/join now/i)).toBeNull();
  });

  it("waits for the auth check before showing the guest banner (no flash mid-check)", async () => {
    useAuthStore.setState({ status: "loading", user: null, error: null });
    mockSettings();
    renderBar();
    await settled();
    expect(screen.queryByText(NOTICE)).toBeNull();
  });

  it("dismiss hides the bar and persists — but a NEW message re-appears", async () => {
    mockSettings();
    const { unmount } = renderBar();
    fireEvent.click(await screen.findByLabelText(/dismiss announcement/i));
    await waitFor(() => expect(screen.queryByText(NOTICE)).toBeNull());
    expect(localStorage.getItem("mc-banner-dismissed")).toBe(NOTICE);
    unmount();

    // Same message again → stays dismissed.
    renderBar();
    await settled();
    expect(screen.queryByText(NOTICE)).toBeNull();

    // Admin publishes a different notice → bar returns.
    const FRESH = "Quiz night this Friday 7pm!";
    mockSettings({ site_notice: FRESH });
    renderBar();
    expect(await screen.findByText(FRESH)).toBeInTheDocument();
  });

  it("renders nothing when the settings endpoint fails", async () => {
    eventsApi.settings.mockRejectedValue(new Error("network down"));
    renderBar();
    await settled();
    expect(screen.queryByText(NOTICE)).toBeNull();
  });

  it("ticker style renders a seamless two-copy scrolling track", async () => {
    mockSettings({ banner_style: "ticker" });
    renderBar();
    // Two copies of the message (the clone is aria-hidden) make the loop seamless.
    await waitFor(() => expect(screen.getAllByText(NOTICE)).toHaveLength(2));
    const copies = screen.getAllByText(NOTICE);
    expect(copies[1]).toHaveAttribute("aria-hidden", "true");
    expect(copies[0]).not.toHaveAttribute("aria-hidden");
  });

  it("ticker style falls back to static when the viewer prefers reduced motion", async () => {
    const mql = window.matchMedia;
    window.matchMedia = (q) => ({
      matches: q.includes("prefers-reduced-motion"),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    try {
      mockSettings({ banner_style: "ticker" });
      renderBar();
      // Static rendering = a single copy of the message, no scroll track.
      expect(await screen.findByText(NOTICE)).toBeInTheDocument();
      expect(screen.getAllByText(NOTICE)).toHaveLength(1);
    } finally {
      window.matchMedia = mql;
    }
  });
});
