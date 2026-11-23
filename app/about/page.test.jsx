import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import About from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("About Page", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the mission section", () => {
    render(<About />);

    expect(screen.getByRole("heading", { name: "Our Mission" })).toBeTruthy();
    expect(screen.getByText(/we specialize in delivering/i)).toBeTruthy();
  });

  it("renders the founder section", () => {
    render(<About />);

    expect(
      screen.getByRole("heading", { name: "Meet Our Founder" })
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Kiran Kabalavai" })).toBeTruthy();
    expect(screen.getByText("Founder & Managing Partner")).toBeTruthy();
  });

  it("renders the founder photo with alt text", () => {
    render(<About />);

    const founderImage = screen.getByAltText(
      "Kiran Kabalavai - Founder & CEO"
    );
    expect(founderImage).toBeTruthy();
    expect(founderImage.getAttribute("src")).toBe(
      "/images/kiran-kabalavai.jpg"
    );
  });

  it("lists founder career highlights", () => {
    render(<About />);

    expect(screen.getByText("IT Leader at Amazon")).toBeTruthy();
    expect(
      screen.getByText("Architect at Federal Reserve Bank of Minneapolis")
    ).toBeTruthy();
    expect(screen.getByText("Architect at Ameriprise")).toBeTruthy();
  });

  it("lists industry experience", () => {
    render(<About />);

    expect(screen.getByText(/HSBC, Wells Fargo/)).toBeTruthy();
    expect(screen.getByText(/Boston Scientific/)).toBeTruthy();
    expect(screen.getByText(/CenturyLink/)).toBeTruthy();
    expect(screen.getByText(/Digital River/)).toBeTruthy();
  });

  it("includes a contact call-to-action", () => {
    render(<About />);

    expect(
      screen.getByText(/Ready to transform your business/)
    ).toBeTruthy();
  });
});
