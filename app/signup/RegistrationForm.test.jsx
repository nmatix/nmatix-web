import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RegistrationForm from "./RegistrationForm";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

function enterValidDetails({ company = "", email = "Person@Example.com" } = {}) {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "  Example Person  " },
  });
  fireEvent.change(screen.getByLabelText("Company (optional)"), {
    target: { value: company },
  });
  fireEvent.change(screen.getByLabelText("Phone"), {
    target: { value: "98765 43210" },
  });
}

function submitForm() {
  fireEvent.submit(screen.getByRole("button", { name: "Request access" }).closest("form"));
}

describe("RegistrationForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows helpful validation errors without sending invalid data", () => {
    render(<RegistrationForm />);
    expect(screen.getByLabelText("Country calling code").value).toBe("+91");
    expect(screen.getByLabelText("Country calling code").disabled).toBe(true);

    submitForm();

    expect(screen.getByText("Enter your email address.")).toBeTruthy();
    expect(screen.getByText("Enter your name.")).toBeTruthy();
    expect(screen.getByText("Enter your 10-digit Indian mobile number.")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows a loading state and disables submission while the request is pending", async () => {
    let resolveRequest;
    fetch.mockReturnValue(new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    render(<RegistrationForm />);
    enterValidDetails();

    submitForm();

    expect(screen.getByRole("button", { name: "Submitting..." }).disabled).toBe(true);
    resolveRequest({ ok: true, status: 201, json: async () => ({ id: "usr_123" }) });
    expect(await screen.findByText("Registration received, pending activation")).toBeTruthy();
  });

  it("posts normalized user details and confirms successful registration", async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: "usr_123", status: "pending_activation" }),
    });
    render(<RegistrationForm />);
    enterValidDetails({ company: "Acme Corp" });

    submitForm();

    expect(await screen.findByText("Registration received, pending activation")).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(
      "/auth/register",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "person@example.com",
          name: "Example Person",
          phone: "+919876543210",
          company: "Acme Corp",
        }),
      })
    );
  });

  it("shows the login action when the email is already registered", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: {
          code: "EMAIL_ALREADY_REGISTERED",
          message: "A user with this email address is already registered.",
        },
      }),
    });
    render(<RegistrationForm />);
    enterValidDetails();

    submitForm();

    expect(
      await screen.findByText(
        "An account with this email already exists. Please log in to continue."
      )
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Login" }).getAttribute("href")).toBe("/login");
  });
});
