import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { authClient } from "../lib/auth-client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  AlertCircle,
  Copy,
  Loader2,
  Users,
  Check,
  Share2,
  Link,
} from "lucide-react";
import type { Organization } from "../hooks/use-organization";

export function MembersList({ orgId }: { orgId: string }) {
  const [members, setMembers] = useState<{ id: string; user: { name: string }; role: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    authClient.organization
      .listMembers({ query: { organizationId: orgId } })
      .then((res) => {
        if (res.data?.members) setMembers(res.data.members);
      })
      .finally(() => setIsLoading(false));
  }, [orgId]);

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">No members yet</p>;
  }

  return (
    <div className="space-y-2">
      {members.map((m) => (
        <div key={m.id} className="flex items-center justify-between py-1">
          <span className="text-sm">{m.user.name}</span>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="secondary" className="text-xs cursor-default">
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

interface OrgDetailContentProps {
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
}

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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Members</span>
        </div>
        {selectedOrg && <MembersList orgId={selectedOrg.id} />}
      </div>

      {/* Invite */}
      <div className="space-y-3">
        {inviteError && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {inviteError}
          </p>
        )}

        {inviteLink ? (
          <div className="space-y-3">
            {/* Link with copy */}
            <div className="flex gap-2">
              <Input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 text-xs"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={copyInviteLink}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy link</TooltipContent>
              </Tooltip>
            </div>

            {/* Share button (mobile) + QR code */}
            <div className="flex items-center justify-center gap-4">
              {canShare && (
                <Button variant="outline" onClick={shareInviteLink} className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              )}
              <QRCodeSVG value={inviteLink} size={100} />
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={generateInviteLink}
            disabled={generatingLink || inviteLoading}
            className="w-full gap-2"
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
