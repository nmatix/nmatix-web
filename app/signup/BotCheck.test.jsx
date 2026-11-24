import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TURNSTILE_SCRIPT_URL, TURNSTILE_SITE_KEY } from "../../data/turnstile";
import { installTurnstile } from "../../vitest.setup";
import RegistrationForm from "./RegistrationForm";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function fillForm() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Example Person" } });
  fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "98765 43210" } });
  fireEvent.click(screen.getByRole("checkbox"));
}

function submit() {
  fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form"));
}

function respond(status, body) {
  fetch.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body });
}

function sentBody(call = 0) {
  return JSON.parse(fetch.mock.calls[call][1].body);
}

describe("Registration bot check (Cloudflare Turnstile)", () => {
  let onRegistered;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    onRegistered = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the widget with the site key and the register action", () => {
    render(<RegistrationForm onRegistered={onRegistered} />);

    expect(window.turnstile.render).toHaveBeenCalledTimes(1);
    const options = window.turnstile.render.mock.calls[0][1];
    expect(options.sitekey).toBe(TURNSTILE_SITE_KEY);
    expect(options.action).toBe("register");
  });

  it("sends the token with the registration", async () => {
    respond(201, { id: "usr_1" });
    render(<RegistrationForm onRegistered={onRegistered} />);
    fillForm();

    submit();

    await waitFor(() => expect(onRegistered).toHaveBeenCalled());
    expect(sentBody().turnstileToken).toBe("test-token-1");
  });

  it("waits for the check to finish before submitting", async () => {
    const turnstile = installTurnstile({ auto: false });
    respond(201, { id: "usr_1" });
    render(<RegistrationForm onRegistered={onRegistered} />);
    fillForm();

    submit();

    expect(screen.getByText("Please wait a moment for the security check to finish.")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();

    act(() => turnstile.solve());
    expect(screen.queryByText("Please wait a moment for the security check to finish.")).toBeNull();
    submit();
    await waitFor(() => expect(onRegistered).toHaveBeenCalled());
  });

  it("gets a fresh token after every submission (tokens are single use)", async () => {
    respond(409, {
      error: { code: "ALREADY_REGISTERED", fields: { email: "This email is already registered." } },
    });
    respond(201, { id: "usr_1" });
    render(<RegistrationForm onRegistered={onRegistered} />);
    fillForm();

    submit();
    await screen.findByText("This email is already registered.");
    expect(window.turnstile.reset).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "other@example.com" } });
    submit();

    await waitFor(() => expect(onRegistered).toHaveBeenCalled());
    expect(sentBody(0).turnstileToken).toBe("test-token-1");
    expect(sentBody(1).turnstileToken).toBe("test-token-2");
  });

  it("explains a failed check and keeps the details", async () => {
    respond(400, { error: { code: "BOT_CHECK_FAILED", message: "..." } });
    render(<RegistrationForm onRegistered={onRegistered} />);
    fillForm();

    submit();

    expect(
      await screen.findByText("The security check didn't pass. Please complete it and try again.")
    ).toBeTruthy();
    expect(screen.getByLabelText("Email").value).toBe("person@example.com");
    expect(onRegistered).not.toHaveBeenCalled();
  });

  it("shows the server's message when the check is temporarily unavailable", async () => {
    respond(503, {
      error: {
        code: "BOT_CHECK_UNAVAILABLE",
        message: "Registration is temporarily unavailable. Please try again in a few minutes.",
      },
    });
    render(<RegistrationForm onRegistered={onRegistered} />);
    fillForm();

    submit();

    expect(
      await screen.findByText(
        "Registration is temporarily unavailable. Please try again in a few minutes."
      )
    ).toBeTruthy();
  });

  it("still submits (without a token) if the widget cannot run, so the server decides", async () => {
    installTurnstile({ fail: true });
    respond(201, { id: "usr_1" });
    render(<RegistrationForm onRegistered={onRegistered} />);
    fillForm();

    submit();

    await waitFor(() => expect(onRegistered).toHaveBeenCalled());
    expect(sentBody()).not.toHaveProperty("turnstileToken");
  });

  it("loads Cloudflare's script once when it is not on the page yet", async () => {
    delete window.turnstile;
    render(<RegistrationForm onRegistered={onRegistered} />);
    render(<RegistrationForm onRegistered={onRegistered} />);

    const scripts = [...document.querySelectorAll("script")].filter(
      (s) => s.src === TURNSTILE_SCRIPT_URL
    );
    expect(scripts).toHaveLength(1);
    expect(scripts[0].async).toBe(true);
  });
});
