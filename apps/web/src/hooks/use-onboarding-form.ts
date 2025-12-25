import { useState } from "react";
import { authClient } from "@/lib/auth-client";

// Define regex at top level for performance
const SLUG_REGEX = /^[a-z0-9-]+$/u;

/**
 * Generates a URL-friendly slug from a name
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters
 * - Removes consecutive and leading/trailing hyphens
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/gu, "-")
    .replace(/[^a-z0-9-]/gu, "")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "");
}

/**
 * Validates organization name
 * Returns error message or null if valid
 */
function validateName(name: string): string | null {
  if (!name.trim()) {
    return "Organization name is required";
  }
  return null;
}

/**
 * Validates organization slug
 * Returns error message or null if valid
 */
function validateSlug(slug: string): string | null {
  if (!slug.trim()) {
    return "URL slug is required";
  }
  if (slug.length < 3) {
    return "Slug must be at least 3 characters";
  }
  if (!SLUG_REGEX.test(slug)) {
    return "Slug can only contain lowercase letters, numbers, and hyphens";
  }
  return null;
}

export interface UseOnboardingFormReturn {
  // Form values
  name: string;
  slug: string;

  // Handlers
  setName: (value: string) => void;
  setSlug: (value: string) => void;
  handleSubmit: () => Promise<void>;

  // State
  isSubmitting: boolean;
  nameError: string | null;
  slugError: string | null;
  apiError: string | null;
  slugManuallyEdited: boolean;
}

export function useOnboardingForm(
  defaultName: string,
  onSuccess: (slug: string) => void
): UseOnboardingFormReturn {
  const [name, setNameValue] = useState(defaultName);
  const [slug, setSlugValue] = useState(generateSlug(defaultName));
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setName = (value: string) => {
    setNameValue(value);
    setNameError(null);
    setApiError(null);

    // Auto-generate slug if not manually edited
    if (!slugManuallyEdited) {
      setSlugValue(generateSlug(value));
      setSlugError(null);
    }
  };

  const setSlug = (value: string) => {
    setSlugManuallyEdited(true);
    setSlugValue(value);
    setSlugError(null);
    setApiError(null);
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setApiError(null);

    // Validate
    const nameValidationError = validateName(name);
    const slugValidationError = validateSlug(slug);

    setNameError(nameValidationError);
    setSlugError(slugValidationError);

    if (nameValidationError || slugValidationError) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authClient.organization.create({
        name: name.trim(),
        slug: slug.trim(),
      });

      if (result.error) {
        // Handle specific error cases
        const errorMessage =
          result.error.message || "Failed to create organization";
        if (
          errorMessage.toLowerCase().includes("slug") ||
          errorMessage.toLowerCase().includes("already")
        ) {
          setApiError("This URL is already taken. Please choose another.");
        } else {
          setApiError(errorMessage);
        }
        return;
      }

      // Success - call the callback with the slug
      onSuccess(slug.trim());
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create organization. Please try again.";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    name,
    slug,
    setName,
    setSlug,
    handleSubmit,
    isSubmitting,
    nameError,
    slugError,
    apiError,
    slugManuallyEdited,
  };
}
