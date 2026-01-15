import { afterEach } from "bun:test";
import { cleanup, type RenderOptions, render } from "@testing-library/react";
import type React from "react";
import type { ReactElement } from "react";

afterEach(() => {
  cleanup();
});

/**
 * Custom render function that wraps providers
 * Add providers like ThemeProvider, AuthProvider, etc. here
 */
function CustomRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
    // Add providers here:
    // return (
    //   <ThemeProvider>
    //     <AuthProvider>
    //       {children}
    //     </AuthProvider>
    //   </ThemeProvider>
    // );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

// Re-export commonly used utilities from testing-library
export { screen, waitFor, within } from "@testing-library/react";
export { CustomRender as render };
