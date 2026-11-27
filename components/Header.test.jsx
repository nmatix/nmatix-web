import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, SIGNED_IN_HINT } from "../app/auth/AuthProvider";
import { SetupProvider } from "../app/auth/SetupProvider";
import Header from "./Header";

const mocks = vi.hoisted(() => ({
  postJson: vi.fn(),
  getJson: vi.fn(),
  appRequest: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("../app/signup/authApi", () => ({
  postJson: mocks.postJson,
  getJson: mocks.getJson,
  appRequest: mocks.appRequest,
}));
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: () => ({ replace: mocks.replace }),
}));

function renderHeader() {
  return render(
    <AuthProvider>
      <SetupProvider>
        <Header />
      </SetupProvider>
    </AuthProvider>
  );
}

function setupStatus(complete) {
  mocks.appRequest.mockResolvedValue({
    ok: true,
    status: 200,
    data: { steps: [], complete, startHere: complete ? null : "business_profile" },
  });
}

function signedInAs(user, { setupComplete = true } = {}) {
  setupStatus(setupComplete);
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
    mocks.appRequest.mockReset();
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
        <SetupProvider>
          <Header />
        </SetupProvider>
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

  describe("account area (#29, #186)", () => {
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

    const accountButton = () => screen.findByRole("button", { name: /^Account menu for/ });

    it("shows Login when signed out", async () => {
      renderHeader();
      expect((await screen.findByRole("link", { name: "Login" })).getAttribute("href")).toBe(
        "/login"
      );
      expect(screen.queryByRole("button", { name: /Account menu/ })).toBeNull();
    });

    it("shows nothing in the account area while the session is restored", () => {
      window.localStorage.setItem(SIGNED_IN_HINT, "1");
      mocks.postJson.mockReturnValue(new Promise(() => {}));
      renderHeader();
      expect(screen.queryByRole("link", { name: "Login" })).toBeNull();
      expect(screen.queryByRole("button", { name: /Account menu/ })).toBeNull();
    });

    it("shows one account button with initials and first name, not separate items", async () => {
      signedInAs(contractor);
      renderHeader();
      const button = await accountButton();
      expect(button.getAttribute("aria-label")).toBe("Account menu for Ravi Kumar");
      expect(button.getAttribute("aria-haspopup")).toBe("menu");
      expect(button.getAttribute("aria-expanded")).toBe("false");
      expect(button.textContent).toBe("RKRavi");
      expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Log out" })).toBeNull();
      expect(screen.queryByRole("link", { name: "Login" })).toBeNull();
    });

    it("opens a menu with name, email, Dashboard and Log out", async () => {
      signedInAs(contractor);
      renderHeader();
      fireEvent.click(await accountButton());

      const menu = screen.getByRole("menu", { name: "Account" });
      expect((await accountButton()).getAttribute("aria-expanded")).toBe("true");
      expect(menu.textContent).toContain("Ravi Kumar");
      expect(menu.textContent).toContain("ravi@example.com");
      const items = screen.getAllByRole("menuitem");
      expect(items.map((i) => i.textContent)).toEqual(["Dashboard", "Log out"]);
      expect(items[0].getAttribute("href")).toBe("/dashboard/");
    });

    it("shows Admin in the menu only to platform admins", async () => {
      signedInAs(admin);
      renderHeader();
      fireEvent.click(await accountButton());
      const items = screen.getAllByRole("menuitem");
      expect(items.map((i) => i.textContent)).toEqual(["Dashboard", "Admin", "Log out"]);
      expect(items[1].getAttribute("href")).toBe("/admin/");
    });

    it("supports the keyboard: open, move, wrap and close with Escape", async () => {
      signedInAs(admin);
      renderHeader();
      const button = await accountButton();
      fireEvent.keyDown(button, { key: "ArrowDown" });

      const items = await screen.findAllByRole("menuitem");
      await waitFor(() => expect(document.activeElement).toBe(items[0]));
      const menu = screen.getByRole("menu");
      fireEvent.keyDown(menu, { key: "ArrowDown" });
      expect(document.activeElement).toBe(items[1]);
      fireEvent.keyDown(menu, { key: "End" });
      expect(document.activeElement).toBe(items[2]);
      fireEvent.keyDown(menu, { key: "ArrowDown" });
      expect(document.activeElement).toBe(items[0]);
      fireEvent.keyDown(menu, { key: "ArrowUp" });
      expect(document.activeElement).toBe(items[2]);
      fireEvent.keyDown(menu, { key: "Home" });
      expect(document.activeElement).toBe(items[0]);

      fireEvent.keyDown(menu, { key: "Escape" });
      expect(screen.queryByRole("menu")).toBeNull();
      expect(document.activeElement).toBe(button);
    });

    it("opens with Enter and closes on Tab", async () => {
      signedInAs(contractor);
      renderHeader();
      fireEvent.keyDown(await accountButton(), { key: "Enter" });
      const menu = await screen.findByRole("menu");
      fireEvent.keyDown(menu, { key: "Tab" });
      expect(screen.queryByRole("menu")).toBeNull();
    });

    it("closes when the pointer is pressed outside", async () => {
      signedInAs(contractor);
      renderHeader();
      fireEvent.click(await accountButton());
      expect(screen.getByRole("menu")).toBeTruthy();
      fireEvent.pointerDown(document.body);
      expect(screen.queryByRole("menu")).toBeNull();
    });

    it("closes when the page changes", async () => {
      signedInAs(contractor);
      const { rerender } = renderHeader();
      fireEvent.click(await accountButton());
      expect(screen.getByRole("menu")).toBeTruthy();

      vi.mocked(usePathname).mockReturnValue("/about/");
      rerender(
        <AuthProvider>
          <SetupProvider>
            <Header />
          </SetupProvider>
        </AuthProvider>
      );
      expect(screen.queryByRole("menu")).toBeNull();
    });

    it("logs out from the menu and returns to the home page", async () => {
      signedInAs(contractor);
      renderHeader();
      fireEvent.click(await accountButton());
      fireEvent.click(screen.getByRole("menuitem", { name: "Log out" }));

      await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
      expect(mocks.postJson).toHaveBeenCalledWith("session/logout", {});
      expect(await screen.findByRole("link", { name: "Login" })).toBeTruthy();
    });

    it("offers Finish setup instead of Dashboard until setup is complete (PRD v0.6)", async () => {
      signedInAs(contractor, { setupComplete: false });
      renderHeader();
      fireEvent.click(await accountButton());
      const first = await screen.findByRole("menuitem", { name: "Finish setup" });
      expect(first.getAttribute("href")).toBe("/get-started/");
      expect(screen.queryByRole("menuitem", { name: "Dashboard" })).toBeNull();
      expect(mocks.appRequest).toHaveBeenCalledWith("setup", expect.anything());
    });

    it("shows Dashboard to users without the product, without asking for setup", async () => {
      signedInAs(admin, { setupComplete: false });
      renderHeader();
      fireEvent.click(await accountButton());
      expect(screen.getByRole("menuitem", { name: "Dashboard" })).toBeTruthy();
      expect(mocks.appRequest).not.toHaveBeenCalled();
    });

    it("marks Dashboard as the current page in the menu", async () => {
      vi.mocked(usePathname).mockReturnValue("/dashboard/");
      signedInAs(contractor);
      renderHeader();
      fireEvent.click(await accountButton());
      expect(screen.getByRole("menuitem", { name: "Dashboard" }).getAttribute("aria-current")).toBe(
        "page"
      );
    });
  });
});
