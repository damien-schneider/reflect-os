"use client";

import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
} from "@repo/ui/components/dropdown-menu";
import { Separator } from "@repo/ui/components/separator";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
// biome-ignore lint/performance/noNamespaceImport: React namespace import is idiomatic for this component pattern
import * as React from "react";

// Toolbar root component - using native role="toolbar" for accessibility
export function Toolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("relative flex select-none items-center", className)}
      role="toolbar"
      {...props}
    />
  );
}

// Toolbar toggle group - using ToggleGroup from @repo/ui
export function ToolbarToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroup>) {
  return (
    <ToggleGroup className={cn("flex items-center", className)} {...props} />
  );
}

// Toolbar link component
export function ToolbarLink({
  className,
  ...props
}: React.ComponentProps<"a">) {
  return (
    <a
      className={cn("font-medium underline underline-offset-4", className)}
      {...props}
    />
  );
}

// Toolbar separator
export function ToolbarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      className={cn("mx-2 my-1 h-auto w-px shrink-0", className)}
      orientation="vertical"
      {...props}
    />
  );
}

// Toolbar button variants
const toolbarButtonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm outline-none transition-[color,box-shadow] hover:bg-muted hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-checked:bg-accent aria-checked:text-accent-foreground aria-pressed:bg-accent aria-pressed:text-accent-foreground aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-9 min-w-9 px-2",
        lg: "h-10 min-w-10 px-2.5",
        sm: "h-8 min-w-8 px-1.5",
      },
      variant: {
        default: "bg-transparent",
        outline:
          "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground",
      },
    },
  }
);

const dropdownArrowVariants = cva(
  cn(
    "inline-flex items-center justify-center rounded-r-md font-medium text-foreground text-sm transition-colors disabled:pointer-events-none disabled:opacity-50"
  ),
  {
    defaultVariants: {
      size: "sm",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-9 w-6",
        lg: "h-10 w-8",
        sm: "h-8 w-4",
      },
      variant: {
        default:
          "bg-transparent hover:bg-muted hover:text-muted-foreground aria-checked:bg-accent aria-checked:text-accent-foreground",
        outline:
          "border border-input border-l-0 bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
    },
  }
);

type ToolbarButtonProps = {
  isDropdown?: boolean;
  pressed?: boolean;
} & Omit<React.ComponentPropsWithoutRef<"button">, "value"> &
  VariantProps<typeof toolbarButtonVariants>;

