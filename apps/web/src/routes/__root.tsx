import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { AuthDialogProvider } from "../components/auth-dialog-provider";
import { ThemeProvider } from "../components/theme-provider";
import { ZeroSetup } from "../components/zero-setup";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ZeroSetup>
        <AuthDialogProvider>
          <div className="min-h-screen bg-background">
            <Outlet />
          </div>
          {process.env.NODE_ENV === "development" && (
            <TanStackRouterDevtools position="bottom-right" />
          )}
        </AuthDialogProvider>
      </ZeroSetup>
    </ThemeProvider>
  );
}
