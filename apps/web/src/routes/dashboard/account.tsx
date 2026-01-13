import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/components/drawer";
import { Input } from "@repo/ui/components/input";
import { dropAllDatabases } from "@rocicorp/zero";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Loader2,
  LogOut,
  Mail,
  Plus,
  Trash2,
  Undo2,
  User,
} from "lucide-react";
import { useState } from "react";
import { OrgDetailContent } from "@/components/organization";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  type Organization,
  useOrganizations,
  useOrgInvite,
  useOrgRename,
} from "@/hooks/use-organization";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/account")({
  component: MyAccount,
});

function MyAccount() {
  const { data: session } = authClient.useSession();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    // Clear Zero IndexedDB data to prevent stale data on next login
    try {
      await dropAllDatabases();
      // Clear the userID tracking to prevent stale data detection on re-login
      localStorage.removeItem("zero_last_user_id");
      console.log("[Account] Cleared Zero data on sign out");
    } catch (error) {
      console.error("[Account] Failed to clear Zero data:", error);
    }
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
    <button
      className="cursor-pointer transition-colors hover:text-muted-foreground"
      onClick={() => setIsEditingName(true)}
      type="button"
    >
      {selectedOrg?.name}
    </button>
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
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-semibold text-2xl">Account</h1>
          <p className="text-muted-foreground text-sm">
            Manage your account settings and organizations
          </p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Your personal account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{session?.user.name ?? "User"}</p>
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <Mail className="h-3 w-3" />
                  <span>{session?.user.email}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organizations Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Organizations</CardTitle>
                <CardDescription>
                  Manage your organizations and teams
                </CardDescription>
              </div>
              <Button
                className="hidden sm:flex"
                onClick={() => setShowCreateOrg(true)}
                size="sm"
                variant="outline"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Undo delete */}
            {showUndoDelete && deletedOrg && (
              <button
                className="flex items-center gap-2 py-2 text-muted-foreground text-sm hover:text-foreground"
                onClick={undoDelete}
                type="button"
              >
                <Undo2 className="h-4 w-4" />
                Undo delete &quot;{deletedOrg.name}&quot;
              </button>
            )}

            {/* Organizations List */}
            {organizations?.length === 0 && !showCreateOrg ? (
              <div className="py-8 text-center">
                <p className="mb-2 text-muted-foreground">
                  No organizations yet
                </p>
                <Button
                  onClick={() => setShowCreateOrg(true)}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Create your first organization
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {organizations?.map((org) => (
                  <button
                    className="group flex w-full items-center justify-between py-3 text-left transition-colors hover:text-primary"
                    key={org.id}
                    onClick={() => openOrgDetail(org)}
                    type="button"
                  >
                    <span className="font-medium">{org.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            )}

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
          </CardContent>
        </Card>

        {/* Sign Out Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session</CardTitle>
            <CardDescription>
              Manage your current session and sign out
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-muted-foreground text-sm">
                <p>
                  Signed in as{" "}
                  <span className="font-medium">{session?.user.email}</span>
                </p>
              </div>
              <Button
                className="w-full sm:w-auto"
                onClick={handleSignOut}
                variant="destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive text-lg">
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground text-sm">
              Once you delete your account, there is no going back. Please be
              certain.
            </p>
            <Button disabled variant="outline">
              Delete account
            </Button>
          </CardContent>
        </Card>
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
              <Button onClick={closeOrgDetail} variant="outline">
                Done
              </Button>
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
              <DialogDescription>
                Manage organization settings and members
              </DialogDescription>
            </DialogHeader>
            <OrgDetailContent {...contentProps} />
            <DialogFooter className="flex-row justify-between sm:justify-between">
              {footerContent}
              <Button onClick={closeOrgDetail} variant="outline">
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
