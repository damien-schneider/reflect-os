import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { AlertCircle, Loader2 } from "lucide-react";
import type { FocusEvent, FormEvent } from "react";
import type { UseOnboardingFormReturn } from "@/hooks/use-onboarding-form";

interface OnboardingFormProps {
  form: UseOnboardingFormReturn;
}

export function OnboardingForm({ form }: OnboardingFormProps) {
  const {
    name,
    slug,
    setName,
    setSlug,
    handleSubmit,
    isSubmitting,
    nameError,
    slugError,
    apiError,
  } = form;

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  const handleNameFocus = (e: FocusEvent<HTMLInputElement>) => {
    // Select all text on focus for easy replacement
    e.target.select();
  };

  return (
    <form className="space-y-6" onSubmit={handleFormSubmit}>
      {/* API Error Alert */}
      {apiError && (
        <Alert aria-live="polite" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      {/* Organization Name Input */}
      <div className="space-y-2">
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          aria-describedby={nameError ? "name-error" : undefined}
          aria-invalid={nameError ? "true" : undefined}
          autoFocus
          disabled={isSubmitting}
          id="org-name"
          onChange={(e) => setName(e.target.value)}
          onFocus={handleNameFocus}
          placeholder="My Organization"
          type="text"
          value={name}
        />
        {nameError && (
          <p
            aria-live="polite"
            className="text-destructive text-sm"
            id="name-error"
          >
            {nameError}
          </p>
        )}
      </div>

      {/* URL Slug Input */}
      <div className="space-y-2">
        <Label htmlFor="org-slug">URL slug</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">/dashboard/</span>
          <Input
            aria-describedby={slugError ? "slug-error" : undefined}
            aria-invalid={slugError ? "true" : undefined}
            className="flex-1"
            disabled={isSubmitting}
            id="org-slug"
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="my-organization"
            type="text"
            value={slug}
          />
        </div>
        {slugError && (
          <p
            aria-live="polite"
            className="text-destructive text-sm"
            id="slug-error"
          >
            {slugError}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        className="w-full"
        disabled={isSubmitting}
        size="lg"
        type="submit"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          "Create Organization"
        )}
      </Button>
    </form>
  );
}
