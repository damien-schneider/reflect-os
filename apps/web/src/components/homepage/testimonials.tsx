import { Heading } from "@repo/ui/components/typography";

const reviews = [
  {
    id: "sarah-j",
    text: '"Reflect transformed how we handle feature requests. Instead of a chaotic Slack channel, we now have a clear, prioritized list of what our users actually want."',
    author: "Sarah J.",
    role: "Product Manager",
  },
  {
    id: "mike-t",
    text: '"The roadmap view is a game changer for our stakeholders. They can finally see what\'s being worked on without pestering the engineering team every day."',
    author: "Mike T.",
    role: "CTO",
  },
  {
    id: "elena-r",
    text: '"I love the changelog feature. Closing the loop with users when we ship a feature they asked for has significantly reduced our churn."',
    author: "Elena R.",
    role: "Founder",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-muted py-24">
      <div className="mx-auto max-w-7xl px-4 text-left sm:px-6 lg:px-8">
        <Heading as="h2" className="mb-6" variant="h1">
          Loved by product teams
        </Heading>
        <p className="mb-16 text-lg text-muted-foreground">
          Join thousands of teams building better products with Reflect.
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {reviews.map((review) => (
            <div
              className="flex min-h-[200px] flex-col justify-between rounded-xl border border-border bg-card p-8 shadow-sm"
              key={review.id}
            >
              <p className="mb-6 font-medium font-serif text-foreground text-lg italic leading-relaxed">
                {review.text}
              </p>
              <div>
                <p className="font-semibold text-foreground">{review.author}</p>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">
                  {review.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
