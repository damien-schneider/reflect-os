import { Button } from "@repo/ui/components/button";
import { Heading } from "@repo/ui/components/typography";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export default function CTA() {
  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-4 text-left sm:px-6 lg:px-8">
        <Heading as="h2" className="mb-6 max-w-3xl" variant="h1">
          Ready to build better products?
        </Heading>
        <p className="mb-10 max-w-2xl text-lg text-muted-foreground">
          Join hundreds of teams using Reflect to listen to their users and ship
          the right features, faster.
        </p>

        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <Link to="/login">
            <Button
              className="w-full rounded-full sm:w-auto"
              size="lg"
              variant="default"
            >
              Start free trial
            </Button>
          </Link>
          <Link
            className="flex items-center justify-center font-medium text-foreground text-sm transition-opacity hover:opacity-70 sm:justify-start"
            to="/login"
          >
            Read the docs <ChevronRight className="ml-1" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
