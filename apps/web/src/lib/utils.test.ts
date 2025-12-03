import { describe, expect, test } from "bun:test";
import { cn } from "@/lib/utils";

describe("utils", () => {
  test("cn merges class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });
});
