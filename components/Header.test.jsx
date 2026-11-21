import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Header from "./Header";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from "next/navigation";

describe("Header", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the logo with link to home", () => {
    usePathname.mockReturnValue("/");
    render(<Header />);

    const logo = screen.getByAltText("nMATIX");
    expect(logo).toBeTruthy();
    expect(logo.closest("a").getAttribute("href")).toBe("/");
  });

  it("renders About and Contact links on home page", () => {
    usePathname.mockReturnValue("/");
    render(<Header />);

    expect(screen.getByRole("link", { name: "About" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Contact" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Home" })).toBeNull();
  });

  it("renders Home and Contact links on about page", () => {
    usePathname.mockReturnValue("/about");
    render(<Header />);

    expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Contact" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "About" })).toBeNull();
  });

  it("renders Home and About links on contact page", () => {
    usePathname.mockReturnValue("/contact");
    render(<Header />);

    expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "About" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Contact" })).toBeNull();
  });

  it("shows sign-up button on non-signup pages", () => {
    usePathname.mockReturnValue("/");
    render(<Header />);

    expect(screen.getByRole("link", { name: "Sign-up" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Login" })).toBeTruthy();
  });

  it("hides sign-up button on signup page", () => {
    usePathname.mockReturnValue("/signup");
    render(<Header />);

    expect(screen.queryByRole("link", { name: "Sign-up" })).toBeNull();
    expect(screen.getByRole("link", { name: "Login" })).toBeTruthy();
  });

  it("falls back to home page links for unknown paths", () => {
    usePathname.mockReturnValue("/unknown-page");
    render(<Header />);

    expect(screen.getByRole("link", { name: "About" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Contact" })).toBeTruthy();
  });

  it("handles trailing slashes in pathname", () => {
    usePathname.mockReturnValue("/about/");
    render(<Header />);

    expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Contact" })).toBeTruthy();
  });
});
