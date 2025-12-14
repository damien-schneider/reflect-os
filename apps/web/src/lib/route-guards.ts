import { redirect } from "@tanstack/react-router";
import type { AuthClient } from "@/lib/auth-client";

type RequireAuthenticatedOptions = {
  authClient: AuthClient;
};

export async function requireAuthenticated({
  authClient,
}: RequireAuthenticatedOptions): Promise<void> {
  const sessionResult = await authClient.getSession();

  if (!sessionResult?.data?.user) {
    throw redirect({
      to: "/login",
      replace: true,
    });
  }
}

type RedirectIfAuthenticatedOptions = {
  authClient: AuthClient;
  to: string;
};

export async function redirectIfAuthenticated({
  authClient,
  to,
}: RedirectIfAuthenticatedOptions): Promise<void> {
  const sessionResult = await authClient.getSession();

  if (sessionResult?.data?.user) {
    throw redirect({
      to,
      replace: true,
    });
  }
}
