import { cn } from "@repo/ui/lib/utils";
import { describe, expect, it } from "vitest";

describe("utils", () => {
  it("cn merges class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });
});
