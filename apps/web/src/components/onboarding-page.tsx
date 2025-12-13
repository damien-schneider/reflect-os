import { Building2 } from "lucide-react";
import { OnboardingForm } from "@/components/onboarding-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOnboardingForm } from "@/hooks/use-onboarding-form";

type OnboardingPageProps = {
  userName: string | null;
  onOrganizationCreated: (slug: string) => void;
};

/**
 * Generates a default organization name from the user's name
 */
function getDefaultOrgName(userName: string | null): string {
  if (!userName || userName.trim() === "") {
    return "My Organization";
  }
  return `${userName}'s Workspace`;
}

export function OnboardingPage({
  userName,
  onOrganizationCreated,
}: OnboardingPageProps) {
  const defaultName = getDefaultOrgName(userName);
  const form = useOnboardingForm(defaultName, onOrganizationCreated);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Hero Icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>

          <CardTitle className="text-2xl">Create your organization</CardTitle>
          <CardDescription className="text-base">
            Organizations help you manage feedback and roadmaps for your
            projects. Create your first one to get started.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <OnboardingForm form={form} />
        </CardContent>
      </Card>
    </div>
  );
}
