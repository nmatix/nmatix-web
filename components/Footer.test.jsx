import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Footer from "./Footer";

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
});
