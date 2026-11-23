import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Home Page", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the hero section with main heading", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Innovative Tech Solutions" })).toBeTruthy();
  });

  it("renders the three feature sections", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Software Development" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Consulting & Services" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "AI & Machine Learning" })).toBeTruthy();
  });

  it("includes a contact link in the reach-out section", () => {
    render(<Home />);

    const contactLink = screen.getByRole("link", { name: "contact us" });
    expect(contactLink).toBeTruthy();
    expect(contactLink.getAttribute("href")).toBe("/contact");
  });

  it("renders feature descriptions", () => {
    render(<Home />);

    expect(screen.getByText(/Custom software and mobile solutions/)).toBeTruthy();
    expect(screen.getByText(/Expert consulting in QA/)).toBeTruthy();
    expect(screen.getByText(/AI-powered solutions/)).toBeTruthy();
  });
});
