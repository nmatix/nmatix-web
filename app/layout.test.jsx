import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RootLayout from "./layout";

vi.mock("../components/Header", () => ({
  default: () => <div data-testid="header-mock">Header</div>,
}));

vi.mock("../components/Footer", () => ({
  default: () => <div data-testid="footer-mock">Footer</div>,
}));

describe("RootLayout", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Header, children, and Footer", () => {
    render(
      <RootLayout>
        <main data-testid="page-content">Page Content</main>
      </RootLayout>
    );

    expect(screen.getByTestId("header-mock")).toBeTruthy();
    expect(screen.getByTestId("page-content")).toBeTruthy();
    expect(screen.getByTestId("footer-mock")).toBeTruthy();
  });

  it("renders with correct HTML structure", () => {
    render(
      <RootLayout>
        <div>Test</div>
      </RootLayout>
    );

    const html = document.querySelector("html");
    expect(html.getAttribute("lang")).toBe("en");
  });
});
