import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, SIGNED_IN_HINT } from "../app/auth/AuthProvider";
import Header from "./Header";

const mocks = vi.hoisted(() => ({ postJson: vi.fn(), getJson: vi.fn(), replace: vi.fn() }));
vi.mock("../app/signup/authApi", () => ({ postJson: mocks.postJson, getJson: mocks.getJson }));
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: () => ({ replace: mocks.replace }),
}));

function renderHeader() {
  return render(
    <AuthProvider>
      <Header />
    </AuthProvider>
  );
}

function signedInAs(user) {
  window.localStorage.setItem(SIGNED_IN_HINT, "1");
  mocks.postJson.mockImplementation(async (path) =>
    path === "session/refresh"
      ? { ok: true, status: 200, data: { idToken: "id", expiresIn: 3600 } }
      : { ok: true, status: 200, data: {} }
  );
  mocks.getJson.mockResolvedValue({ ok: true, status: 200, data: user });
}

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Header", () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/");
    window.localStorage.clear();
    mocks.postJson.mockReset();
    mocks.getJson.mockReset();
    mocks.replace.mockReset();
  });

  it("links the logo to the home page", () => {
    renderHeader();

    const logo = screen.getByAltText("nMATIX");
    expect(logo.closest("a").getAttribute("href")).toBe("/");
  });

  it("keeps About, Products, and Contact in order with the current page disabled", () => {
    vi.mocked(usePathname).mockReturnValue("/about/");
    renderHeader();
    const nav = screen.getByRole("navigation", { name: "Main navigation" });

    expect(nav.children[0].textContent.trim()).toBe("About");
    expect(nav.children[1].querySelector("summary").textContent.trim()).toBe("Products");
    expect(nav.children[2].textContent.trim()).toBe("Contact");
    expect(nav.children[0].tagName).toBe("SPAN");
    expect(nav.children[0].getAttribute("aria-current")).toBe("page");
    expect(nav.children[2].getAttribute("href")).toBe("/contact");
    expect(screen.queryByRole("link", { name: "Home" })).toBeNull();
  });

  it("lists products and highlights the current product", () => {
    vi.mocked(usePathname).mockReturnValue("/products/tender-flow/");
    renderHeader();

    expect(screen.queryByRole("link", { name: "Sign-up" })).toBeNull();
    fireEvent.click(screen.getByText("Products", { exact: true }));

    expect(
      screen.getByRole("link", { name: "Interior Quote Generator" }).getAttribute("href")
    ).toBe("/products/interior-quote-generator/");
    expect(screen.getByRole("link", { name: /Tender Flow/ }).getAttribute("aria-current")).toBe(
      "page"
    );
  });

  it("closes with Escape and returns focus to the Products disclosure", () => {
    renderHeader();
    const productsToggle = screen.getByText("Products", { exact: true });
    const productsDropdown = productsToggle.closest("details");
    fireEvent.click(productsToggle);
    expect(productsDropdown.open).toBe(true);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(productsDropdown.open).toBe(false);
    expect(document.activeElement).toBe(productsToggle);
  });

  it("closes when the pointer is pressed outside the dropdown", () => {
    renderHeader();
    const productsToggle = screen.getByText("Products", { exact: true });
    const productsDropdown = productsToggle.closest("details");
    fireEvent.click(productsToggle);
    expect(productsDropdown.open).toBe(true);

    fireEvent.pointerDown(document.body);

    expect(productsDropdown.open).toBe(false);
  });

  it("closes the product dropdown after the route changes", async () => {
    const { rerender } = renderHeader();
    const productsToggle = screen.getByText("Products", { exact: true });
    const productsDropdown = productsToggle.closest("details");
    fireEvent.click(productsToggle);
    expect(productsDropdown.open).toBe(true);

    vi.mocked(usePathname).mockReturnValue("/products/interior-quote-generator/");
    rerender(
      <AuthProvider>
        <Header />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(productsDropdown.open).toBe(false);
    });
  });

  it("expands the mobile navigation with the Products disclosure", () => {
    renderHeader();
    const menuButton = screen.getByRole("button", { name: "Open navigation" });

    fireEvent.click(menuButton);

    expect(menuButton.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("site-navigation").classList.contains("is-open")).toBe(true);
    expect(screen.getByText("Products", { exact: true })).toBeTruthy();
  });

  describe("account area (#29)", () => {
    const contractor = {
      id: "usr_1",
      name: "Ravi Kumar",
      email: "ravi@example.com",
      isAdmin: false,
      products: ["interior-quote-generator"],
    };
    const admin = {
      id: "usr_2",
      name: "Kiran Kabalavai",
      email: "kiran@nmatix.com",
      isAdmin: true,
      products: [],
    };

    it("shows Login when signed out", async () => {
      renderHeader();
      expect((await screen.findByRole("link", { name: "Login" })).getAttribute("href")).toBe(
        "/login"
      );
      expect(screen.queryByRole("button", { name: "Log out" })).toBeNull();
    });

    it("shows nothing in the account area while the session is restored", () => {
      window.localStorage.setItem(SIGNED_IN_HINT, "1");
      mocks.postJson.mockReturnValue(new Promise(() => {}));
      renderHeader();
      expect(screen.queryByRole("link", { name: "Login" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Log out" })).toBeNull();
    });

    it("shows the user's first name, Dashboard and Log out when signed in", async () => {
      signedInAs(contractor);
      renderHeader();
      expect(await screen.findByText("Ravi")).toBeTruthy();
      expect(screen.getByText("Ravi").getAttribute("title")).toBe("ravi@example.com");
      expect(screen.getByRole("link", { name: "Dashboard" }).getAttribute("href")).toBe(
        "/dashboard"
      );
      expect(screen.queryByRole("link", { name: "Login" })).toBeNull();
    });

    it("shows the Admin link only to platform admins", async () => {
      signedInAs(contractor);
      const { unmount } = renderHeader();
      await screen.findByText("Ravi");
      expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
      unmount();

      signedInAs(admin);
      renderHeader();
      await screen.findByText("Kiran");
      expect(screen.getByRole("link", { name: "Admin" }).getAttribute("href")).toBe("/admin");
    });

    it("logs out and returns to the home page", async () => {
      signedInAs(contractor);
      renderHeader();
      fireEvent.click(await screen.findByRole("button", { name: "Log out" }));

      await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
      expect(mocks.postJson).toHaveBeenCalledWith("session/logout", {});
      expect(await screen.findByRole("link", { name: "Login" })).toBeTruthy();
    });

    it("marks Dashboard as the current page there", async () => {
      vi.mocked(usePathname).mockReturnValue("/dashboard/");
      signedInAs(contractor);
      renderHeader();
      await screen.findByText("Ravi");
      expect(screen.getByText("Dashboard").getAttribute("aria-current")).toBe("page");
    });
  });
});
