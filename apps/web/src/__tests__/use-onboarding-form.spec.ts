import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  vi,
} from "bun:test";
import { act, cleanup, renderHook } from "@testing-library/react";

const mockCreate = vi.fn();

mock.module("@/lib/auth-client", () => ({
  authClient: {
    organization: {
      create: mockCreate,
    },
  },
}));

const { generateSlug, useOnboardingForm } = await import(
  "@/hooks/use-onboarding-form"
);

afterEach(() => {
  cleanup();
});
describe("generateSlug", () => {
  it("should convert name to lowercase", () => {
    expect(generateSlug("My Organization")).toBe("my-organization");
  });

  it("should replace spaces with hyphens", () => {
    expect(generateSlug("my organization name")).toBe("my-organization-name");
  });

  it("should remove special characters", () => {
    expect(generateSlug("My Org! @#$%")).toBe("my-org");
  });

  it("should handle multiple consecutive spaces", () => {
    expect(generateSlug("my   organization")).toBe("my-organization");
  });

  it("should remove leading and trailing hyphens", () => {
    expect(generateSlug(" My Org ")).toBe("my-org");
  });

  it("should handle empty string", () => {
    expect(generateSlug("")).toBe("");
  });

  it("should preserve numbers", () => {
    expect(generateSlug("Org 123")).toBe("org-123");
  });
});

describe("useOnboardingForm", () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default name and generated slug", () => {
    const { result } = renderHook(() =>
      useOnboardingForm("John's Workspace", mockOnSuccess)
    );

    expect(result.current.name).toBe("John's Workspace");
    expect(result.current.slug).toBe("johns-workspace");
  });

  it("should auto-generate slug when name changes", () => {
    const { result } = renderHook(() =>
      useOnboardingForm("Initial", mockOnSuccess)
    );

    act(() => {
      result.current.setName("New Organization Name");
    });

    expect(result.current.name).toBe("New Organization Name");
    expect(result.current.slug).toBe("new-organization-name");
  });

  it("should stop auto-generating slug after manual edit", () => {
    const { result } = renderHook(() =>
      useOnboardingForm("Initial", mockOnSuccess)
    );

    act(() => {
      result.current.setSlug("custom-slug");
    });

    expect(result.current.slugManuallyEdited).toBe(true);

    act(() => {
      result.current.setName("New Name");
    });

    // Slug should remain custom
    expect(result.current.slug).toBe("custom-slug");
  });

  it("should validate empty name", async () => {
    const { result } = renderHook(() => useOnboardingForm("", mockOnSuccess));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.nameError).toBe("Organization name is required");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should validate empty slug", async () => {
    const { result } = renderHook(() =>
      useOnboardingForm("Test Name", mockOnSuccess)
    );

    act(() => {
      result.current.setSlug("");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.slugError).toBe("URL slug is required");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should validate slug minimum length", async () => {
    const { result } = renderHook(() =>
      useOnboardingForm("Test Name", mockOnSuccess)
    );

    act(() => {
      result.current.setSlug("ab");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.slugError).toBe("Slug must be at least 3 characters");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should validate slug characters", async () => {
    const { result } = renderHook(() =>
      useOnboardingForm("Test Name", mockOnSuccess)
    );

    act(() => {
      result.current.setSlug("Invalid Slug!");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.slugError).toBe(
      "Slug can only contain lowercase letters, numbers, and hyphens"
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should call authClient.organization.create on valid submit", async () => {
    mockCreate.mockResolvedValueOnce({ data: { id: "123" } } as never);

    const { result } = renderHook(() =>
      useOnboardingForm("Test Org", mockOnSuccess)
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreate).toHaveBeenCalledWith({
      name: "Test Org",
      slug: "test-org",
    });
  });

  it("should call onSuccess with slug on successful creation", async () => {
    mockCreate.mockResolvedValueOnce({ data: { id: "123" } } as never);

    const { result } = renderHook(() =>
      useOnboardingForm("Test Org", mockOnSuccess)
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockOnSuccess).toHaveBeenCalledWith("test-org");
  });

  it("should handle API error for duplicate slug", async () => {
    mockCreate.mockResolvedValueOnce({
      error: { message: "Slug already exists" },
    } as never);

    const { result } = renderHook(() =>
      useOnboardingForm("Test Org", mockOnSuccess)
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.apiError).toBe(
      "This URL is already taken. Please choose another."
    );
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("should handle generic API error", async () => {
    mockCreate.mockResolvedValueOnce({
      error: { message: "Server error" },
    } as never);

    const { result } = renderHook(() =>
      useOnboardingForm("Test Org", mockOnSuccess)
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.apiError).toBe("Server error");
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("should handle thrown error", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() =>
      useOnboardingForm("Test Org", mockOnSuccess)
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.apiError).toBe("Network error");
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("should set isSubmitting during API call", async () => {
    let resolveCreate: (value: unknown) => void;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    mockCreate.mockReturnValueOnce(createPromise as never);

    const { result } = renderHook(() =>
      useOnboardingForm("Test Org", mockOnSuccess)
    );

    expect(result.current.isSubmitting).toBe(false);

    // Start submit
    let submitPromise: Promise<void>;
    act(() => {
      submitPromise = result.current.handleSubmit();
    });

    // Should be submitting
    expect(result.current.isSubmitting).toBe(true);

    // Resolve the API call
    await act(async () => {
      resolveCreate?.({ data: { id: "123" } });
      await submitPromise;
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it("should clear errors when changing name", async () => {
    const { result } = renderHook(() => useOnboardingForm("", mockOnSuccess));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.nameError).toBe("Organization name is required");

    act(() => {
      result.current.setName("Valid Name");
    });

    expect(result.current.nameError).toBeNull();
  });

  it("should clear errors when changing slug", async () => {
    const { result } = renderHook(() =>
      useOnboardingForm("Test", mockOnSuccess)
    );

    act(() => {
      result.current.setSlug("ab");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.slugError).toBe("Slug must be at least 3 characters");

    act(() => {
      result.current.setSlug("valid-slug");
    });

    expect(result.current.slugError).toBeNull();
  });
});
