import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PrivacyPage, { metadata as privacyMetadata } from "../app/privacy/page";
import TermsPage, { metadata as termsMetadata } from "../app/terms/page";
import { PRIVACY_VERSION, TERMS_VERSION } from "../data/legal";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Legal placeholder pages", () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    ["Terms of Service", TermsPage, TERMS_VERSION, termsMetadata],
    ["Privacy Notice", PrivacyPage, PRIVACY_VERSION, privacyMetadata],
  ])("%s page shows its title, version and a contact link", (title, Page, version, metadata) => {
    render(<Page />);

    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    expect(screen.getByText(`Version ${version}`)).toBeTruthy();
    expect(screen.getByRole("link", { name: "contact us" }).getAttribute("href")).toBe("/contact");
    expect(metadata.robots).toEqual({ index: false });
  });
});
