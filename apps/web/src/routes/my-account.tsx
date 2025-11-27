import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../components/ui/drawer";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { Loader2, Plus, Trash2, Undo2, ChevronRight, LogOut } from "lucide-react";
import { useIsMobile } from "../hooks/use-mobile";
import { useOrganizations, useOrgInvite, useOrgRename, Organization } from "../hooks/use-organization";
import { OrgDetailContent } from "../components/organization";
import { AuthGuard } from "../components/auth-guard";

export const Route = createFileRoute("/my-account")({
  component: () => (
    <AuthGuard>
      <MyAccount />
    </AuthGuard>
  ),
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
    if (!selectedOrg) return;
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
      type="text"
      value={editNameValue}
      onChange={(e) => setEditNameValue(e.target.value)}
      className="text-lg font-semibold"
      autoFocus
      onKeyDown={(e) => {
        if (e.key === "Enter") saveRename();
        if (e.key === "Escape") setIsEditingName(false);
      }}
      disabled={renameLoading}
    />
  ) : (
    <span
      className="cursor-pointer hover:text-muted-foreground transition-colors"
      onClick={() => setIsEditingName(true)}
    >
      {selectedOrg?.name}
    </span>
  );

  // Footer content (shared)
  const footerContent = (
    <Button
      variant="ghost"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={handleDelete}
      disabled={deletingOrgId === selectedOrg?.id}
    >
      {deletingOrgId === selectedOrg?.id ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Trash2 className="h-4 w-4 mr-2" />
      )}
      Delete
    </Button>
  );

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-4xl pb-24 sm:pb-6">
      {/* Desktop: Two column layout */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 sm:gap-12">
        {/* Left column: User info */}
        <section className="sm:w-1/3 space-y-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <h1 className="text-2xl font-semibold cursor-default">{session?.user.name}</h1>
            </TooltipTrigger>
            <TooltipContent>{session?.user.email}</TooltipContent>
          </Tooltip>
          
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 p-0 h-auto"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </section>

        {/* Right column: Organizations */}
        <section className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Organizations</h2>
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex"
              onClick={() => setShowCreateOrg(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Undo delete */}
          {showUndoDelete && deletedOrg && (
            <button
              onClick={undoDelete}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2"
            >
              <Undo2 className="h-4 w-4" />
              Undo delete
            </button>
          )}

          {/* Organizations List */}
          <div className="space-y-1">
            {organizations?.length === 0 && !showCreateOrg ? (
              <p className="text-muted-foreground text-sm py-2">None yet</p>
            ) : (
              organizations?.map((org) => (
                <button
                  key={org.id}
                  onClick={() => openOrgDetail(org)}
                  className="w-full flex items-center justify-between py-3 px-2 hover:bg-muted/50 rounded-lg transition-colors text-left group"
                >
                  <span className="font-medium">{org.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            )}
          </div>

          {/* Inline create org form */}
          {showCreateOrg && (
            <div className="py-2 space-y-2">
              {createOrgError && (
                <p className="text-sm text-destructive">{createOrgError}</p>
              )}
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Organization name"
                  value={newOrgName}
                  onChange={(e) => {
                    setNewOrgName(e.target.value);
                    if (createOrgError) setCreateOrgError(null);
                  }}
                  disabled={isCreatingOrg}
                  autoFocus
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createOrg();
                    if (e.key === "Escape") cancelCreate();
                  }}
                />
                <Button
                  onClick={createOrg}
                  disabled={isCreatingOrg || !newOrgName.trim()}
                  className="hidden sm:flex"
                >
                  {isCreatingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Mobile: Fixed bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t sm:hidden">
        {showCreateOrg ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={cancelCreate}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={createOrg}
              disabled={isCreatingOrg || !newOrgName.trim()}
            >
              {isCreatingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={() => setShowCreateOrg(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Organization
          </Button>
        )}
      </div>

      {/* Mobile: Drawer for org details */}
      {isMobile && (
        <Drawer open={!!selectedOrg} onOpenChange={(open) => !open && closeOrgDetail()}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{titleContent}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 py-2 overflow-y-auto max-h-[50vh]">
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
        <Dialog open={!!selectedOrg} onOpenChange={(open) => !open && closeOrgDetail()}>
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
