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
import { Input } from "@repo/ui/components/input";
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
import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  Ban,
  MessageSquare,
  Search,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
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

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!feedbackUsers) {
      return [];
    }
    if (!searchQuery.trim()) {
      return feedbackUsers;
    }
    const query = searchQuery.toLowerCase();
    return feedbackUsers.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
    );
  }, [feedbackUsers, searchQuery]);

  // Ban confirmation state
  const [userToBan, setUserToBan] = useState<{
    id: string;
    name: string;
    isBanned: boolean;
  } | null>(null);

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    await zero.mutate(
      mutators.user.update({
        id: userId,
        bannedAt: isBanned ? undefined : Date.now(),
      })
    );
    setUserToBan(null);
  };

  // Stats
  const totalUsers = feedbackUsers?.length ?? 0;
  const bannedUsers = feedbackUsers?.filter((u) => u.bannedAt).length ?? 0;
  const activeUsers = totalUsers - bannedUsers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">Community Users</h1>
        <p className="mt-1 text-muted-foreground">
          Users who have submitted feedback or comments on your boards
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground text-sm">Total Users</span>
          </div>
          <p className="mt-1 font-semibold text-2xl">{totalUsers}</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-green-600" />
            <span className="text-muted-foreground text-sm">Active</span>
          </div>
          <p className="mt-1 font-semibold text-2xl text-green-600">
            {activeUsers}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-destructive" />
            <span className="text-muted-foreground text-sm">Banned</span>
          </div>
          <p className="mt-1 font-semibold text-2xl text-destructive">
            {bannedUsers}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users by name or email..."
          value={searchQuery}
        />
      </div>

      {/* Users Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Feedback
                </div>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => {
              const userFeedbackCount =
                feedbacks?.filter((f) => f.authorId === user.id).length ?? 0;
              const isBanned = !!user.bannedAt;

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{userFeedbackCount}</span>
                  </TableCell>
                  <TableCell>
                    {isBanned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            className={
                              isBanned
                                ? "text-green-600 hover:text-green-700"
                                : "text-destructive hover:text-destructive"
                            }
                            onClick={() =>
                              setUserToBan({
                                id: user.id,
                                name: user.name ?? "Unknown",
                                isBanned,
                              })
                            }
                            size="icon"
                            variant="ghost"
                          />
                        }
                      >
                        {isBanned ? (
                          <UserCheck className="h-4 w-4" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        {isBanned ? "Unban user" : "Ban user"}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell
                  className="py-12 text-center text-muted-foreground"
                  colSpan={4}
                >
                  {searchQuery ? (
                    <div className="space-y-1">
                      <p>No users matching "{searchQuery}"</p>
                      <p className="text-sm">Try a different search term</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Users className="mx-auto h-8 w-8 opacity-50" />
                      <p>No community users yet</p>
                      <p className="text-sm">
                        Users will appear here when they submit feedback
                      </p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Ban/Unban Confirmation */}
      <AlertDialog
        onOpenChange={(open) => !open && setUserToBan(null)}
        open={!!userToBan}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToBan?.isBanned ? "Unban user?" : "Ban user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToBan?.isBanned
                ? `This will restore ${userToBan.name}'s access to submit feedback and comments.`
                : `This will prevent ${userToBan?.name} from submitting new feedback or comments.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                userToBan && handleBanUser(userToBan.id, userToBan.isBanned)
              }
              variant={userToBan?.isBanned ? "default" : "destructive"}
            >
              {userToBan?.isBanned ? "Unban" : "Ban"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
