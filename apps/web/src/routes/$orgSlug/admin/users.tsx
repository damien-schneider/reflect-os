import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { formatDistanceToNow } from "date-fns";
import { Ban, UserCheck, Shield, User } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import type { Schema } from "../../../schema";

export const Route = createFileRoute("/$orgSlug/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
  const z = useZero<Schema>();

  // Get organization
  const [orgs] = useQuery(z.query.organization.where("slug", "=", orgSlug));
  const org = orgs?.[0];

  // Get members with user data
  const [members] = useQuery(
    z.query.member
      .where("organizationId", "=", org?.id ?? "")
      .related("user")
  );

  // Get all users who have submitted feedback in this org's boards
  const [boards] = useQuery(
    z.query.board.where("organizationId", "=", org?.id ?? "")
  );
  const boardIds = boards?.map((b) => b.id) ?? [];

  const [feedbacks] = useQuery(
    z.query.feedback
      .where("boardId", "IN", boardIds.length > 0 ? boardIds : [""])
      .related("author")
  );

  // Unique users from feedback
  const feedbackUserIds = [...new Set(feedbacks?.map((f) => f.authorId) ?? [])];
  const [feedbackUsers] = useQuery(
    z.query.user.where("id", "IN", feedbackUserIds.length > 0 ? feedbackUserIds : [""])
  );

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    const action = isBanned ? "unban" : "ban";
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    await z.mutate.user.update({
      id: userId,
      bannedAt: isBanned ? undefined : Date.now(),
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage organization members and community users
        </p>
      </div>

      {/* Organization Members */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Organization Members ({members?.length ?? 0})
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members?.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{member.user?.name ?? "Unknown"}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.createdAt ? formatDistanceToNow(member.createdAt, { addSuffix: true }) : "Unknown"}
                </TableCell>
                <TableCell className="text-right">
                  {member.role !== "owner" && (
                    <Button variant="ghost" size="sm">
                      Remove
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(!members || members.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No members found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Community Users */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5" />
          Community Users ({feedbackUsers?.length ?? 0})
        </h2>
        <p className="text-sm text-muted-foreground">
          Users who have submitted feedback or comments
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Feedback Count</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feedbackUsers?.map((user) => {
              const userFeedbackCount = feedbacks?.filter(
                (f) => f.authorId === user.id
              ).length ?? 0;
              const isBanned = !!user.bannedAt;

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{userFeedbackCount}</TableCell>
                  <TableCell>
                    {isBanned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleBanUser(user.id, isBanned)}
                          className={isBanned ? "text-green-600" : "text-destructive"}
                        >
                          {isBanned ? (
                            <UserCheck className="h-4 w-4" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isBanned ? "Unban user" : "Ban user"}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {(!feedbackUsers || feedbackUsers.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No community users yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
