import { afterEach, describe, expect, it, mock, vi } from "bun:test";
import { cleanup } from "@testing-library/react";
import { render, screen } from "./test-utils";

const mockCreate = vi.fn();

// Define regex at top level for performance
const ORGANIZATIONS_HELP_REGEX = /organizations help you manage feedback/i;

// Mock the authClient
mock.module("@/lib/auth-client", () => ({
  authClient: {
    organization: {
      create: mockCreate,
    },
  },
}));

const { OnboardingPage } = await import("@/components/onboarding-page");

afterEach(() => {
  cleanup();
});

describe("OnboardingPage", () => {
  it("should render welcome heading", () => {
    render(<OnboardingPage onOrganizationCreated={vi.fn()} userName="John" />);

    expect(screen.getByText("Create your organization")).toBeInTheDocument();
  });

  it("should render description text", () => {
    render(<OnboardingPage onOrganizationCreated={vi.fn()} userName="John" />);

    expect(screen.getByText(ORGANIZATIONS_HELP_REGEX)).toBeInTheDocument();
  });

  it("should prefill name with user's name", () => {
    render(<OnboardingPage onOrganizationCreated={vi.fn()} userName="John" />);

    expect(screen.getByLabelText("Organization name")).toHaveValue(
      "John's Workspace"
    );
  });

  it("should use generic default when userName is null", () => {
    render(<OnboardingPage onOrganizationCreated={vi.fn()} userName={null} />);

    expect(screen.getByLabelText("Organization name")).toHaveValue(
      "My Organization"
    );
  });

  it("should use generic default when userName is empty string", () => {
    render(<OnboardingPage onOrganizationCreated={vi.fn()} userName="" />);

    expect(screen.getByLabelText("Organization name")).toHaveValue(
      "My Organization"
    );
  });

  it("should render the Building2 icon", () => {
    render(<OnboardingPage onOrganizationCreated={vi.fn()} userName="John" />);

    // The icon should be rendered within a container
    const iconContainer = document.querySelector(".bg-primary\\/10");
    expect(iconContainer).toBeInTheDocument();
  });

  it("should render the form", () => {
    render(<OnboardingPage onOrganizationCreated={vi.fn()} userName="John" />);

    expect(screen.getByLabelText("Organization name")).toBeInTheDocument();
    expect(screen.getByLabelText("URL slug")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Organization" })
    ).toBeInTheDocument();
  });

  it("should generate correct slug from prefilled name", () => {
    render(<OnboardingPage onOrganizationCreated={vi.fn()} userName="John" />);

    expect(screen.getByLabelText("URL slug")).toHaveValue("johns-workspace");
  });
});
