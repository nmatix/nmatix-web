import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Header from "./Header";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

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
  });

  it("links the logo to the home page", () => {
    render(<Header />);

    const logo = screen.getByAltText("nMATIX");
    expect(logo.closest("a").getAttribute("href")).toBe("/");
  });

  it("keeps About, Products, and Contact in order with the current page disabled", () => {
    vi.mocked(usePathname).mockReturnValue("/about/");
    render(<Header />);
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
    render(<Header />);

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
    render(<Header />);
    const productsToggle = screen.getByText("Products", { exact: true });
    const productsDropdown = productsToggle.closest("details");
    fireEvent.click(productsToggle);
    expect(productsDropdown.open).toBe(true);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(productsDropdown.open).toBe(false);
    expect(document.activeElement).toBe(productsToggle);
  });

  it("closes when the pointer is pressed outside the dropdown", () => {
    render(<Header />);
    const productsToggle = screen.getByText("Products", { exact: true });
    const productsDropdown = productsToggle.closest("details");
    fireEvent.click(productsToggle);
    expect(productsDropdown.open).toBe(true);

    fireEvent.pointerDown(document.body);

    expect(productsDropdown.open).toBe(false);
  });

  it("closes the product dropdown after the route changes", async () => {
    const { rerender } = render(<Header />);
    const productsToggle = screen.getByText("Products", { exact: true });
    const productsDropdown = productsToggle.closest("details");
    fireEvent.click(productsToggle);
    expect(productsDropdown.open).toBe(true);

    vi.mocked(usePathname).mockReturnValue("/products/interior-quote-generator/");
    rerender(<Header />);

    await waitFor(() => {
      expect(productsDropdown.open).toBe(false);
    });
  });

  it("expands the mobile navigation with the Products disclosure", () => {
    render(<Header />);
    const menuButton = screen.getByRole("button", { name: "Open navigation" });

    fireEvent.click(menuButton);

    expect(menuButton.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("site-navigation").classList.contains("is-open")).toBe(true);
    expect(screen.getByText("Products", { exact: true })).toBeTruthy();
  });
});
