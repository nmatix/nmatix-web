import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, SIGNED_IN_HINT } from "../auth/AuthProvider";
import { SetupProvider } from "../auth/SetupProvider";
import { ADMIN, CONTRACTOR, setupData, signIn } from "../test-helpers/appMocks";
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

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString();
const SETUP_DONE = setupData({
  steps: { business_profile: { status: "complete", available: true } },
  complete: true,
  startHere: null,
});

function dashboard(overrides = {}) {
  return {
    isAdmin: false,
    rateCard: null,
    estimates: { last7Days: 0, last30Days: 0, recent: [] },
    freeEstimate: null,
    recentActivity: [],
    ...overrides,
  };
}

function renderDashboard() {
  return render(
    <AuthProvider>
      <SetupProvider>
        <DashboardPage />
      </SetupProvider>
    </AuthProvider>
  );
}

const card = (name) => screen.getByRole("region", { name });
const ready = () => screen.findByRole("region", { name: "Your estimates" });
const asContractor = (board = dashboard(), setup = SETUP_DONE) =>
  signIn(mocks, CONTRACTOR, { setup, dashboard: board });

describe("Dashboard page (#158, PRD v0.6)", () => {
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

  describe("one-time setup", () => {
    it("sends contractors who haven't finished setup to Get started", async () => {
      asContractor(dashboard(), setupData());
      renderDashboard();
      await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/get-started/"));
      expect(screen.queryByRole("heading", { name: /Welcome back/ })).toBeNull();
      expect(mocks.appRequest).not.toHaveBeenCalledWith("dashboard", expect.anything());
    });

    it("shows the dashboard once setup is complete, without a setup checklist", async () => {
      asContractor();
      renderDashboard();
      expect(await screen.findByRole("heading", { name: "Welcome back, Ravi!" })).toBeTruthy();
      await ready();
      expect(mocks.replace).not.toHaveBeenCalled();
      expect(screen.queryByRole("region", { name: /Setup/ })).toBeNull();
      expect(mocks.appRequest).toHaveBeenCalledWith("dashboard", {
        method: "GET",
        body: undefined,
        headers: { "X-Session-Token": "id-1" },
      });
      expect(screen.getByText("New estimate (coming soon)").getAttribute("aria-disabled")).toBe(
        "true"
      );
    });

    it("shows internal admins without the product their dashboard, without setup", async () => {
      signIn(mocks, ADMIN, { dashboard: dashboard({ isAdmin: true }) });
      renderDashboard();
      await ready();
      expect(mocks.appRequest).not.toHaveBeenCalledWith("setup", expect.anything());
      expect(
        within(card("Admin tools"))
          .getByRole("link", { name: /Go to the admin area/ })
          .getAttribute("href")
      ).toBe("/admin/");
    });
  });

  describe("cards", () => {
    it("shows empty states for a contractor without estimates yet", async () => {
      asContractor();
      renderDashboard();
      await ready();
      expect(within(card("Rate card status")).getByText(/No rate card yet/)).toBeTruthy();
      const estimates = card("Your estimates");
      expect(within(estimates).getAllByText("0")).toHaveLength(2);
      expect(within(estimates).getByText(/No estimates yet/)).toBeTruthy();
      expect(within(card("Recent activity")).getByText(/No activity yet/)).toBeTruthy();
      expect(screen.queryByRole("region", { name: "Free estimate status" })).toBeNull();
      expect(screen.queryByRole("region", { name: "Admin tools" })).toBeNull();
    });

    it("shows the published rate card and a waiting draft", async () => {
      asContractor(
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
    });

    it("lists recent estimates in INR and filters by 7 or 30 days", async () => {
      asContractor(
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
      let rows = within(estimates).getAllByRole("row").slice(1);
      expect(rows).toHaveLength(1);
      expect(within(rows[0]).getByText("₹12,50,000")).toBeTruthy();
      fireEvent.click(within(estimates).getByRole("button", { name: "30 days" }));
      rows = within(estimates).getAllByRole("row").slice(1);
      expect(rows.map((r) => r.cells[0].textContent)).toEqual(["Acme Interiors", "Design Co."]);
    });

    it("shows recent activity, skipping unknown kinds", async () => {
      asContractor(
        dashboard({
          recentActivity: [
            { type: "profile_updated", at: "2026-11-16T04:54:00Z" },
            { type: "rate_card_published", at: "2026-11-15T10:48:00Z", version: 1 },
            { type: "something_unknown", at: "2026-11-14T10:48:00Z" },
          ],
        })
      );
      renderDashboard();
      await ready();
      const items = within(card("Recent activity")).getAllByRole("listitem");
      expect(items.map((li) => li.querySelector(".activity-title").textContent)).toEqual([
        "Business profile updated",
        "Rate card published (version 1)",
      ]);
    });

    it("shows the free estimate status when the server sends it", async () => {
      asContractor(dashboard({ freeEstimate: { remaining: 1, unlimited: false } }));
      renderDashboard();
      await ready();
      expect(
        within(card("Free estimate status")).getByText("You have 1 free estimate remaining.")
      ).toBeTruthy();
    });
  });

  describe("loading and errors", () => {
    it("shows an error with a retry", async () => {
      let calls = 0;
      asContractor();
      signIn(mocks, CONTRACTOR, {
        setup: SETUP_DONE,
        dashboard: () => (calls++ === 0 ? { ok: false, status: 500, data: {} } : dashboard()),
      });
      renderDashboard();
      expect(await screen.findByRole("alert")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await ready();
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("treats a network failure as an error", async () => {
      signIn(mocks, CONTRACTOR, { setup: SETUP_DONE, dashboard: new TypeError("Failed to fetch") });
      renderDashboard();
      expect(await screen.findByText("We couldn't load your dashboard")).toBeTruthy();
    });

    it("reloads when the tab becomes visible again", async () => {
      let calls = 0;
      signIn(mocks, CONTRACTOR, {
        setup: SETUP_DONE,
        dashboard: () =>
          calls++ === 0
            ? dashboard()
            : dashboard({
                recentActivity: [{ type: "profile_updated", at: "2026-11-16T04:54:00Z" }],
              }),
      });
      renderDashboard();
      await screen.findByText(/No activity yet/);
      await act(async () => document.dispatchEvent(new Event("visibilitychange")));
      expect(await screen.findByText("Business profile updated")).toBeTruthy();
    });
  });
});
