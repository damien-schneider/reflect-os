import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

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
            setSuccess("Account created! Redirecting...");
            setTimeout(() => {
              navigate({ to: "/dashboard" });
            }, 1000);
          },
          onError: (ctx) => {
            console.error("Sign up error:", ctx.error);
            setError(ctx.error.message || "Could not create account. Try a different email.");
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
            setError(ctx.error.message || "Invalid email or password. Check your credentials.");
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
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">
            {isSignUp ? "Create Account" : "Sign In"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp
              ? "Enter your details to get started"
              : "Enter your credentials to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Inline error - actionable message */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Subtle success feedback */}
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>{success}</span>
            </div>
          )}

          {isSignUp && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isLoading}
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              disabled={isLoading}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isSignUp ? "Creating..." : "Signing in..."}
              </>
            ) : (
              <>{isSignUp ? "Create Account" : "Sign In"}</>
            )}
          </Button>
        </form>

        <div className="text-center">
          <Button variant="link" onClick={toggleMode} disabled={isLoading} className="text-sm">
            {isSignUp
              ? "Already have an account? Sign in"
              : "Need an account? Sign up"}
          </Button>
        </div>
      </div>
    </div>
  );
}
