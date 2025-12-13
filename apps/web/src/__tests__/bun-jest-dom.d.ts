declare module "bun:test" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: interface merging is required for module augmentation.
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
