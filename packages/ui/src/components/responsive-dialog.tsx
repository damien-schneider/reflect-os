"use client";

import { createContext, type ReactNode, use } from "react";
import { useMediaQuery } from "../hooks/use-media-query";
import { cn } from "../lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";

type BaseProps = {
  children: ReactNode;
};

interface RootResponsiveDialogProps extends BaseProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface ResponsiveDialogProps extends BaseProps {
  className?: string;
  asChild?: true;
}

const ResponsiveDialogContext = createContext<{ isMobile: boolean }>({
  isMobile: false,
});

const useResponsiveDialogContext = () => {
  const context = use(ResponsiveDialogContext);
  if (!context) {
    throw new Error(
      "ResponsiveDialog components cannot be rendered outside the ResponsiveDialog Context"
    );
  }
  return context;
};

const ResponsiveDialog = ({
  children,
  ...props
}: RootResponsiveDialogProps) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const Component = isMobile ? Drawer : Dialog;

  return (
    <ResponsiveDialogContext value={{ isMobile }}>
      <Component {...props} {...(isMobile && { autoFocus: true })}>
        {children}
      </Component>
    </ResponsiveDialogContext>
  );
};

const ResponsiveDialogTrigger = ({
  className,
  children,
  ...props
}: ResponsiveDialogProps) => {
  const { isMobile } = useResponsiveDialogContext();
  const Component = isMobile ? DrawerTrigger : DialogTrigger;

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const ResponsiveDialogClose = ({
  className,
  children,
  ...props
}: ResponsiveDialogProps) => {
  const { isMobile } = useResponsiveDialogContext();
  const Component = isMobile ? DrawerClose : DialogClose;

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const ResponsiveDialogContent = ({
  className,
  children,
  ...props
}: ResponsiveDialogProps) => {
  const { isMobile } = useResponsiveDialogContext();
  const Component = isMobile ? DrawerContent : DialogContent;

  return (
    <Component className={cn("", className)} {...props}>
      {children}
    </Component>
  );
};

const ResponsiveDialogDescription = ({
  className,
  children,
  ...props
}: ResponsiveDialogProps) => {
  const { isMobile } = useResponsiveDialogContext();
  const Component = isMobile ? DrawerDescription : DialogDescription;

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const ResponsiveDialogHeader = ({
  className,
  children,
  ...props
}: ResponsiveDialogProps) => {
  const { isMobile } = useResponsiveDialogContext();
  const Component = isMobile ? DrawerHeader : DialogHeader;

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const ResponsiveDialogTitle = ({
  className,
  children,
  ...props
}: ResponsiveDialogProps) => {
  const { isMobile } = useResponsiveDialogContext();
  const Component = isMobile ? DrawerTitle : DialogTitle;

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const ResponsiveDialogBody = ({
  className,
  children,
  ...props
}: ResponsiveDialogProps) => (
  <div className={cn("px-4 md:px-2", className)} {...props}>
    {children}
  </div>
);

const ResponsiveDialogFooter = ({
  className,
  children,
  ...props
}: ResponsiveDialogProps) => {
  const { isMobile } = useResponsiveDialogContext();
  const Component = isMobile ? DrawerFooter : DialogFooter;

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
};
