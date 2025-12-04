import { useForm } from "@tanstack/react-form";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(1, "Enter a new password")
      .min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordChangeFormProps = {
  onSuccess: () => void;
  idPrefix?: string;
};

export function PasswordChangeForm({
  onSuccess,
  idPrefix = "",
}: PasswordChangeFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: passwordChangeSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        await authClient.changePassword(
          {
            currentPassword: value.currentPassword,
            newPassword: value.newPassword,
            revokeOtherSessions: true,
          },
          {
            onSuccess: () => {
              setSuccess(true);
              setTimeout(() => {
                onSuccess();
              }, 1500);
            },
            onError: (ctx) => {
              setSubmitError(
                ctx.error.message ||
                  "Could not change password. Check your current password."
              );
            },
          }
        );
      } catch {
        setSubmitError("Could not change password. Please try again.");
      }
    },
  });

  const isSubmitting = form.state.isSubmitting;

  if (success) {
    return (
      <div className="flex items-center gap-2 py-4 text-green-600 text-sm">
        <CheckCircle2 className="h-4 w-4" />
        <span>Password changed successfully</span>
      </div>
    );
  }

  // Type for validation errors from TanStack Form
  type ValidationError = string | { message?: string } | undefined;

  // Helper to extract error message from field errors
  const getFieldError = (errors: ValidationError[]): string | undefined => {
    if (errors.length === 0) {
      return;
    }
    return errors
      .map((err) => {
        if (typeof err === "string") {
          return err;
        }
        if (err && typeof err === "object" && "message" in err && err.message) {
          return err.message;
        }
        return "";
      })
      .filter(Boolean)
      .join(", ");
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      {submitError && <p className="text-destructive text-sm">{submitError}</p>}

      <form.Field name="currentPassword">
        {(field) => (
          <Field
            error={
              field.state.meta.isTouched
                ? getFieldError(field.state.meta.errors)
                : undefined
            }
            label="Current Password"
          >
            <Input
              autoComplete="current-password"
              disabled={isSubmitting}
              id={`${idPrefix}current-password`}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Enter current password"
              type="password"
              value={field.state.value}
            />
          </Field>
        )}
      </form.Field>

      <form.Field name="newPassword">
        {(field) => (
          <Field
            error={
              field.state.meta.isTouched
                ? getFieldError(field.state.meta.errors)
                : undefined
            }
            label="New Password"
          >
            <Input
              autoComplete="new-password"
              disabled={isSubmitting}
              id={`${idPrefix}new-password`}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="At least 6 characters"
              type="password"
              value={field.state.value}
            />
          </Field>
        )}
      </form.Field>

      <form.Field name="confirmPassword">
        {(field) => (
          <Field
            error={
              field.state.meta.isTouched
                ? getFieldError(field.state.meta.errors)
                : undefined
            }
            label="Confirm New Password"
          >
            <Input
              autoComplete="new-password"
              disabled={isSubmitting}
              id={`${idPrefix}confirm-password`}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Re-enter new password"
              type="password"
              value={field.state.value}
            />
          </Field>
        )}
      </form.Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Changing...
            </>
          ) : (
            "Change Password"
          )}
        </Button>
      </div>
    </form>
  );
}
