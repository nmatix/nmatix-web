import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ContactPage from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("./ContactForm", () => ({
  default: () => <div data-testid="contact-form-mock">ContactForm</div>,
}));

describe("Contact Page", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders contact information section", () => {
    render(<ContactPage />);

    expect(
      screen.getByRole("heading", { name: "Contact Information" })
    ).toBeTruthy();
  });

  it("displays office address", () => {
    render(<ContactPage />);

    expect(screen.getByRole("heading", { name: "Head Office" })).toBeTruthy();
    expect(screen.getByText("G701, Rajapushpa Atria")).toBeTruthy();
    expect(screen.getByText(/Golden Mile Road, Kokapet/)).toBeTruthy();
    expect(screen.getByText(/Telangana 500075/)).toBeTruthy();
  });

  it("renders the contact form section", () => {
    render(<ContactPage />);

    expect(
      screen.getByRole("heading", { name: "Send Us a Message" })
    ).toBeTruthy();
    expect(screen.getByTestId("contact-form-mock")).toBeTruthy();
  });
});
