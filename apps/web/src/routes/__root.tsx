import {
  createRootRouteWithContext,
  type ErrorComponentProps,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { AuthDialogProvider } from "@/components/auth-dialog-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ZeroSetup } from "@/components/zero-setup";
import type { RouterAppContext } from "@/lib/router-context";

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootLayout,
  errorComponent: RootError,
});

function RootError({ error }: ErrorComponentProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg space-y-4 rounded-lg border bg-card p-6 text-card-foreground">
        <div className="space-y-1">
          <h1 className="font-semibold text-xl">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">
            An unexpected error occurred while rendering this page.
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs">
            {error instanceof Error ? error.message : String(error)}
          </pre>
        )}

        <div className="flex gap-2">
          <Link className="underline" to="/">
            Go home
          </Link>
          <button
            className="underline"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}

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
