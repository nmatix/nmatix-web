import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, SIGNED_IN_HINT } from "../auth/AuthProvider";
import DashboardPage from "./page";

const mocks = vi.hoisted(() => ({ postJson: vi.fn(), getJson: vi.fn(), replace: vi.fn() }));
vi.mock("../signup/authApi", () => ({ postJson: mocks.postJson, getJson: mocks.getJson }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function renderDashboard() {
  return render(
    <AuthProvider>
      <DashboardPage />
    </AuthProvider>
  );
}

describe("Dashboard page (protected)", () => {
  beforeEach(() => {
    mocks.postJson.mockReset();
    mocks.getJson.mockReset();
    mocks.replace.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => cleanup());

  it("sends signed-out visitors to the login page", async () => {
    renderDashboard();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login/"));
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("shows a loading state while the session is restored", () => {
    window.localStorage.setItem(SIGNED_IN_HINT, "1");
    mocks.postJson.mockReturnValue(new Promise(() => {}));
    renderDashboard();
    expect(screen.getByRole("status").textContent).toContain("Loading your account");
  });

  it("welcomes a signed-in user and lets them log out", async () => {
    window.localStorage.setItem(SIGNED_IN_HINT, "1");
    mocks.postJson.mockResolvedValue({
      ok: true,
      status: 200,
      data: { idToken: "id", expiresIn: 3600 },
    });
    mocks.getJson.mockResolvedValue({
      ok: true,
      status: 200,
      data: { id: "usr_1", name: "Kiran", isAdmin: true, products: [] },
    });

    renderDashboard();

    expect(await screen.findByRole("heading", { name: "Welcome, Kiran" })).toBeTruthy();
    expect(screen.getByText(/logged in as an internal admin/)).toBeTruthy();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Log out" })));
    expect(mocks.postJson).toHaveBeenCalledWith("session/logout", {});
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login/"));
  });
});
