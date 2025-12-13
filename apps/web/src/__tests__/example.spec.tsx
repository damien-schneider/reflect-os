import { afterEach, describe, expect, it, vi } from "bun:test";
import { cleanup } from "@testing-library/react";
import { render, screen } from "./test-utils";

/**
 * Example component test
 * Tests should be co-located with components using .spec.tsx extension
 */

describe("Example Component Test", () => {
  afterEach(() => {
    cleanup();
  });

  it("should render a simple element", () => {
    render(<div>Test Content</div>);
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should handle user interactions", () => {
    const handleClick = vi.fn();
    const button = (
      <button onClick={handleClick} type="button">
        Click me
      </button>
    );
    render(button);

    const clickButton = screen.getByRole("button");
    clickButton.click();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
