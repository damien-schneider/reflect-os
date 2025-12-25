import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Separator } from "@repo/ui/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { useQuery } from "@rocicorp/zero/react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  Copy,
  Crown,
  Link as LinkIcon,
  Loader2,
  Mail,
  MoreHorizontal,
  Share2,
  Shield,
  Trash2,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { queries } from "@/queries";

export const Route = createFileRoute("/dashboard/$orgSlug/settings/members")({
  component: MembersSettings,
});

type MemberRole = "owner" | "admin" | "member";

const roleOptions: { value: MemberRole; label: string; description: string }[] =
  [
    {
      value: "owner",
      label: "Owner",
      description: "Full access to all features",
    },
    {
      value: "admin",
      label: "Admin",
      description: "Can manage settings and members",
    },
    {
      value: "member",
      label: "Member",
      description: "Can view and submit feedback",
    },
  ];

// Helper functions
function getRoleBadgeVariant(
  role: MemberRole
): "default" | "secondary" | "outline" {
  const variants: Record<MemberRole, "default" | "secondary" | "outline"> = {
    owner: "default",
    admin: "secondary",
    member: "outline",
  };
  return variants[role];
}

function getRoleIcon(role: MemberRole) {
  const icons: Record<MemberRole, React.ReactNode> = {
    owner: <Crown className="h-3 w-3" />,
    admin: <Shield className="h-3 w-3" />,
    member: <User className="h-3 w-3" />,
  };
  return icons[role];
}

/**
 * Extracts error message from unknown error type
 */
function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// Extracted MemberRow component to reduce cognitive complexity
interface MemberRowProps {
  member: {
    id: string;
    userId: string;
    role: string;
    createdAt: number | null;
    user?: { name?: string | null; email?: string | null } | null;
  };
  isCurrentUser: boolean;
  isAdmin: boolean;
  canManage: boolean;
  onChangeRole: (member: {
    id: string;
    userId: string;
    currentRole: MemberRole;
    name: string;
  }) => void;
  onRemove: (member: { id: string; userId: string; name: string }) => void;
}

function MemberRow({
  member,
  isCurrentUser,
  isAdmin,
  canManage,
  onChangeRole,
  onRemove,
}: MemberRowProps) {
  const isMemberOwner = member.role === "owner";

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">
              {member.user?.name ?? "Unknown"}
              {isCurrentUser ? (
                <span className="ml-2 text-muted-foreground text-xs">
                  (you)
                </span>
              ) : null}
            </p>
            <p className="text-muted-foreground text-sm">
              {member.user?.email ?? ""}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge
          className="gap-1"
          variant={getRoleBadgeVariant(member.role as MemberRole)}
        >
          {getRoleIcon(member.role as MemberRole)}
          {member.role}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {member.createdAt
          ? formatDistanceToNow(member.createdAt, { addSuffix: true })
          : "Unknown"}
      </TableCell>
      {isAdmin ? (
        <TableCell className="text-right">
          {canManage && !isCurrentUser ? (
            <div className="flex items-center justify-end gap-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      onClick={() =>
                        onChangeRole({
                          id: member.id,
                          userId: member.userId,
                          currentRole: member.role as MemberRole,
                          name: member.user?.name ?? "Unknown",
                        })
                      }
                      size="icon"
                      variant="ghost"
                    />
                  }
                >
                  <MoreHorizontal className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>Change role</TooltipContent>
              </Tooltip>
              {isMemberOwner ? null : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          onRemove({
                            id: member.id,
                            userId: member.userId,
                            name: member.user?.name ?? "Unknown",
                          })
                        }
                        size="icon"
                        variant="ghost"
                      />
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>Remove member</TooltipContent>
                </Tooltip>
              )}
            </div>
          ) : null}
        </TableCell>
      ) : null}
    </TableRow>
  );
}

/**
 * Custom hook for managing invite functionality
 */
