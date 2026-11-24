import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PrivacyPage, { metadata as privacyMetadata } from "../app/privacy/page";
import TermsPage, { metadata as termsMetadata } from "../app/terms/page";
import { LEGAL_EFFECTIVE_DATE, PRIVACY_VERSION, TERMS_VERSION } from "../data/legal";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Legal document pages", () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    ["Terms of Service", TermsPage, TERMS_VERSION, termsMetadata],
    ["Privacy Notice", PrivacyPage, PRIVACY_VERSION, privacyMetadata],
  ])("%s page shows its title, version, effective date and is indexable", (title, Page, version, metadata) => {
    render(<Page />);

    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    expect(screen.getByText(`Version ${version} · Effective ${LEGAL_EFFECTIVE_DATE}`)).toBeTruthy();
    expect(screen.getByRole("link", { name: "contact page" }).getAttribute("href")).toBe("/contact");
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(document.body.textContent).not.toContain("being finalised");
  });

  it("explains the registration data, purposes, hosting, retention and privacy rights", () => {
    render(<PrivacyPage />);

    for (const requiredText of ["phone number", "business name", "24 hours", "withdraw consent", "grievance"]) {
      expect(document.body.textContent.toLowerCase()).toContain(requiredText.toLowerCase());
    }
  });
});
