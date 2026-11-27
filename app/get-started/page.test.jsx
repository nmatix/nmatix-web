import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthProvider";
import { SetupProvider } from "../auth/SetupProvider";
import { ADMIN, CONTRACTOR, STEP_IDS, setupData, signIn } from "../test-helpers/appMocks";
import GetStartedPage from "./page";

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

function renderPage() {
  return render(
    <AuthProvider>
      <SetupProvider>
        <GetStartedPage />
      </SetupProvider>
    </AuthProvider>
  );
}

const setupCard = () => screen.getByRole("region", { name: /Setup/ });
const steps = () => within(setupCard()).getAllByRole("listitem");

describe("Get started page (#32, PRD v0.6)", () => {
  beforeEach(() => {
    mocks.postJson.mockReset();
    mocks.getJson.mockReset();
    mocks.appRequest.mockReset();
    mocks.replace.mockReset();
    window.localStorage.clear();
  });
  afterEach(() => cleanup());

  it("sends signed-out visitors to the login page", async () => {
    renderPage();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login/"));
  });

  it("is not available to users without the product", async () => {
    signIn(mocks, ADMIN, {});
    renderPage();
    expect(await screen.findByRole("heading", { name: "Not available" })).toBeTruthy();
    expect(mocks.appRequest).not.toHaveBeenCalled();
  });

  it("shows a new contractor five steps, Start here on the business profile", async () => {
    signIn(mocks, CONTRACTOR, { setup: setupData() });
    renderPage();
    expect(await screen.findByRole("heading", { name: "Get started" })).toBeTruthy();
    await screen.findByRole("region", { name: "Setup steps" });

    const items = steps();
    expect(items.map((li) => li.querySelector(".setup-step-title").textContent)).toEqual([
      "Business profile",
      "Upload your rate card",
      "Define packages",
      "Review room templates",
      "Set adjustments",
    ]);
    expect(screen.queryByText(/first estimate/i)).toBeNull();
    expect(within(items[0]).getByText("Start here")).toBeTruthy();
    expect(
      within(items[0]).getByRole("link", { name: "Business profile" }).getAttribute("href")
    ).toBe("/settings/profile/");
    expect(within(setupCard()).getAllByText("Coming soon")).toHaveLength(4);
    expect(within(setupCard()).getByText("0 of 5 completed")).toBeTruthy();
    expect(
      within(setupCard()).getByRole("heading", { name: "Next: Business profile" })
    ).toBeTruthy();
    expect(
      within(setupCard())
        .getByRole("link", { name: /Set up business profile/ })
        .getAttribute("href")
    ).toBe("/settings/profile/");
  });

  it("marks finished steps and moves Start here on", async () => {
    signIn(mocks, CONTRACTOR, {
      setup: setupData({
        steps: {
          business_profile: { status: "complete", available: true },
          rate_card: { status: "in_progress", available: true },
        },
        startHere: "rate_card",
      }),
    });
    renderPage();
    await screen.findByRole("region", { name: "Setup steps" });
    const [profile, rateCard] = steps();
    expect(profile.className).toContain("is-done");
    expect(within(rateCard).getByText("Start here")).toBeTruthy();
    expect(within(rateCard).getByText("In progress")).toBeTruthy();
    expect(within(setupCard()).getByText("1 of 5 completed")).toBeTruthy();
  });

  it("says when setup is complete and links to the dashboard", async () => {
    const done = Object.fromEntries(
      STEP_IDS.map((id) => [id, { status: "complete", available: true }])
    );
    signIn(mocks, CONTRACTOR, {
      setup: setupData({ steps: done, complete: true, startHere: null }),
    });
    renderPage();
    expect(await screen.findByRole("region", { name: "Setup complete" })).toBeTruthy();
    expect(within(setupCard()).queryByText("Start here")).toBeNull();
    expect(
      within(setupCard())
        .getByRole("link", { name: /Go to your dashboard/ })
        .getAttribute("href")
    ).toBe("/dashboard/");
  });

  it("shows an error with a retry", async () => {
    let calls = 0;
    signIn(mocks, CONTRACTOR, {
      setup: () => (calls++ === 0 ? { ok: false, status: 500, data: {} } : setupData()),
    });
    renderPage();
    expect(await screen.findByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("region", { name: "Setup steps" })).toBeTruthy();
  });

  it("reloads when the tab becomes visible again", async () => {
    let calls = 0;
    signIn(mocks, CONTRACTOR, {
      setup: () =>
        calls++ === 0
          ? setupData()
          : setupData({
              steps: { business_profile: { status: "complete", available: true } },
              complete: true,
              startHere: null,
            }),
    });
    renderPage();
    await screen.findByText("0 of 5 completed");
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(await screen.findByText("1 of 5 completed")).toBeTruthy();
  });
});
