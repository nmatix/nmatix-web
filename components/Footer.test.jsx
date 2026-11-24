import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Footer from "./Footer";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Footer", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the copyright notice with current year", () => {
    render(<Footer />);

    expect(screen.getByText(/2026 Nmatix Technologies LLP/)).toBeTruthy();
    expect(screen.getByText(/All Rights Reserved/)).toBeTruthy();
  });

  it("renders within a footer element", () => {
    render(<Footer />);

    const footer = document.querySelector("footer");
    expect(footer).toBeTruthy();
  });

  it("links to the legal documents", () => {
    render(<Footer />);

    expect(screen.getByRole("link", { name: "Terms of Service" }).getAttribute("href")).toBe(
      "/terms"
    );
    expect(screen.getByRole("link", { name: "Privacy Notice" }).getAttribute("href")).toBe(
      "/privacy"
    );
  });
});
