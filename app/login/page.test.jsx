import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Login Page", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the login heading", () => {
    render(<LoginPage />);

    expect(screen.getByRole("heading", { name: "Login" })).toBeTruthy();
  });

  it("displays placeholder message about account activation", () => {
    render(<LoginPage />);

    expect(
      screen.getByText("Login access will be available after account activation.")
    ).toBeTruthy();
  });

  it("includes a link to signup page", () => {
    render(<LoginPage />);

    const signupLink = screen.getByRole("link", { name: "Sign-up" });
    expect(signupLink).toBeTruthy();
    expect(signupLink.getAttribute("href")).toBe("/signup");
  });

  it("asks users to sign up if they need access", () => {
    render(<LoginPage />);

    expect(screen.getByText(/Need to request access\?/)).toBeTruthy();
  });
});
