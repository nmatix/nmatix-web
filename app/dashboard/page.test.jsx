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

function dashboard({
  steps = {},
  startHere = "business_profile",
  complete = false,
  isAdmin = false,
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

function renderDashboard() {
  return render(
    <AuthProvider>
      <DashboardPage />
    </AuthProvider>
  );
}

const steps = () => within(screen.getByRole("list")).getAllByRole("listitem");

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

  it("loads the dashboard with the session token", async () => {
    signedIn();
    mocks.appRequest.mockResolvedValue({ ok: true, status: 200, data: dashboard() });
    renderDashboard();
    expect(await screen.findByRole("heading", { name: "Welcome, Ravi" })).toBeTruthy();
    await screen.findByRole("heading", { name: "Set up your account" });
    expect(mocks.appRequest).toHaveBeenCalledWith("dashboard", {
      method: "GET",
      body: undefined,
      headers: { "X-Session-Token": "id-1" },
    });
  });

  it("shows a brand-new contractor all six steps, step 1 marked Start here", async () => {
    signedIn();
    mocks.appRequest.mockResolvedValue({ ok: true, status: 200, data: dashboard() });
    renderDashboard();
    await screen.findByRole("heading", { name: "Set up your account" });

    const items = steps();
    expect(items.map((li) => li.querySelector(".setup-step-title").firstChild.textContent)).toEqual(
      [
        "Business profile",
        "Upload your rate card",
        "Define packages",
        "Review room templates",
        "Set adjustments",
        "Create your first estimate",
      ]
    );
    expect(within(items[0]).getByText("Start here")).toBeTruthy();
    expect(screen.getAllByText("Start here")).toHaveLength(1);
    // Screens not built yet: no links, "Coming soon"
    expect(screen.getAllByText("Coming soon")).toHaveLength(6);
    expect(within(screen.getByRole("list")).queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText("0 of 6 done")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
    // Other sections: empty states, New estimate not available yet
    expect(screen.getByText("Your estimates will appear here.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "New estimate" }).disabled).toBe(true);
  });

  it("links available steps and moves Start here past finished ones", async () => {
    signedIn();
    mocks.appRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: dashboard({
        steps: {
          business_profile: { status: "complete", available: true },
          rate_card: { status: "in_progress", available: true },
        },
        startHere: "rate_card",
      }),
    });
    renderDashboard();
    await screen.findByRole("heading", { name: "Set up your account" });

    const [profile, rateCard] = steps();
    expect(
      within(profile).getByRole("link", { name: "Business profile" }).getAttribute("href")
    ).toBe("/settings/profile/");
    expect(within(profile).getByText("Done")).toBeTruthy();
    expect(within(profile).queryByText("Start here")).toBeNull();
    expect(
      within(rateCard).getByRole("link", { name: "Upload your rate card" }).getAttribute("href")
    ).toBe("/rate-card/");
    expect(within(rateCard).getByText("In progress")).toBeTruthy();
    expect(within(rateCard).getByText("Start here")).toBeTruthy();
    expect(screen.getByText("1 of 6 done")).toBeTruthy();
  });

  it("folds the checklist once setup is complete, with an option to expand it", async () => {
    signedIn();
    const allDone = Object.fromEntries(
      STEP_IDS.map((id) => [id, { status: "complete", available: true }])
    );
    mocks.appRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: dashboard({ steps: allDone, complete: true, startHere: null }),
    });
    renderDashboard();

    expect(await screen.findByRole("heading", { name: "Setup complete" })).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
    const toggle = screen.getByRole("button", { name: "Show setup steps" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);
    expect(steps()).toHaveLength(6);
    expect(
      screen.getByRole("button", { name: "Hide setup steps" }).getAttribute("aria-expanded")
    ).toBe("true");
    expect(screen.queryByText("Start here")).toBeNull();
  });

  it("shows an error with a retry", async () => {
    signedIn();
    mocks.appRequest
      .mockResolvedValueOnce({ ok: false, status: 500, data: {} })
      .mockResolvedValue({ ok: true, status: 200, data: dashboard() });
    renderDashboard();

    expect(await screen.findByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Set up your account" })).toBeTruthy();
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
    mocks.appRequest
      .mockResolvedValueOnce({ ok: true, status: 200, data: dashboard() })
      .mockResolvedValue({
        ok: true,
        status: 200,
        data: dashboard({
          steps: { business_profile: { status: "complete", available: true } },
          startHere: "rate_card",
        }),
      });
    renderDashboard();
    await screen.findByText("0 of 6 done");

    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(await screen.findByText("1 of 6 done")).toBeTruthy();
  });

  it("links internal admins to the admin area", async () => {
    signedIn({ id: "usr_2", name: "Kiran", isAdmin: true, products: [] });
    mocks.appRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: dashboard({ isAdmin: true }),
    });
    renderDashboard();
    expect(
      (await screen.findByRole("link", { name: "Go to the admin area" })).getAttribute("href")
    ).toBe("/admin/");
  });

  it("does not show the admin link to contractors", async () => {
    signedIn();
    mocks.appRequest.mockResolvedValue({ ok: true, status: 200, data: dashboard() });
    renderDashboard();
    await screen.findByRole("heading", { name: "Set up your account" });
    expect(screen.queryByRole("link", { name: "Go to the admin area" })).toBeNull();
  });
});
