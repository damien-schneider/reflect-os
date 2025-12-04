import type * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = React.HTMLAttributes<HTMLDivElement> & {
  label?: string;
  error?: string | string[];
  description?: string;
  required?: boolean;
  children: React.ReactNode;
};

function Field({
  label,
  error,
  description,
  required,
  children,
  className,
  ...props
}: FieldProps) {
  const errorMessage = Array.isArray(error) ? error[0] : error;

  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      {label && (
        <Label>
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}
      {children}
      {description && !errorMessage && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      {errorMessage && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}
    </div>
  );
}

export { Field, type FieldProps };
