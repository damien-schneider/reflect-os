import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("utils", () => {
  it("cn merges class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });
});
