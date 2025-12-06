import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();

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

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setError("Enter your email address");
      return;
    }

    setIsResending(true);
    setError(null);

    const { error: resendError } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/dashboard",
    });

    setIsResending(false);

    if (resendError) {
      setError(resendError.message || "Failed to send verification email");
    } else {
      setSuccess("Verification email sent! Check your inbox.");
    }
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
          onSuccess: () => {
            setPendingVerification(true);
            setSuccess(
              "Account created! Check your email to verify your account."
            );
            setIsLoading(false);
          },
          onError: (ctx) => {
            console.error("Sign up error:", ctx.error);
            setError(
              ctx.error.message ||
                "Could not create account. Try a different email."
            );
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
          onSuccess: () => {
            setSuccess("Signed in! Redirecting...");
            setTimeout(() => {
              navigate({ to: "/dashboard" });
            }, 1000);
          },
          onError: (ctx) => {
            // Check if the error is due to unverified email
            if (ctx.error.status === 403) {
              setPendingVerification(true);
              setError("Please verify your email before signing in.");
              setIsLoading(false);
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
    setPendingVerification(false);
  };

  // Pending verification state
  if (pendingVerification) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Mail className="h-6 w-6" />
            </div>
            <h1 className="font-semibold text-2xl">Check your email</h1>
            <p className="text-muted-foreground text-sm">
              We've sent a verification link to <strong>{email}</strong>. Click
              the link in the email to verify your account.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-destructive text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-3">
            <Button
              className="w-full"
              disabled={isResending}
              onClick={handleResendVerification}
              variant="outline"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend verification email"
              )}
            </Button>

            <Button
              className="w-full"
              onClick={() => {
                setPendingVerification(false);
                setError(null);
                setSuccess(null);
              }}
              variant="ghost"
            >
              Back to {isSignUp ? "sign up" : "sign in"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-semibold text-2xl">
            {isSignUp ? "Create Account" : "Sign In"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isSignUp
              ? "Enter your details to get started"
              : "Enter your credentials to continue"}
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
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isSignUp ? "Creating..." : "Signing in..."}
              </>
            ) : isSignUp ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
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
