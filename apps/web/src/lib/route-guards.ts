import { redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export async function requireAuthenticated(): Promise<void> {
  const sessionResult = await authClient.getSession();

  if (!sessionResult?.data?.user) {
    throw redirect({
      to: "/login",
      replace: true,
    });
  }
}

interface RedirectIfAuthenticatedOptions {
  to: string;
}

export async function redirectIfAuthenticated({
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
