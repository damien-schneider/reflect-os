import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Ban, Shield, User, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { mutators } from "@/mutators";
import { queries } from "@/queries";

export const Route = createFileRoute("/$orgSlug/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
  const zero = useZero();

  // Get organization
  const [orgs] = useQuery(queries.organization.bySlug({ slug: orgSlug }));
  const org = orgs?.[0];

  // Get members with user data
  const [members] = useQuery(
    queries.member.byOrganizationId({ organizationId: org?.id ?? "" })
  );

  // Get all users who have submitted feedback in this org's boards
  const [boards] = useQuery(
    queries.board.byOrganizationId({ organizationId: org?.id ?? "" })
  );
  const boardIds = boards?.map((b) => b.id) ?? [];

  const [feedbacks] = useQuery(
    queries.feedback.byBoardIdsWithAuthor({ boardIds })
  );

  // Unique users from feedback
  const feedbackUserIds = [...new Set(feedbacks?.map((f) => f.authorId) ?? [])];
  const [feedbackUsers] = useQuery(
    queries.user.byIds({ ids: feedbackUserIds })
  );

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    const action = isBanned ? "unban" : "ban";
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    await zero.mutate(
      mutators.user.update({
        id: userId,
        bannedAt: isBanned ? undefined : Date.now(),
      })
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">User Management</h1>
        <p className="mt-1 text-muted-foreground">
          Manage organization members and community users
        </p>
      </div>

      {/* Organization Members */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 font-semibold text-lg">
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {member.user?.name ?? "Unknown"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={member.role === "owner" ? "default" : "secondary"}
                  >
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.createdAt
                    ? formatDistanceToNow(member.createdAt, { addSuffix: true })
                    : "Unknown"}
                </TableCell>
                <TableCell className="text-right">
                  {member.role !== "owner" && (
                    <Button size="sm" variant="ghost">
                      Remove
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(!members || members.length === 0) && (
              <TableRow>
                <TableCell
                  className="py-8 text-center text-muted-foreground"
                  colSpan={4}
                >
                  No members found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Community Users */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 font-semibold text-lg">
          <User className="h-5 w-5" />
          Community Users ({feedbackUsers?.length ?? 0})
        </h2>
        <p className="text-muted-foreground text-sm">
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
              const userFeedbackCount =
                feedbacks?.filter((f) => f.authorId === user.id).length ?? 0;
              const isBanned = !!user.bannedAt;

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
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
                          className={
                            isBanned ? "text-green-600" : "text-destructive"
                          }
                          onClick={() => handleBanUser(user.id, isBanned)}
                          size="icon"
                          variant="ghost"
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
                <TableCell
                  className="py-8 text-center text-muted-foreground"
                  colSpan={4}
                >
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
