"use client";

import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { clientEnv } from "@/env/client";
import { authClient } from "@/lib/auth-client";
import { getSignUpErrorMessage } from "@/lib/auth-errors";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const requiresEmailVerification =
    clientEnv.VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION;

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setError(null);
    setSuccess(null);
    setIsLoading(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
      setIsSignUp(false);
    }
    onOpenChange(newOpen);
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
              ? "Account created! Check your email."
              : "Account created! Redirecting...";
            setSuccess(successMessage);
            handleOpenChange(false);

            if (requiresEmailVerification) {
              setIsLoading(false);
              navigate({
                to: "/check-email",
                search: { email },
              });
              return;
            }

            try {
              await authClient.signIn.email(
                { email, password },
                {
                  onSuccess: () => {
                    navigate({ to: "/dashboard" });
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
          onSuccess: () => {
            setSuccess("Signed in!");
            setTimeout(() => {
              handleOpenChange(false);
            }, 500);
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

            console.log("[Auth] Sign-in error:", {
              status: ctx.error.status,
              message: ctx.error.message,
              isEmailNotVerified,
            });

            if (isEmailNotVerified) {
              setIsLoading(false);
              handleOpenChange(false);
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

  const getSubmitButtonText = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isSignUp ? "Creating..." : "Signing in..."}
        </>
      );
    }
    return isSignUp ? "Create Account" : "Sign In";
  };

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {isSignUp ? "Create Account" : "Sign In"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {isSignUp
              ? "Enter your details to get started"
              : "Enter your credentials to continue"}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
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
                <Label htmlFor="auth-name">Name</Label>
                <Input
                  autoComplete="name"
                  disabled={isLoading}
                  id="auth-name"
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
              <Label htmlFor="auth-email">Email</Label>
              <Input
                autoComplete="email"
                disabled={isLoading}
                id="auth-email"
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
              <Label htmlFor="auth-password">Password</Label>
              <Input
                autoComplete={isSignUp ? "new-password" : "current-password"}
                disabled={isLoading}
                id="auth-password"
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
              {getSubmitButtonText()}
            </Button>
          </form>

          <div className="pt-2 text-center">
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
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
