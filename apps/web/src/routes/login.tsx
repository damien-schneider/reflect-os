import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { clientEnv } from "@/env/client";
import { authClient } from "@/lib/auth-client";
import { getSignUpErrorMessage } from "@/lib/auth-errors";
import { isValidInviteId } from "@/lib/invitation-utils";
import { redirectIfAuthenticated } from "@/lib/route-guards";

type LoginSearchParams = {
  inviteId?: string;
  orgName?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearchParams => ({
    inviteId: typeof search.inviteId === "string" ? search.inviteId : undefined,
    orgName: typeof search.orgName === "string" ? search.orgName : undefined,
  }),
  beforeLoad: async ({ search }) => {
    // Don't redirect if user has an invitation to process
    if (search.inviteId && isValidInviteId(search.inviteId)) {
      return;
    }
    await redirectIfAuthenticated({
      to: "/dashboard",
    });
  },
  pendingComponent: () => (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
  component: Login,
});

function getAuthSubtitle(isSignUp: boolean): string {
  return isSignUp
    ? "Enter your details to get started"
    : "Enter your credentials to continue";
}

function Login() {
  const search = useSearch({ from: "/login" });
  const inviteId = search.inviteId;
  const orgName = search.orgName;
  const hasInvite = inviteId && isValidInviteId(inviteId);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const requiresEmailVerification =
    clientEnv.VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION;

  /**
   * Accept invitation after successful auth.
   * Returns true if successful or already a member, false on error.
   */
  const acceptInvitationAfterAuth = async (): Promise<boolean> => {
    if (!inviteId) {
      return false;
    }

    try {
      // Accept the invitation
      const acceptResult = await authClient.organization.acceptInvitation({
        invitationId: inviteId,
      });

      if (acceptResult.error) {
        const errorMsg = acceptResult.error.message?.toLowerCase() ?? "";
        // If already a member, that's fine - continue to dashboard
        if (errorMsg.includes("already a member")) {
          return true;
        }
        console.error("Could not accept invitation:", acceptResult.error);
        return false;
      }

      return true;
    } catch (err) {
      console.error("Error accepting invitation:", err);
      return false;
    }
  };

  /**
   * Navigate after successful auth.
   * If there's an invitation, try to accept it first.
   */
  const navigateAfterAuth = async () => {
    if (hasInvite) {
      await acceptInvitationAfterAuth();
    }
    // Always go to dashboard, it will redirect to the right org
    navigate({ to: "/dashboard" });
  };

  const validateForm = () => {
    if (!email.trim()) {
      setError("Enter your email address");
      return false;
    }
    if (!password.trim()) {
      setError("Enter your password");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (isSignUp && !name.trim()) {
      setError("Enter your name");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    if (isSignUp) {
      await authClient.signUp.email(
        {
          email,
          password,
          name,
        },
        {
          onSuccess: async () => {
            const successMessage = requiresEmailVerification
              ? "Account created! Check your email to verify."
              : "Account created! Redirecting...";
            setSuccess(successMessage);
            if (requiresEmailVerification) {
              setIsLoading(false);
              navigate({ to: "/check-email", search: { email } });
              return;
            }

            try {
              await authClient.signIn.email(
                {
                  email,
                  password,
                },
                {
                  onSuccess: async () => {
                    await navigateAfterAuth();
                  },
                  onError: (ctx) => {
                    setError(
                      ctx.error.message ||
                        "Signed up but could not sign in automatically."
                    );
                  },
                }
              );
            } finally {
              setIsLoading(false);
            }
          },
          onError: (ctx) => {
            console.error("Sign up error:", ctx.error);
            setError(getSignUpErrorMessage(ctx.error));
            setIsLoading(false);
          },
        }
      );
    } else {
      await authClient.signIn.email(
        {
          email,
          password,
        },
        {
          onSuccess: async () => {
            setSuccess("Signed in! Redirecting...");
            await navigateAfterAuth();
          },
          onError: (ctx) => {
            const errorMsg = ctx.error.message?.toLowerCase() ?? "";

            // Handle email not verified error
            // Better Auth returns "Email not verified" message or status 403
            const isEmailNotVerified =
              ctx.error.status === 403 ||
              errorMsg.includes("not verified") ||
              errorMsg.includes("verify your email") ||
              errorMsg === "email not verified";

            if (isEmailNotVerified) {
              setIsLoading(false);
              navigate({
                to: "/check-email",
                search: { email },
              });
              return;
            }

            setError(
              ctx.error.message ||
                "Invalid email or password. Check your credentials."
            );
            setIsLoading(false);
          },
        }
      );
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Invitation banner */}
        {hasInvite && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <UserPlus className="h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm">
              {orgName ? (
                <>
                  You've been invited to join{" "}
                  <span className="font-semibold">{orgName}</span>
                </>
              ) : (
                "You've been invited to join an organization"
              )}
            </p>
          </div>
        )}

        <div className="space-y-2 text-center">
          <h1 className="font-semibold text-2xl">
            {isSignUp ? "Create Account" : "Sign In"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {hasInvite
              ? "Sign in or create an account to accept your invitation"
              : getAuthSubtitle(isSignUp)}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Inline error - actionable message */}
          {error && (
            <div className="flex items-start gap-2 text-destructive text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Subtle success feedback */}
          {success && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>{success}</span>
            </div>
          )}

          {isSignUp && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                autoComplete="name"
                disabled={isLoading}
                id="name"
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) {
                    setError(null);
                  }
                }}
                placeholder="Your name"
                type="text"
                value={name}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              autoComplete="email"
              disabled={isLoading}
              id="email"
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) {
                  setError(null);
                }
              }}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              autoComplete={isSignUp ? "new-password" : "current-password"}
              disabled={isLoading}
              id="password"
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) {
                  setError(null);
                }
              }}
              placeholder="At least 6 characters"
              type="password"
              value={password}
            />
          </div>

          <Button className="w-full" disabled={isLoading} type="submit">
            {(() => {
              if (isLoading) {
                return (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isSignUp ? "Creating..." : "Signing in..."}
                  </>
                );
              }
              if (isSignUp) {
                return "Create Account";
              }
              return "Sign In";
            })()}
          </Button>
        </form>

        <div className="text-center">
          <Button
            className="text-sm"
            disabled={isLoading}
            onClick={toggleMode}
            variant="link"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Need an account? Sign up"}
          </Button>
        </div>
      </div>
    </div>
  );
}
