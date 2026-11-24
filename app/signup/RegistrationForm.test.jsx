import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRIVACY_VERSION, TERMS_VERSION } from "../../data/legal";
import RegistrationForm from "./RegistrationForm";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function enterValidDetails({
  company = "",
  email = "Person@Example.com",
  phone = "98765 43210",
  acceptTerms = true,
} = {}) {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "  Example Person  " },
  });
  fireEvent.change(screen.getByLabelText("Business name (optional)"), {
    target: { value: company },
  });
  fireEvent.change(screen.getByLabelText("Phone"), {
    target: { value: phone },
  });
  if (acceptTerms) {
    fireEvent.click(screen.getByRole("checkbox"));
  }
}

function submitForm() {
  fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form"));
}

function mockResponse(status, body) {
  fetch.mockResolvedValue({ ok: status < 400, status, json: async () => body });
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
    expect(screen.getByText("Accept the terms and privacy notice to continue.")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires the terms and privacy notice to be accepted", () => {
    render(<RegistrationForm />);
    enterValidDetails({ acceptTerms: false });

    submitForm();

    expect(screen.getByText("Accept the terms and privacy notice to continue.")).toBeTruthy();
    expect(screen.getByRole("checkbox").getAttribute("aria-invalid")).toBe("true");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("links to the terms and privacy documents in a new tab", () => {
    render(<RegistrationForm />);

    const terms = screen.getByRole("link", { name: "Terms of Service" });
    const privacy = screen.getByRole("link", { name: "Privacy Notice" });
    expect(terms.getAttribute("href")).toBe("/terms");
    expect(privacy.getAttribute("href")).toBe("/privacy");
    expect(terms.getAttribute("target")).toBe("_blank");
    expect(privacy.getAttribute("target")).toBe("_blank");
  });

  it("shows a loading state and disables submission while the request is pending", async () => {
    let resolveRequest;
    fetch.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    render(<RegistrationForm />);
    enterValidDetails();

    submitForm();

    expect(screen.getByRole("button", { name: "Submitting..." }).disabled).toBe(true);
    resolveRequest({ ok: true, status: 201, json: async () => ({ id: "usr_123" }) });
    expect(await screen.findByText("Registration received.")).toBeTruthy();
  });

  it("posts normalized details with product and terms acceptance, then asks to verify email", async () => {
    mockResponse(201, {
      id: "usr_123",
      status: "unverified",
      email: "p***@example.com",
      nextStep: "verify_email",
    });
    render(<RegistrationForm />);
    enterValidDetails({ company: "Acme Interiors", phone: "098765 43210" });

    submitForm();

    expect(await screen.findByText("Registration received.")).toBeTruthy();
    expect(
      screen.getByText("Verify your email (p***@example.com) to activate your account.")
    ).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(
      "/auth/register",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "person@example.com",
          name: "Example Person",
          phone: "+919876543210",
          company: "Acme Interiors",
          product: "interior-quote-generator",
          termsAccepted: true,
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
        }),
      })
    );
  });

  it("omits the business name when it is left empty", async () => {
    mockResponse(201, { id: "usr_123" });
    render(<RegistrationForm />);
    enterValidDetails();

    submitForm();

    await screen.findByText("Registration received.");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty("company");
  });

  it("highlights an already registered email, keeps the details and offers login", async () => {
    mockResponse(409, {
      error: {
        code: "ALREADY_REGISTERED",
        message: "An account with these details already exists.",
        fields: { email: "This email is already registered." },
      },
    });
    render(<RegistrationForm />);
    enterValidDetails({ company: "Acme Interiors" });

    submitForm();

    expect(
      await screen.findByText(
        "This email is already registered. Log in, or change the highlighted details and submit again."
      )
    ).toBeTruthy();
    expect(screen.getByText("This email is already registered.")).toBeTruthy();
    expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("Phone").getAttribute("aria-invalid")).toBe("false");
    expect(screen.getByRole("link", { name: "Login" }).getAttribute("href")).toBe("/login");
    // Nothing the user typed is lost
    expect(screen.getByLabelText("Email").value).toBe("Person@Example.com");
    expect(screen.getByLabelText("Business name (optional)").value).toBe("Acme Interiors");
    expect(screen.getByRole("checkbox").checked).toBe(true);
  });

  it("says which details are in use when the phone or both are registered", async () => {
    mockResponse(409, {
      error: {
        code: "ALREADY_REGISTERED",
        fields: {
          email: "This email is already registered.",
          phone: "This phone number is already registered.",
        },
      },
    });
    render(<RegistrationForm />);
    enterValidDetails();

    submitForm();

    expect(
      await screen.findByText(
        "This email and phone number are already registered. Log in, or change the highlighted details and submit again."
      )
    ).toBeTruthy();
    expect(screen.getByText("This phone number is already registered.")).toBeTruthy();
  });

  it("lets the user correct the highlighted field and submit again", async () => {
    mockResponse(409, {
      error: {
        code: "ALREADY_REGISTERED",
        fields: { phone: "This phone number is already registered." },
      },
    });
    render(<RegistrationForm />);
    enterValidDetails();
    submitForm();
    await screen.findByText("This phone number is already registered.");

    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "91234 56789" } });
    expect(screen.queryByText("This phone number is already registered.")).toBeNull();

    mockResponse(201, { id: "usr_456", email: "p***@example.com" });
    submitForm();

    expect(await screen.findByText("Registration received.")).toBeTruthy();
    expect(JSON.parse(fetch.mock.calls[1][1].body).phone).toBe("+919123456789");
  });

  it("shows field errors returned by the API, including outdated terms", async () => {
    mockResponse(400, {
      error: {
        code: "VALIDATION_ERROR",
        fields: {
          terms:
            "The terms or privacy notice have been updated. Please review and accept them again.",
        },
      },
    });
    render(<RegistrationForm />);
    enterValidDetails();

    submitForm();

    expect(
      await screen.findByText(
        "The terms or privacy notice have been updated. Please review and accept them again."
      )
    ).toBeTruthy();
    expect(screen.getByText("Please check the highlighted details and try again.")).toBeTruthy();
  });

  it("shows a connection error when the request fails", async () => {
    fetch.mockRejectedValue(new Error("network down"));
    render(<RegistrationForm />);
    enterValidDetails();

    submitForm();

    expect(
      await screen.findByText("We couldn't connect to the registration service. Please try again.")
    ).toBeTruthy();
  });
});
