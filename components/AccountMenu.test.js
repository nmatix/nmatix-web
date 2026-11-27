import { describe, expect, it } from "vitest";
import { initials } from "./AccountMenu";

describe("initials", () => {
  it("uses the first and last names", () => {
    expect(initials("Kiran Kabalavai")).toBe("KK");
    expect(initials("  ravi  kumar  sharma ")).toBe("RS");
  });
  it("falls back to one name, then the email", () => {
    expect(initials("Ravi")).toBe("RA");
    expect(initials("", "ops@nmatix.com")).toBe("O");
    expect(initials(null, null)).toBe("?");
  });
});
