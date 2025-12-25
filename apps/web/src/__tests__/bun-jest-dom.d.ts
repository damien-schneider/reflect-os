declare module "bun:test" {
  interface Matchers<T = unknown> {
    toBeInTheDocument(): any;
    toHaveValue(value: unknown): any;
    toHaveAttribute(name: string, value?: string): any;
    toHaveTextContent(
      text: string | RegExp,
      options?: { normalizeWhitespace?: boolean }
    ): any;
    toBeDisabled(): any;
  }
}
