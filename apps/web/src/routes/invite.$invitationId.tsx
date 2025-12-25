import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { buildInviteLoginUrl, isValidInviteId } from "@/lib/invitation-utils";

export const Route = createFileRoute("/invite/$invitationId")({
  component: InvitePage,
});

interface InvitationData {
  id: string;
  organizationId: string;
  role: string;
  status: string;
  expiresAt: Date;
}

/**
 * Maps API error messages to user-friendly error strings
 */
function getErrorFromApiMessage(message: string): string {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("not found") || lowerMessage.includes("invalid")) {
    return "This invitation link is invalid or has been revoked.";
  }
  if (lowerMessage.includes("expired")) {
    return "This invitation has expired. Please request a new invitation link.";
  }
  return "Could not load invitation. Please try again.";
}

/**
 * Maps invitation status to user-friendly error strings
 */
function getErrorFromStatus(status: string): string | null {
  const statusErrors: Record<string, string> = {
    accepted: "This invitation has already been used.",
    rejected: "This invitation has been declined.",
    canceled: "This invitation has been canceled.",
  };
  return statusErrors[status] ?? "This invitation is no longer valid.";
}

/**
 * Validates invitation data and returns an error string if invalid
 */
function validateInvitationData(data: {
  status: string;
  expiresAt: Date;
}): string | null {
  if (data.status !== "pending") {
    return getErrorFromStatus(data.status);
  }
  if (new Date(data.expiresAt) < new Date()) {
    return "This invitation has expired. Please request a new invitation link.";
  }
  return null;
}

function InvitePage() {
  const { invitationId } = Route.useParams();
  const navigate = useNavigate();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Validate invitation ID format
  useEffect(() => {
    if (!isValidInviteId(invitationId)) {
      setError("Invalid invitation link");
      setIsLoading(false);
      return;
    }

    // Fetch invitation details
    const fetchInvitation = async () => {
      try {
        const result = await authClient.organization.getInvitation({
          query: { id: invitationId },
        });

        if (result.error) {
          setError(
            getErrorFromApiMessage(result.error.message ?? "unknown error")
          );
          return;
        }

        if (!result.data) {
          setError("Invitation not found.");
          return;
        }

        const validationError = validateInvitationData(result.data);
        if (validationError) {
          setError(validationError);
          return;
        }

        setInvitation({
          id: result.data.id,
          organizationId: result.data.organizationId,
          role: result.data.role ?? "member",
          status: result.data.status,
          expiresAt: result.data.expiresAt,
        });
      } catch {
        setError("Could not load invitation. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitation();
  }, [invitationId]);

  // Handle accepting the invitation (for logged-in users)
  const handleAcceptInvitation = async () => {
    if (!invitation) {
      return;
    }

    setIsAccepting(true);
    setAcceptError(null);

    try {
      const result = await authClient.organization.acceptInvitation({
        invitationId: invitation.id,
      });

      if (result.error) {
        const errorMessage = result.error.message?.toLowerCase() ?? "";

        if (errorMessage.includes("already a member")) {
          // Already a member, just redirect to dashboard
          navigate({ to: "/dashboard" });
          return;
        }

        setAcceptError(result.error.message ?? "Could not accept invitation.");
        return;
      }

      // Success! Navigate to the dashboard (it will redirect to the org)
      navigate({ to: "/dashboard" });
    } catch {
      setAcceptError("Could not accept invitation. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  // Handle redirect to login with invitation context
  const handleLoginRedirect = () => {
    const loginUrl = buildInviteLoginUrl(invitationId);
    navigate({ to: loginUrl });
  };

  // Show loading state
  if (isLoading || sessionPending) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button render={<Link to="/login" />} variant="outline">
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show invitation card
  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            You've been invited to join an organization as a {invitation?.role}.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {acceptError && (
            <div className="mb-4 flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {acceptError}
            </div>
          )}

          {session?.user ? (
            <div className="space-y-3">
              <p className="text-center text-muted-foreground text-sm">
                Signed in as{" "}
                <span className="font-medium text-foreground">
                  {session.user.email}
                </span>
              </p>
              <Button
                className="w-full"
                disabled={isAccepting}
                onClick={handleAcceptInvitation}
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </Button>
              <p className="text-center text-muted-foreground text-xs">
                Want to use a different account?{" "}
                <button
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={handleLoginRedirect}
                  type="button"
                >
                  Sign in with another account
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-muted-foreground text-sm">
                Sign in or create an account to join this organization.
              </p>
              <Button className="w-full" onClick={handleLoginRedirect}>
                Continue
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
