import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MailCheck,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

const RESEND_COOLDOWN_SECONDS = 60;
const isDevelopment = import.meta.env.DEV;

export const Route = createFileRoute("/check-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  component: CheckEmail,
});

function CheckEmail() {
  const { email } = Route.useSearch();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Handle cooldown countdown
  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const handleResendEmail = useCallback(async () => {
    if (!email || cooldownRemaining > 0 || isResending) {
      return;
    }

    setIsResending(true);
    setResendSuccess(false);
    setResendError(null);

    const result = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/dashboard",
    });

    if (result.error) {
      setResendError(result.error.message || "Failed to resend email");
    } else {
      setResendSuccess(true);
      setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
    }

    setIsResending(false);
  }, [email, cooldownRemaining, isResending]);

  const isResendDisabled = !email || cooldownRemaining > 0 || isResending;

  const getResendButtonText = () => {
    if (isResending) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      );
    }
    if (cooldownRemaining > 0) {
      return `Resend in ${cooldownRemaining}s`;
    }
    return (
      <>
        <RefreshCw className="mr-2 h-4 w-4" />
        Resend verification email
      </>
    );
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>
                We sent a verification link to your inbox. Click it to finish
                setting up your account.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {email ? (
            <p className="text-muted-foreground text-sm">
              Email sent to{" "}
              <span className="font-medium text-foreground">{email}</span>. If
              you don't see it, check spam or promotions.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              If you don't see the message, check spam or promotions. You can
              also request a new link from the login page.
            </p>
          )}

          {resendSuccess && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Verification email sent successfully!</span>
            </div>
          )}

          {resendError && (
            <p className="text-destructive text-sm">{resendError}</p>
          )}

          {isDevelopment && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Development Mode</p>
                <p className="text-amber-700 dark:text-amber-300">
                  Emails may not be sent in development unless you use your
                  verified Resend email address. You can manually verify users
                  in the database.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="default">
              <Link to="/">Back to home</Link>
            </Button>
            {email && (
              <Button
                disabled={isResendDisabled}
                onClick={handleResendEmail}
                variant="outline"
              >
                {getResendButtonText()}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