function useInviteActions(org: { id: string; name: string } | undefined) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generatedInviteId, setGeneratedInviteId] = useState<string | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  const inviteLink = generatedInviteId
    ? `${window.location.origin}/invite/${generatedInviteId}`
    : null;

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleGenerateInviteLink = async () => {
    if (!org) {
      return;
    }
    setInviteLoading(true);
    setInviteError(null);
    try {
      const result = await authClient.organization.inviteMember({
        organizationId: org.id,
        email: `invite-${Date.now()}@placeholder.local`,
        role: inviteRole,
      });
      if (result.error) {
        setInviteError(result.error.message ?? "Could not generate link");
        return;
      }
      if (result?.data?.id) {
        setGeneratedInviteId(result.data.id);
      } else {
        setInviteError("Failed to generate invitation link");
      }
    } catch (error: unknown) {
      setInviteError(getErrorMessage(error, "Could not generate link"));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSendEmailInvite = async () => {
    if (!(org && inviteEmail.trim())) {
      return;
    }
    setInviteLoading(true);
    setInviteError(null);
    try {
      const result = await authClient.organization.inviteMember({
        organizationId: org.id,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      if (result.error) {
        setInviteError(result.error.message ?? "Could not send invitation");
        return;
      }
      setInviteEmail("");
      setInviteRole("member");
      setShowInviteDialog(false);
    } catch (error: unknown) {
      setInviteError(getErrorMessage(error, "Could not send invitation"));
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (!inviteLink) {
      return;
    }
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
  };

  const shareInviteLink = async () => {
    if (!(inviteLink && org)) {
      return;
    }
    try {
      await navigator.share({
        title: `Join ${org.name}`,
        text: `You've been invited to join ${org.name}`,
        url: inviteLink,
      });
    } catch {
      copyInviteLink();
    }
  };

  const closeInviteDialog = () => {
    setShowInviteDialog(false);
    setInviteEmail("");
    setInviteRole("member");
    setInviteError(null);
    setGeneratedInviteId(null);
  };

  return {
    showInviteDialog,
    setShowInviteDialog,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    inviteLoading,
    inviteError,
    setInviteError,
    inviteLink,
    copied,
    canShare,
    generatedInviteId,
    handleGenerateInviteLink,
    handleSendEmailInvite,
    copyInviteLink,
    shareInviteLink,
    closeInviteDialog,
  };
}

/**
 * Custom hook for managing member role/removal actions
 */
function useMemberActions(
  orgId: string | undefined,
  setInviteError: (error: string | null) => void
) {
  const [memberToChangeRole, setMemberToChangeRole] = useState<{
    id: string;
    userId: string;
    currentRole: MemberRole;
    name: string;
  } | null>(null);
  const [newRole, setNewRole] = useState<MemberRole>("member");
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    userId: string;
    name: string;
  } | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const handleChangeRole = async () => {
    if (!memberToChangeRole) {
      return;
    }
    setRoleChangeLoading(true);
    try {
      await authClient.organization.updateMemberRole({
        organizationId: orgId ?? "",
        memberId: memberToChangeRole.userId,
        role: newRole,
      });
      setMemberToChangeRole(null);
    } catch (error: unknown) {
      setInviteError(getErrorMessage(error, "Could not change role"));
    } finally {
      setRoleChangeLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) {
      return;
    }
    setRemoveLoading(true);
    try {
      await authClient.organization.removeMember({
        organizationId: orgId ?? "",
        memberIdOrEmail: memberToRemove.userId,
      });
      setMemberToRemove(null);
    } catch (error: unknown) {
      setInviteError(getErrorMessage(error, "Could not remove member"));
    } finally {
      setRemoveLoading(false);
    }
  };

  return {
    memberToChangeRole,
    setMemberToChangeRole,
    newRole,
    setNewRole,
    roleChangeLoading,
    memberToRemove,
    setMemberToRemove,
    removeLoading,
    handleChangeRole,
    handleRemoveMember,
  };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex UI with multiple dialogs and conditional rendering, already refactored with custom hooks
function MembersSettings() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
  const { data: session } = authClient.useSession();

  // Get organization
  const [orgs] = useQuery(queries.organization.bySlug({ slug: orgSlug }));
  const org = orgs?.[0];

  // Get members with user data
  const [members] = useQuery(
    queries.member.byOrganizationId({ organizationId: org?.id ?? "" })
  );

  // Check current user's role
  const currentUserMember = members?.find(
    (m) => m.userId === session?.user?.id
  );
  const isOwner = currentUserMember?.role === "owner";
  const isAdmin = isOwner || currentUserMember?.role === "admin";

  // Use custom hooks for invite and member actions
  const invite = useInviteActions(org);
  const memberActions = useMemberActions(org?.id, invite.setInviteError);

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Members</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your organization's team members and their permissions
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={() => invite.setShowInviteDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        ) : null}
      </div>

      {/* Member Stats */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 rounded-lg border px-4 py-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">
            {members?.length ?? 0} members
          </span>
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              {isAdmin ? (
                <TableHead className="text-right">Actions</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members?.map((member) => {
              const isCurrentUser = member.userId === session?.user?.id;
              const isMemberOwner = member.role === "owner";
              const canManage = isOwner || (isAdmin && !isMemberOwner);

              return (
                <MemberRow
                  canManage={canManage}
                  isAdmin={isAdmin}
                  isCurrentUser={isCurrentUser}
                  key={member.id}
                  member={member}
                  onChangeRole={(m) => {
                    memberActions.setMemberToChangeRole(m);
                    memberActions.setNewRole(m.currentRole);
                  }}
                  onRemove={memberActions.setMemberToRemove}
                />
              );
            })}
            {(!members || members.length === 0) && (
              <TableRow>
                <TableCell
                  className="py-8 text-center text-muted-foreground"
                  colSpan={isAdmin ? 4 : 3}
                >
                  No members found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Role Permissions Info */}
      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Role Permissions</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {roleOptions.map((role) => (
            <div className="rounded-lg border p-4" key={role.value}>
              <div className="flex items-center gap-2">
                <Badge variant={getRoleBadgeVariant(role.value)}>
                  {getRoleIcon(role.value)}
                  {role.label}
                </Badge>
              </div>
              <p className="mt-2 text-muted-foreground text-sm">
                {role.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog
        onOpenChange={(open) => !open && invite.closeInviteDialog()}
        open={invite.showInviteDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Invite someone to join {org.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                onValueChange={(v) => invite.setInviteRole(v as MemberRole)}
                value={invite.inviteRole}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions
                    .filter((r) => r.value !== "owner")
                    .map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <span className="flex items-center gap-2">
                          {getRoleIcon(role.value)}
                          {role.label}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Email Invite */}
            <div className="space-y-2">
              <Label>Invite by Email</Label>
              <div className="flex gap-2">
                <Input
                  onChange={(e) => invite.setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  type="email"
                  value={invite.inviteEmail}
                />
                <Button
                  disabled={invite.inviteLoading || !invite.inviteEmail.trim()}
                  onClick={invite.handleSendEmailInvite}
                >
                  {invite.inviteLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            {/* Invite Link */}
            <div className="space-y-2">
              <Label>Generate Invite Link</Label>
              {invite.inviteLink ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
                    <code className="flex-1 truncate text-xs">
                      {invite.inviteLink}
                    </code>
                    <Button
                      onClick={invite.copyInviteLink}
                      size="icon"
                      variant="ghost"
                    >
                      {invite.copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    {invite.canShare ? (
                      <Button
                        onClick={invite.shareInviteLink}
                        size="icon"
                        variant="ghost"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Anyone with this link can join as {invite.inviteRole}
                  </p>
                </div>
              ) : (
                <Button
                  className="w-full"
                  disabled={invite.inviteLoading}
                  onClick={invite.handleGenerateInviteLink}
                  variant="outline"
                >
                  {invite.inviteLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LinkIcon className="mr-2 h-4 w-4" />
                  )}
                  Generate Link
                </Button>
              )}
            </div>

            {invite.inviteError ? (
              <p className="text-destructive text-sm">{invite.inviteError}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button onClick={invite.closeInviteDialog} variant="outline">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog
        onOpenChange={(open) =>
          !open && memberActions.setMemberToChangeRole(null)
        }
        open={!!memberActions.memberToChangeRole}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update the role for {memberActions.memberToChangeRole?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select
                onValueChange={(v) => memberActions.setNewRole(v as MemberRole)}
                value={memberActions.newRole}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions
                    .filter((r) => isOwner || r.value !== "owner")
                    .map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <span className="flex items-center gap-2">
                          {getRoleIcon(role.value)}
                          {role.label}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => memberActions.setMemberToChangeRole(null)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                memberActions.roleChangeLoading ||
                memberActions.newRole ===
                  memberActions.memberToChangeRole?.currentRole
              }
              onClick={memberActions.handleChangeRole}
            >
              {memberActions.roleChangeLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog
        onOpenChange={(open) => !open && memberActions.setMemberToRemove(null)}
        open={!!memberActions.memberToRemove}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              {memberActions.memberToRemove?.name} from {org.name}? They will
              lose access to all organization resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={memberActions.removeLoading}
              onClick={memberActions.handleRemoveMember}
              variant="destructive"
            >
              {memberActions.removeLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