export const ToolbarButton = withTooltip(function ToolbarButtonComponent({
  children,
  className,
  isDropdown,
  pressed,
  size = "sm",
  variant,
  ...props
}: ToolbarButtonProps) {
  return typeof pressed === "boolean" ? (
    <ToolbarToggleGroup
      disabled={props.disabled}
      value={pressed ? ["pressed"] : []}
    >
      <ToolbarToggleItem
        className={cn(
          toolbarButtonVariants({
            size,
            variant,
          }),
          isDropdown && "justify-between gap-1 pr-1",
          className
        )}
        value="pressed"
        {...props}
      >
        {isDropdown ? (
          <>
            <div className="flex flex-1 items-center gap-2 whitespace-nowrap">
              {children}
            </div>
            <div>
              <ChevronDown
                className="size-3.5 text-muted-foreground"
                data-icon
              />
            </div>
          </>
        ) : (
          children
        )}
      </ToolbarToggleItem>
    </ToolbarToggleGroup>
  ) : (
    <button
      className={cn(
        toolbarButtonVariants({
          size,
          variant,
        }),
        isDropdown && "pr-1",
        className
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
});

export function ToolbarSplitButton({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof ToolbarButton>) {
  return (
    <ToolbarButton
      className={cn("group flex gap-0 px-0 hover:bg-transparent", className)}
      {...props}
    />
  );
}

type ToolbarSplitButtonPrimaryProps = Omit<
  React.ComponentPropsWithoutRef<"span">,
  "value"
> &
  VariantProps<typeof toolbarButtonVariants>;

export function ToolbarSplitButtonPrimary({
  children,
  className,
  size = "sm",
  variant,
  ...props
}: ToolbarSplitButtonPrimaryProps) {
  return (
    <span
      className={cn(
        toolbarButtonVariants({
          size,
          variant,
        }),
        "rounded-r-none",
        "group-data-[pressed=true]:bg-accent group-data-[pressed=true]:text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function ToolbarSplitButtonSecondary({
  className,
  size,
  variant,
  ...props
}: React.ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof dropdownArrowVariants>) {
  return (
    <button
      className={cn(
        dropdownArrowVariants({
          size,
          variant,
        }),
        "group-data-[pressed=true]:bg-accent group-data-[pressed=true]:text-accent-foreground",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      type="button"
      {...props}
    >
      <ChevronDown className="size-3.5 text-muted-foreground" data-icon />
    </button>
  );
}

export function ToolbarToggleItem({
  className,
  size = "sm",
  variant,
  ...props
}: React.ComponentProps<typeof ToggleGroupItem> &
  VariantProps<typeof toolbarButtonVariants>) {
  return (
    <ToggleGroupItem
      className={cn(toolbarButtonVariants({ size, variant }), className)}
      {...props}
    />
  );
}

export function ToolbarGroup({
  children,
  className,
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "group/toolbar-group",
        "relative hidden has-[button]:flex",
        className
      )}
    >
      <div className="flex items-center">{children}</div>

      <div className="group-last/toolbar-group:hidden! mx-1.5 py-0.5">
        <Separator orientation="vertical" />
      </div>
    </div>
  );
}

type TooltipProps<T extends React.ElementType> = {
  tooltip?: React.ReactNode;
  tooltipContentProps?: Omit<
    React.ComponentPropsWithoutRef<typeof TooltipContent>,
    "children"
  >;
  tooltipProps?: Omit<
    React.ComponentPropsWithoutRef<typeof Tooltip>,
    "children"
  >;
  tooltipTriggerProps?: React.ComponentPropsWithoutRef<typeof TooltipTrigger>;
} & React.ComponentProps<T>;

function withTooltip<T extends React.ElementType>(Component: T) {
  return function ExtendComponent({
    tooltip,
    tooltipContentProps,
    tooltipProps,
    tooltipTriggerProps,
    ...props
  }: TooltipProps<T>) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
      setMounted(true);
    }, []);

    const component = <Component {...(props as React.ComponentProps<T>)} />;

    if (tooltip && mounted) {
      return (
        <Tooltip {...tooltipProps}>
          <TooltipTrigger {...tooltipTriggerProps}>{component}</TooltipTrigger>
          <TooltipContent {...tooltipContentProps}>{tooltip}</TooltipContent>
        </Tooltip>
      );
    }

    return component;
  };
}

export function ToolbarMenuGroup({
  children,
  className,
  label,
  ...props
}: React.ComponentProps<typeof DropdownMenuRadioGroup> & { label?: string }) {
  return (
    <>
      <DropdownMenuSeparator
        className={cn(
          "hidden",
          "mb-0 shrink-0 peer-has-[[role=menuitem]]/menu-group:block peer-has-[[role=menuitemradio]]/menu-group:block peer-has-[[role=option]]/menu-group:block"
        )}
      />

      <DropdownMenuRadioGroup
        {...props}
        className={cn(
          "hidden",
          "peer/menu-group group/menu-group my-1.5 has-[[role=menuitem]]:block has-[[role=menuitemradio]]:block has-[[role=option]]:block",
          className
        )}
      >
        {label && (
          <DropdownMenuLabel className="select-none font-semibold text-muted-foreground text-xs">
            {label}
          </DropdownMenuLabel>
        )}
        {children}
      </DropdownMenuRadioGroup>
    </>
  );
}
