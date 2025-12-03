import {
  AlertCircle,
  Check,
  Copy,
  Link,
  Loader2,
  Share2,
  Users,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Organization } from "@/hooks/use-organization";
import { authClient } from "@/lib/auth-client";

export function MembersList({ orgId }: { orgId: string }) {
  const [members, setMembers] = useState<
    { id: string; user: { name: string }; role: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    authClient.organization
      .listMembers({ query: { organizationId: orgId } })
      .then((res) => {
        if (res.data?.members) {
          setMembers(res.data.members);
        }
      })
      .finally(() => setIsLoading(false));
  }, [orgId]);

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (members.length === 0) {
    return <p className="text-muted-foreground text-sm">No members yet</p>;
  }

  return (
    <div className="space-y-2">
      {members.map((m) => (
        <div className="flex items-center justify-between py-1" key={m.id}>
          <span className="text-sm">{m.user.name}</span>
          <Tooltip>
            <TooltipTrigger>
              <Badge className="cursor-default text-xs" variant="secondary">
                {m.role}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Member role</TooltipContent>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}

type OrgDetailContentProps = {
  selectedOrg: Organization | null;
  inviteError: string | null;
  inviteLoading: boolean;
  inviteLink: string | null;
  copyInviteLink: () => void;
  copied: boolean;
  shareInviteLink: () => void;
  canShare: boolean;
  generateInviteLink: () => void;
  generatingLink: boolean;
};

export function OrgDetailContent({
  selectedOrg,
  inviteError,
  inviteLoading,
  inviteLink,
  copyInviteLink,
  copied,
  shareInviteLink,
  canShare,
  generateInviteLink,
  generatingLink,
}: OrgDetailContentProps) {
  return (
    <div className="space-y-6">
      {/* Members */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Users className="h-4 w-4" />
          <span>Members</span>
        </div>
        {selectedOrg && <MembersList orgId={selectedOrg.id} />}
      </div>

      {/* Invite */}
      <div className="space-y-3">
        {inviteError && (
          <p className="flex items-center gap-1 text-destructive text-sm">
            <AlertCircle className="h-3 w-3" />
            {inviteError}
          </p>
        )}

        {inviteLink ? (
          <div className="space-y-3">
            {/* Link with copy */}
            <div className="flex gap-2">
              <Input
                className="flex-1 text-xs"
                readOnly
                type="text"
                value={inviteLink}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={copyInviteLink}
                    size="icon"
                    variant="outline"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy link</TooltipContent>
              </Tooltip>
            </div>

            {/* Share button (mobile) + QR code */}
            <div className="flex items-center justify-center gap-4">
              {canShare && (
                <Button
                  className="gap-2"
                  onClick={shareInviteLink}
                  variant="outline"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              )}
              <QRCodeSVG size={100} value={inviteLink} />
            </div>
          </div>
        ) : (
          <Button
            className="w-full gap-2"
            disabled={generatingLink || inviteLoading}
            onClick={generateInviteLink}
            variant="outline"
          >
            {generatingLink ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link className="h-4 w-4" />
            )}
            Generate invite link
          </Button>
        )}
      </div>
    </div>
  );
}
