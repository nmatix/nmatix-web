import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProductPage, { generateMetadata, generateStaticParams } from "./page";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe("product pages", () => {
  it("statically generates every product slug", () => {
    expect(generateStaticParams()).toEqual([
      { slug: "interior-quote-generator" },
      { slug: "tender-flow" },
    ]);
  });

  it("generates product-specific metadata", async () => {
    await expect(
      generateMetadata({ params: Promise.resolve({ slug: "interior-quote-generator" }) })
    ).resolves.toEqual({
      title: "Interior Quote Generator | nMATIX Technologies",
      description: "Explore a platform for creating and managing interior project estimates.",
    });
  });

  it.each([
    ["interior-quote-generator", "Interior Quote Generator", "Available"],
    ["tender-flow", "Tender Flow", "Coming soon"],
  ])("renders %s with its CTA", async (slug, name, status) => {
    const page = await ProductPage({ params: Promise.resolve({ slug }) });
    render(page);

    expect(screen.getByRole("heading", { name })).toBeTruthy();
    expect(screen.getByText(status)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign-up" }).getAttribute("href")).toBe("/signup");
  });
});
