import { Button } from "@repo/ui/components/button";
import { Heading } from "@repo/ui/components/typography";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

export default function Pricing() {
  return (
    <section className="bg-background py-24" id="pricing">
      <div className="mx-auto max-w-7xl px-4 text-left sm:px-6 lg:px-8">
        <Heading as="h2" className="mb-20" variant="h1">
          Simple pricing for teams of all sizes.
        </Heading>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Starter */}
          <div className="flex flex-col rounded-xl border border-transparent bg-secondary p-8 transition-colors hover:border-border">
            <h3 className="mb-2 font-medium text-foreground text-xl">
              Starter
            </h3>
            <div className="mb-2 flex items-baseline gap-1">
              <span className="font-semibold text-2xl text-foreground">$0</span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            <p className="mb-8 min-h-[40px] text-muted-foreground text-sm">
              Perfect for open source projects and small startups.
            </p>

            <ul className="mb-8 flex-1 space-y-4">
              {[
                "Unlimited feedback posts",
                "Public roadmap",
                "1 Admin seat",
                "Changelog",
                "Community support",
              ].map((item) => (
                <li
                  className="flex items-start gap-3 text-foreground text-sm"
                  key={item}
                >
                  <Check
                    className="mt-0.5 flex-shrink-0 text-foreground"
                    size={16}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Link to="/login">
              <Button
                className="w-full rounded-full"
                size="default"
                variant="outline"
              >
                Get Started
              </Button>
            </Link>
          </div>

          {/* Growth */}
          <div className="relative flex flex-col rounded-xl bg-primary p-8 text-primary-foreground shadow-xl">
            <div className="absolute top-8 right-8 rounded bg-primary-foreground/20 px-2 py-1 font-semibold text-primary-foreground text-xs">
              Most popular
            </div>
            <h3 className="mb-2 font-medium text-xl">Growth</h3>
            <div className="mb-2 flex items-baseline gap-1">
              <span className="font-semibold text-2xl">$29</span>
              <span className="text-primary-foreground/70">/mo</span>
            </div>
            <p className="mb-8 min-h-[40px] text-primary-foreground/70 text-sm">
              For growing teams needing privacy and integrations.
            </p>

            <ul className="mb-8 flex-1 space-y-4">
              {[
                "Everything in Starter",
                "Private boards",
                "5 Admin seats",
                "Slack & Discord integration",
                "Custom domain",
                "Priority support",
              ].map((item) => (
                <li
                  className="flex items-start gap-3 text-primary-foreground/90 text-sm"
                  key={item}
                >
                  <Check
                    className="mt-0.5 flex-shrink-0 text-primary-foreground"
                    size={16}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Link to="/login">
              <Button
                className="w-full rounded-full"
                size="default"
                variant="secondary"
              >
                Start Free Trial
              </Button>
            </Link>
          </div>

          {/* Business */}
          <div className="flex flex-col rounded-xl border border-transparent bg-secondary p-8 transition-colors hover:border-border">
            <h3 className="mb-2 font-medium text-foreground text-xl">
              Business
            </h3>
            <div className="mb-2 flex items-baseline gap-1">
              <span className="font-semibold text-2xl text-foreground">
                $99
              </span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            <p className="mb-8 min-h-[40px] text-muted-foreground text-sm">
              Advanced control for larger organizations.
            </p>

            <ul className="mb-8 flex-1 space-y-4">
              {[
                "Everything in Growth",
                "Unlimited seats",
                "SSO (SAML)",
                "Remove Reflect branding",
                "API access",
                "Dedicated success manager",
              ].map((item) => (
                <li
                  className="flex items-start gap-3 text-foreground text-sm"
                  key={item}
                >
                  <Check
                    className="mt-0.5 flex-shrink-0 text-foreground"
                    size={16}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Link to="/login">
              <Button
                className="w-full rounded-full"
                size="default"
                variant="outline"
              >
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
