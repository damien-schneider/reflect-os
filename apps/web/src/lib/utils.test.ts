import { describe, expect, test } from "bun:test";
import { cn } from "./utils";

describe("utils", () => {
  test("cn merges class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });
});
