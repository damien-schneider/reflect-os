import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Loader2,
  LogOut,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { OrgDetailContent } from "../../components/organization";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../../components/ui/drawer";
import { Input } from "../../components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { useIsMobile } from "../../hooks/use-mobile";
import {
  type Organization,
  useOrganizations,
  useOrgInvite,
  useOrgRename,
} from "../../hooks/use-organization";
import { authClient } from "../../lib/auth-client";

export const Route = createFileRoute("/dashboard/account")({
  component: MyAccount,
});

function MyAccount() {
  const { data: session } = authClient.useSession();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/login" });
  };

  // Organization management
  const {
    organizations,
    refetch,
    showCreateOrg,
    setShowCreateOrg,
    newOrgName,
    setNewOrgName,
    isCreatingOrg,
    createOrgError,
    setCreateOrgError,
    createOrg,
    cancelCreate,
    deletingOrgId,
    deletedOrg,
    showUndoDelete,
    deleteOrg,
    undoDelete,
  } = useOrganizations();

  // Selected org state
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  // Rename
  const {
    isEditingName,
    setIsEditingName,
    editNameValue,
    setEditNameValue,
    renameLoading,
    saveRename,
    reset: resetRename,
  } = useOrgRename(selectedOrg, (updated) => {
    setSelectedOrg(updated);
    refetch();
  });

  // Invite
  const {
    inviteLoading,
    inviteError,
    inviteLink,
    copied,
    canShare,
    generateInviteLink,
    copyInviteLink,
    shareInviteLink,
    resetInvite,
  } = useOrgInvite(selectedOrg);

  const openOrgDetail = (org: Organization) => {
    setSelectedOrg(org);
    resetRename(org);
    resetInvite();
  };

  const closeOrgDetail = () => setSelectedOrg(null);

  const handleDelete = async () => {
    if (!selectedOrg) {
      return;
    }
    await deleteOrg(selectedOrg);
    setSelectedOrg(null);
  };

  // Shared content props
  const contentProps = {
    selectedOrg,
    inviteError,
    inviteLoading,
    inviteLink,
    copyInviteLink,
    copied,
    shareInviteLink,
    canShare,
    generateInviteLink,
    generatingLink: inviteLoading,
  };

  // Title component (shared between Drawer/Dialog)
  const titleContent = isEditingName ? (
    <Input
      autoFocus
      className="font-semibold text-lg"
      disabled={renameLoading}
      onChange={(e) => setEditNameValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          saveRename();
        }
        if (e.key === "Escape") {
          setIsEditingName(false);
        }
      }}
      type="text"
      value={editNameValue}
    />
  ) : (
    <span
      className="cursor-pointer transition-colors hover:text-muted-foreground"
      onClick={() => setIsEditingName(true)}
    >
      {selectedOrg?.name}
    </span>
  );

  // Footer content (shared)
  const footerContent = (
    <Button
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      disabled={deletingOrgId === selectedOrg?.id}
      onClick={handleDelete}
      variant="ghost"
    >
      {deletingOrgId === selectedOrg?.id ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="mr-2 h-4 w-4" />
      )}
      Delete
    </Button>
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 pb-24 sm:pb-6 md:px-6">
      {/* Desktop: Two column layout */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-12">
        {/* Left column: User info */}
        <section className="space-y-4 sm:w-1/3">
          <Tooltip>
            <TooltipTrigger asChild>
              <h1 className="cursor-default font-semibold text-2xl">
                {session?.user.name}
              </h1>
            </TooltipTrigger>
            <TooltipContent>{session?.user.email}</TooltipContent>
          </Tooltip>

          <Button
            className="h-auto p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleSignOut}
            variant="ghost"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </section>

        {/* Right column: Organizations */}
        <section className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-muted-foreground text-sm">
              Organizations
            </h2>
            <Button
              className="hidden sm:flex"
              onClick={() => setShowCreateOrg(true)}
              size="sm"
              variant="ghost"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Undo delete */}
          {showUndoDelete && deletedOrg && (
            <button
              className="flex items-center gap-2 py-2 text-muted-foreground text-sm hover:text-foreground"
              onClick={undoDelete}
            >
              <Undo2 className="h-4 w-4" />
              Undo delete
            </button>
          )}

          {/* Organizations List */}
          <div className="space-y-1">
            {organizations?.length === 0 && !showCreateOrg ? (
              <p className="py-2 text-muted-foreground text-sm">None yet</p>
            ) : (
              organizations?.map((org) => (
                <button
                  className="group flex w-full items-center justify-between rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted/50"
                  key={org.id}
                  onClick={() => openOrgDetail(org)}
                >
                  <span className="font-medium">{org.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))
            )}
          </div>

          {/* Inline create org form */}
          {showCreateOrg && (
            <div className="space-y-2 py-2">
              {createOrgError && (
                <p className="text-destructive text-sm">{createOrgError}</p>
              )}
              <div className="flex gap-2">
                <Input
                  autoFocus
                  className="flex-1"
                  disabled={isCreatingOrg}
                  onChange={(e) => {
                    setNewOrgName(e.target.value);
                    if (createOrgError) {
                      setCreateOrgError(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      createOrg();
                    }
                    if (e.key === "Escape") {
                      cancelCreate();
                    }
                  }}
                  placeholder="Organization name"
                  type="text"
                  value={newOrgName}
                />
                <Button
                  className="hidden sm:flex"
                  disabled={isCreatingOrg || !newOrgName.trim()}
                  onClick={createOrg}
                >
                  {isCreatingOrg ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Mobile: Fixed bottom action bar */}
      <div className="fixed right-0 bottom-0 left-0 border-t bg-background p-4 sm:hidden">
        {showCreateOrg ? (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={cancelCreate} variant="outline">
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={isCreatingOrg || !newOrgName.trim()}
              onClick={createOrg}
            >
              {isCreatingOrg ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={() => setShowCreateOrg(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Organization
          </Button>
        )}
      </div>

      {/* Mobile: Drawer for org details */}
      {isMobile && (
        <Drawer
          onOpenChange={(open) => !open && closeOrgDetail()}
          open={!!selectedOrg}
        >
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{titleContent}</DrawerTitle>
            </DrawerHeader>
            <div className="max-h-[50vh] overflow-y-auto px-4 py-2">
              <OrgDetailContent {...contentProps} />
            </div>
            <DrawerFooter>
              {footerContent}
              <DrawerClose asChild>
                <Button variant="outline">Done</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      {/* Desktop: Dialog for org details */}
      {!isMobile && (
        <Dialog
          onOpenChange={(open) => !open && closeOrgDetail()}
          open={!!selectedOrg}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{titleContent}</DialogTitle>
            </DialogHeader>
            <OrgDetailContent {...contentProps} />
            <DialogFooter className="flex-row justify-between sm:justify-between">
              {footerContent}
              <DialogClose asChild>
                <Button variant="outline">Done</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
