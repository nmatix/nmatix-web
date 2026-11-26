import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, SIGNED_IN_HINT } from "../auth/AuthProvider";
import AdminPage from "./page";

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

function signedInAs(user) {
  window.localStorage.setItem(SIGNED_IN_HINT, "1");
  mocks.postJson.mockResolvedValue({
    ok: true,
    status: 200,
    data: { idToken: "id", expiresIn: 3600 },
  });
  mocks.getJson.mockResolvedValue({ ok: true, status: 200, data: user });
}

function renderAdmin() {
  return render(
    <AuthProvider>
      <AdminPage />
    </AuthProvider>
  );
}

describe("Admin page (platform admins only)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.postJson.mockReset();
    mocks.getJson.mockReset();
    mocks.replace.mockReset();
  });

  afterEach(() => cleanup());

  it("sends signed-out visitors to login", async () => {
    renderAdmin();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login/"));
  });

  it("tells a contractor the area is not available", async () => {
    signedInAs({ id: "usr_1", name: "Ravi", isAdmin: false, products: [] });
    renderAdmin();
    expect(await screen.findByRole("heading", { name: "Not available" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Admin" })).toBeNull();
    expect(screen.getByRole("link", { name: "Back to your dashboard" }).getAttribute("href")).toBe(
      "/dashboard/"
    );
  });

  it("shows the admin area to a platform admin", async () => {
    signedInAs({ id: "usr_2", name: "Kiran", isAdmin: true, products: [] });
    renderAdmin();
    expect(await screen.findByRole("heading", { name: "Admin" })).toBeTruthy();
  });
});
