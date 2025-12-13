import { afterEach, describe, expect, it, vi } from "bun:test";
import { cleanup, fireEvent } from "@testing-library/react";
import { OnboardingForm } from "@/components/onboarding-form";
import type { UseOnboardingFormReturn } from "@/hooks/use-onboarding-form";
import { render, screen } from "./test-utils";

afterEach(() => {
  cleanup();
});

function createMockForm(
  overrides: Partial<UseOnboardingFormReturn> = {}
): UseOnboardingFormReturn {
  return {
    name: "Test Organization",
    slug: "test-organization",
    setName: vi.fn(),
    setSlug: vi.fn(),
    handleSubmit: vi.fn(),
    isSubmitting: false,
    nameError: null,
    slugError: null,
    apiError: null,
    slugManuallyEdited: false,
    ...overrides,
  };
}

describe("OnboardingForm", () => {
  it("should render with prefilled values", () => {
    const form = createMockForm({
      name: "John's Workspace",
      slug: "johns-workspace",
    });

    render(<OnboardingForm form={form} />);

    expect(screen.getByLabelText("Organization name")).toHaveValue(
      "John's Workspace"
    );
    expect(screen.getByLabelText("URL slug")).toHaveValue("johns-workspace");
  });

  it("should display API error when present", () => {
    const form = createMockForm({
      apiError: "This URL is already taken.",
    });

    render(<OnboardingForm form={form} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("This URL is already taken.")).toBeInTheDocument();
  });

  it("should display name error when present", () => {
    const form = createMockForm({
      nameError: "Organization name is required",
    });

    render(<OnboardingForm form={form} />);

    expect(
      screen.getByText("Organization name is required")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Organization name")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });

  it("should display slug error when present", () => {
    const form = createMockForm({
      slugError: "Slug must be at least 3 characters",
    });

    render(<OnboardingForm form={form} />);

    expect(
      screen.getByText("Slug must be at least 3 characters")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("URL slug")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });

  it("should call setName when typing in name input", () => {
    const setName = vi.fn();
    const form = createMockForm({ setName, name: "" });

    render(<OnboardingForm form={form} />);

    const nameInput = screen.getByLabelText("Organization name");
    fireEvent.change(nameInput, { target: { value: "New Org" } });

    expect(setName).toHaveBeenCalledWith("New Org");
  });

  it("should call setSlug when typing in slug input", () => {
    const setSlug = vi.fn();
    const form = createMockForm({ setSlug, slug: "" });

    render(<OnboardingForm form={form} />);

    const slugInput = screen.getByLabelText("URL slug");
    fireEvent.change(slugInput, { target: { value: "new-org" } });

    expect(setSlug).toHaveBeenCalledWith("new-org");
  });

  it("should call handleSubmit when form is submitted", () => {
    const handleSubmit = vi.fn();
    const form = createMockForm({ handleSubmit });

    render(<OnboardingForm form={form} />);

    const submitButton = screen.getByRole("button", {
      name: "Create Organization",
    });
    fireEvent.click(submitButton);

    expect(handleSubmit).toHaveBeenCalled();
  });

  it("should show loading state when submitting", () => {
    const form = createMockForm({
      isSubmitting: true,
    });

    render(<OnboardingForm form={form} />);

    expect(screen.getByRole("button")).toHaveTextContent("Creating...");
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should disable inputs when submitting", () => {
    const form = createMockForm({
      isSubmitting: true,
    });

    render(<OnboardingForm form={form} />);

    expect(screen.getByLabelText("Organization name")).toBeDisabled();
    expect(screen.getByLabelText("URL slug")).toBeDisabled();
  });

  it("should show slug preview format", () => {
    const form = createMockForm();

    render(<OnboardingForm form={form} />);

    expect(screen.getByText("/dashboard/")).toBeInTheDocument();
  });

  it("should have proper accessibility attributes", () => {
    const form = createMockForm();

    render(<OnboardingForm form={form} />);

    const nameInput = screen.getByLabelText("Organization name");
    const slugInput = screen.getByLabelText("URL slug");

    expect(nameInput).toHaveAttribute("id", "org-name");
    expect(slugInput).toHaveAttribute("id", "org-slug");
  });

  it("should submit form on Enter key", () => {
    const handleSubmit = vi.fn();
    const form = createMockForm({ handleSubmit });

    render(<OnboardingForm form={form} />);

    const formElement = screen
      .getByLabelText("Organization name")
      .closest("form");
    if (formElement) {
      fireEvent.submit(formElement);
    }

    expect(handleSubmit).toHaveBeenCalled();
  });
});
