import { cn } from "@repo/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { type ElementType, forwardRef } from "react";

const headingVariants = cva("tracking-tight", {
  variants: {
    variant: {
      h1: "max-w-[64rem] text-balance font-display text-[3rem] leading-[1.1] [font-variation-settings:var(--font-display--font-variation-settings)] md:text-[5rem]",
      h2: "text-pretty font-display text-[2rem] leading-[2.5rem] [font-variation-settings:var(--font-display--font-variation-settings)]",
      h3: "font-semibold text-2xl leading-tight",
      h4: "font-semibold text-xl leading-tight",
      h5: "font-semibold text-lg leading-tight",
      h6: "font-semibold text-base leading-tight",
    },
    textColor: {
      default: "text-foreground",
      olive: "text-[var(--olive-950)] dark:text-[var(--olive-100)]",
      muted: "text-muted-foreground",
      primary: "text-primary",
      "primary-foreground": "text-primary-foreground",
    },
  },
  defaultVariants: {
    variant: "h1",
    textColor: "default",
  },
});

const textVariants = cva("leading-relaxed", {
  variants: {
    size: {
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl",
      "2xl": "text-2xl",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
    textColor: {
      default: "text-foreground",
      olive: "text-[var(--olive-950)] dark:text-[var(--olive-100)]",
      muted: "text-muted-foreground",
      primary: "text-primary",
      "primary-foreground": "text-primary-foreground",
    },
  },
  defaultVariants: {
    size: "base",
    weight: "normal",
    textColor: "default",
  },
});

export interface HeadingProps
  extends Omit<React.HTMLAttributes<HTMLHeadingElement>, "color">,
    VariantProps<typeof headingVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export interface TextProps
  extends Omit<React.HTMLAttributes<HTMLParagraphElement>, "color">,
    VariantProps<typeof textVariants> {
  as?: "p" | "span" | "div";
}

const variantToElement: Record<string, ElementType> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
};

const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, variant, textColor, as, ...props }, ref) => {
    const Component: ElementType =
      as ?? variantToElement[variant ?? "h1"] ?? "h6";

    return (
      <Component
        className={cn(headingVariants({ variant, textColor, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Heading.displayName = "Heading";

const Text = forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, size, weight, textColor, as = "p", ...props }, ref) => {
    const Component: ElementType = as;

    return (
      <Component
        className={cn(textVariants({ size, weight, textColor, className }))}
        ref={ref as React.Ref<HTMLParagraphElement>}
        {...props}
      />
    );
  }
);

Text.displayName = "Text";

export { Heading, Text, headingVariants, textVariants };
