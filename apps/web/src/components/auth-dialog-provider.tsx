"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { AuthDialog } from "./auth-dialog";

// Context for managing auth dialog state globally
type AuthDialogContextType = {
  isOpen: boolean;
  openAuthDialog: () => void;
  closeAuthDialog: () => void;
};

const AuthDialogContext = createContext<AuthDialogContextType | null>(null);

export function useAuthDialog() {
  const context = useContext(AuthDialogContext);
  if (!context) {
    throw new Error("useAuthDialog must be used within AuthDialogProvider");
  }
  return context;
}

type AuthDialogProviderProps = {
  children: ReactNode;
};

export function AuthDialogProvider({ children }: AuthDialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openAuthDialog = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeAuthDialog = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AuthDialogContext.Provider
      value={{ isOpen, openAuthDialog, closeAuthDialog }}
    >
      {children}
      <AuthDialog onOpenChange={setIsOpen} open={isOpen} />
    </AuthDialogContext.Provider>
  );
}
