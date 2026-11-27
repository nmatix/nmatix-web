import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, SIGNED_IN_HINT } from "../auth/AuthProvider";
import DashboardPage from "./page";

const mocks = vi.hoisted(() => ({
  postJson: vi.fn(),
  getJson: vi.fn(),
  appRequest: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("../signup/authApi", () => ({
  postJson: mocks.postJson,
  getJson: mocks.getJson,
  appRequest: mocks.appRequest,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const STEP_IDS = [
  "business_profile",
  "rate_card",
  "packages",
  "room_templates",
  "adjustments",
  "first_estimate",
];
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString();

function dashboard({
  steps = {},
  startHere = "business_profile",
  complete = false,
  isAdmin = false,
  ...rest
} = {}) {
  return {
    isAdmin,
    checklist: {
      steps: STEP_IDS.map((id) => ({
        id,
        status: "not_started",
        available: false,
        ...(steps[id] || {}),
      })),
      complete,
      startHere,
    },
    rateCard: null,
    estimates: { last7Days: 0, last30Days: 0, recent: [] },
    freeEstimate: null,
    recentActivity: [],
    ...rest,
  };
}

function signedIn(user = { id: "usr_1", name: "Ravi Kumar", isAdmin: false, products: [] }) {
  window.localStorage.setItem(SIGNED_IN_HINT, "1");
  mocks.postJson.mockResolvedValue({
    ok: true,
    status: 200,
    data: { idToken: "id-1", expiresIn: 3600 },
  });
  mocks.getJson.mockResolvedValue({ ok: true, status: 200, data: user });
}

function serve(data) {
  mocks.appRequest.mockResolvedValue({ ok: true, status: 200, data });
}

function renderDashboard() {
  return render(
    <AuthProvider>
      <DashboardPage />
    </AuthProvider>
  );
}

const card = (name) => screen.getByRole("region", { name });
const setupCard = () => card("Setup checklist");
const steps = () => within(setupCard()).getAllByRole("listitem");
const ready = () => screen.findByRole("region", { name: "Setup checklist" });

describe("Dashboard page (#158) with the setup checklist (#32)", () => {
  beforeEach(() => {
    mocks.postJson.mockReset();
    mocks.getJson.mockReset();
    mocks.appRequest.mockReset();
    mocks.replace.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => cleanup());

  it("sends signed-out visitors to the login page", async () => {
    renderDashboard();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login/"));
    expect(mocks.appRequest).not.toHaveBeenCalled();
  });

  it("shows a loading state while the session is restored", () => {
    window.localStorage.setItem(SIGNED_IN_HINT, "1");
    mocks.postJson.mockReturnValue(new Promise(() => {}));
    renderDashboard();
    expect(screen.getByRole("status").textContent).toContain("Loading your account");
  });

  it("welcomes the user and loads the dashboard with the session token", async () => {
    signedIn();
    serve(dashboard());
    renderDashboard();
    expect(await screen.findByRole("heading", { name: "Welcome back, Ravi!" })).toBeTruthy();
    await ready();
    expect(mocks.appRequest).toHaveBeenCalledWith("dashboard", {
      method: "GET",
      body: undefined,
      headers: { "X-Session-Token": "id-1" },
    });
  });

  describe("setup checklist", () => {
    it("shows a new contractor all six steps, step 1 marked Start here", async () => {
      signedIn();
      serve(dashboard());
      renderDashboard();
      await ready();

      const items = steps();
      expect(items.map((li) => li.querySelector(".setup-step-title").textContent)).toEqual([
        "Business profile",
        "Upload your rate card",
        "Define packages",
        "Review room templates",
        "Set adjustments",
        "Create your first estimate",
      ]);
      expect(within(items[0]).getByText("Start here")).toBeTruthy();
      expect(within(setupCard()).getAllByText("Start here")).toHaveLength(1);
      expect(within(setupCard()).getAllByText("Coming soon")).toHaveLength(7); // 6 steps + next-step button
      expect(within(setupCard()).queryAllByRole("link")).toHaveLength(0);
      expect(within(setupCard()).getByText("0 of 6 completed")).toBeTruthy();
      expect(within(setupCard()).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
      expect(
        within(setupCard()).getByRole("heading", { name: "Next: Business profile" })
      ).toBeTruthy();
    });

    it("links available steps, marks done ones and points to the next step", async () => {
      signedIn();
      serve(
        dashboard({
          steps: {
            business_profile: { status: "complete", available: true },
            rate_card: { status: "in_progress", available: true },
          },
          startHere: "rate_card",
        })
      );
      renderDashboard();
      await ready();

      const [profile, rateCard] = steps();
      expect(profile.className).toContain("is-done");
      expect(within(profile).getByText("(done)")).toBeTruthy();
      expect(
        within(profile).getByRole("link", { name: "Business profile" }).getAttribute("href")
      ).toBe("/settings/profile/");
      expect(within(rateCard).getByText("Start here")).toBeTruthy();
      expect(within(rateCard).getByText("In progress")).toBeTruthy();
      expect(within(setupCard()).getByText("1 of 6 completed")).toBeTruthy();

      const next = within(setupCard()).getByRole("link", { name: /Upload rate card/ });
      expect(next.getAttribute("href")).toBe("/rate-card/");
    });

    it("folds once setup is complete and can be expanded", async () => {
      signedIn();
      const allDone = Object.fromEntries(
        STEP_IDS.map((id) => [id, { status: "complete", available: true }])
      );
      serve(dashboard({ steps: allDone, complete: true, startHere: null }));
      renderDashboard();
      await ready();

      expect(within(setupCard()).getByText("6 of 6 completed")).toBeTruthy();
      expect(within(setupCard()).queryByRole("list")).toBeNull();
      const toggle = within(setupCard()).getByRole("button", { name: "Show setup steps" });
      expect(toggle.getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(toggle);
      expect(steps()).toHaveLength(6);
      expect(within(setupCard()).getByRole("heading", { name: "You're all set!" })).toBeTruthy();
    });

    it("can be hidden while setup is still in progress", async () => {
      signedIn();
      serve(dashboard());
      renderDashboard();
      await ready();
      fireEvent.click(within(setupCard()).getByRole("button", { name: "Hide setup steps" }));
      expect(within(setupCard()).queryByRole("list")).toBeNull();
      expect(within(setupCard()).getByText("0 of 6 completed")).toBeTruthy();
    });
  });

  describe("cards", () => {
    it("shows empty states for a new contractor", async () => {
      signedIn();
      serve(dashboard());
      renderDashboard();
      await ready();

      expect(within(card("Rate card status")).getByText(/No rate card yet/)).toBeTruthy();
      expect(within(card("Rate card status")).getByText("Coming soon")).toBeTruthy();
      const estimates = card("Your estimates");
      expect(within(estimates).getAllByText("0")).toHaveLength(2);
      expect(within(estimates).getByText(/No estimates yet/)).toBeTruthy();
      expect(within(estimates).queryByRole("link", { name: /View all estimates/ })).toBeNull();
      expect(within(card("Recent activity")).getByText(/No activity yet/)).toBeTruthy();
      expect(screen.queryByRole("region", { name: "Free estimate status" })).toBeNull();
      expect(screen.queryByRole("region", { name: "Admin tools" })).toBeNull();
    });

    it("shows the published rate card and a waiting draft", async () => {
      signedIn();
      serve(
        dashboard({
          rateCard: {
            publishedVersion: 3,
            publishedAt: "2026-11-15T10:00:00Z",
            draftWaiting: true,
            draftVersion: "draft of v4",
          },
        })
      );
      renderDashboard();
      await ready();
      const rate = card("Rate card status");
      expect(within(rate).getByText("Published")).toBeTruthy();
      expect(within(rate).getByText("Version 3 · 15 Nov 2026")).toBeTruthy();
      expect(within(rate).getByText("Draft waiting: draft of v4")).toBeTruthy();
      expect(
        within(rate)
          .getByRole("link", { name: /View draft/ })
          .getAttribute("href")
      ).toBe("/rate-card/");
    });

    it("lists recent estimates in INR and filters by 7 or 30 days", async () => {
      signedIn();
      serve(
        dashboard({
          estimates: {
            last7Days: 1,
            last30Days: 2,
            recent: [
              {
                id: "est_1",
                customerName: "Acme Interiors",
                packageName: "Premium",
                total: 1250000,
                createdAt: daysAgo(2),
              },
              {
                id: "est_2",
                customerName: "Design Co.",
                packageName: "Standard",
                total: 850000,
                createdAt: daysAgo(20),
              },
            ],
          },
        })
      );
      renderDashboard();
      await ready();

      const estimates = card("Your estimates");
      expect(within(estimates).getByText("1")).toBeTruthy();
      expect(within(estimates).getByText("2")).toBeTruthy();
      let rows = within(estimates).getAllByRole("row").slice(1);
      expect(rows).toHaveLength(1);
      expect(within(rows[0]).getByText("₹12,50,000")).toBeTruthy();
      expect(
        within(rows[0]).getByRole("link", { name: "Acme Interiors" }).getAttribute("href")
      ).toBe("/estimates/est_1/");

      fireEvent.click(within(estimates).getByRole("button", { name: "30 days" }));
      rows = within(estimates).getAllByRole("row").slice(1);
      expect(rows.map((r) => r.cells[0].textContent)).toEqual(["Acme Interiors", "Design Co."]);
      expect(
        within(estimates).getByRole("button", { name: "30 days" }).getAttribute("aria-pressed")
      ).toBe("true");
      expect(within(estimates).getByRole("link", { name: /View all estimates/ })).toBeTruthy();
    });

    it("shows recent activity", async () => {
      signedIn();
      serve(
        dashboard({
          recentActivity: [
            { type: "estimate_created", at: "2026-11-16T04:54:00Z" },
            { type: "rate_card_published", at: "2026-11-15T10:48:00Z", version: 1 },
            { type: "something_unknown", at: "2026-11-14T10:48:00Z" },
          ],
        })
      );
      renderDashboard();
      await ready();
      const items = within(card("Recent activity")).getAllByRole("listitem");
      expect(items.map((li) => li.querySelector(".activity-title").textContent)).toEqual([
        "New estimate created",
        "Rate card published (version 1)",
      ]);
    });

    it("shows the free estimate status when the server sends it", async () => {
      signedIn();
      serve(dashboard({ freeEstimate: { remaining: 1, unlimited: false } }));
      renderDashboard();
      await ready();
      expect(
        within(card("Free estimate status")).getByText("You have 1 free estimate remaining.")
      ).toBeTruthy();
    });

    it("explains how to continue once the free estimate is used", async () => {
      signedIn();
      serve(dashboard({ freeEstimate: { remaining: 0, unlimited: false } }));
      renderDashboard();
      await ready();
      expect(within(card("Free estimate status")).getByText(/contact@nmatix.com/)).toBeTruthy();
    });

    it("shows admin tools to internal admins only", async () => {
      signedIn({ id: "usr_2", name: "Kiran", isAdmin: true, products: [] });
      serve(dashboard({ isAdmin: true }));
      renderDashboard();
      await ready();
      expect(
        within(card("Admin tools"))
          .getByRole("link", { name: /Go to the admin area/ })
          .getAttribute("href")
      ).toBe("/admin/");
    });
  });

  describe("loading and errors", () => {
    it("shows an error with a retry", async () => {
      signedIn();
      mocks.appRequest
        .mockResolvedValueOnce({ ok: false, status: 500, data: {} })
        .mockResolvedValue({ ok: true, status: 200, data: dashboard() });
      renderDashboard();

      expect(await screen.findByRole("alert")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await ready();
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("treats a network failure as an error", async () => {
      signedIn();
      mocks.appRequest.mockRejectedValue(new TypeError("Failed to fetch"));
      renderDashboard();
      expect(await screen.findByText("We couldn't load your dashboard")).toBeTruthy();
    });

    it("reloads when the tab becomes visible again", async () => {
      signedIn();
      mocks.appRequest.mockResolvedValueOnce({ ok: true, status: 200, data: dashboard() });
      serve(
        dashboard({
          steps: { business_profile: { status: "complete", available: true } },
          startHere: "rate_card",
        })
      );
      renderDashboard();
      await screen.findByText("0 of 6 completed");

      await act(async () => document.dispatchEvent(new Event("visibilitychange")));
      expect(await screen.findByText("1 of 6 completed")).toBeTruthy();
    });
  });
});
