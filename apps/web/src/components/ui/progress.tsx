import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

type ProgressProps = HTMLAttributes<HTMLDivElement> & {
  value?: number;
  max?: number;
  ref?: Ref<HTMLDivElement>;
};

function Progress({
  className,
  value = 0,
  max = 100,
  ref,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      ref={ref}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
}

export { Progress };
