import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContactForm from "./ContactForm";

function fillForm({ name = "John Doe", email = "john@example.com", message = "Hello there" } = {}) {
  fireEvent.change(screen.getByLabelText("Name:"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText("Email ID:"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Message:"), {
    target: { value: message },
  });
}

function submitForm() {
  fireEvent.submit(screen.getByRole("button", { name: "Submit" }).closest("form"));
}

describe("ContactForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders all form fields", () => {
    render(<ContactForm />);

    expect(screen.getByLabelText("Name:")).toBeTruthy();
    expect(screen.getByLabelText("Email ID:")).toBeTruthy();
    expect(screen.getByLabelText("Message:")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit" })).toBeTruthy();
  });

  it("shows loading state while submitting", async () => {
    let resolveRequest;
    fetch.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    render(<ContactForm />);
    fillForm();

    submitForm();

    expect(screen.getByRole("button", { name: "Submitting..." }).disabled).toBe(true);
    resolveRequest({ ok: true, json: async () => ({ id: "ref_123" }) });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Submitting..." })).toBeNull();
    });
  });

  it("submits form data with correct payload", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "ref_456" }),
    });
    render(<ContactForm />);
    fillForm({ name: "Jane Smith", email: "jane@test.com", message: "Test message" });

    submitForm();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "https://d2uch7qqykgttv.cloudfront.net/api/form/submit",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain_id: "0001",
            form_id: "0001",
            name: "Jane Smith",
            email: "jane@test.com",
            message: "Test message",
          }),
        })
      );
    });
  });

  it("shows success message with reference number on successful submission", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "ref_789" }),
    });
    render(<ContactForm />);
    fillForm();

    submitForm();

    expect(await screen.findByText(/Thank you for your message/)).toBeTruthy();
    expect(await screen.findByText(/Reference Number: #ref_789/)).toBeTruthy();
  });

  it("hides form after successful submission", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "ref_123" }),
    });
    render(<ContactForm />);
    fillForm();

    submitForm();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Submit" })).toBeNull();
    });
  });

  it("shows error message when submission fails", async () => {
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Server error" }),
    });
    render(<ContactForm />);
    fillForm();

    submitForm();

    expect(await screen.findByText(/There was an error submitting your message/)).toBeTruthy();
  });

  it("shows error when server response has no id", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    render(<ContactForm />);
    fillForm();

    submitForm();

    expect(await screen.findByText(/There was an error submitting your message/)).toBeTruthy();
  });

  it("shows error on network failure", async () => {
    fetch.mockRejectedValue(new Error("Network error"));
    render(<ContactForm />);
    fillForm();

    submitForm();

    expect(await screen.findByText(/There was an error submitting your message/)).toBeTruthy();
  });
});
