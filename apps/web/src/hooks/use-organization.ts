import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export function useOrganizations() {
  const { data: organizations, refetch } = authClient.useListOrganizations();

  // Create org state
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [createOrgError, setCreateOrgError] = useState<string | null>(null);

  // Delete state
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const [deletedOrg, setDeletedOrg] = useState<Organization | null>(null);
  const [showUndoDelete, setShowUndoDelete] = useState(false);

  // Auto-hide undo after 5 seconds
  useEffect(() => {
    if (showUndoDelete) {
      const timer = setTimeout(() => {
        setShowUndoDelete(false);
        setDeletedOrg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showUndoDelete]);

  // Auto-generate slug from name
  useEffect(() => {
    if (newOrgName) {
      setNewOrgSlug(
        newOrgName
          .toLowerCase()
          .replace(/\s+/gu, "-")
          .replace(/[^a-z0-9-]/gu, "")
      );
    }
  }, [newOrgName]);

  const createOrg = async () => {
    if (!newOrgName.trim()) {
      setCreateOrgError("Enter a name");
      return;
    }

    setIsCreatingOrg(true);
    setCreateOrgError(null);

    try {
      await authClient.organization.create({
        name: newOrgName,
        slug: newOrgSlug || newOrgName.toLowerCase().replace(/\s+/gu, "-"),
      });
      setNewOrgName("");
      setNewOrgSlug("");
      setShowCreateOrg(false);
      refetch();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not create";
      setCreateOrgError(message);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const deleteOrg = async (org: Organization) => {
    setDeletingOrgId(org.id);
    try {
      await authClient.organization.delete({
        organizationId: org.id,
      });
      setDeletedOrg(org);
      setShowUndoDelete(true);
      refetch();
    } catch {
      // Silent fail
    } finally {
      setDeletingOrgId(null);
    }
  };

  const undoDelete = async () => {
    if (!deletedOrg) {
      return;
    }
    try {
      await authClient.organization.create({
        name: deletedOrg.name,
        slug: deletedOrg.slug,
      });
      setShowUndoDelete(false);
      setDeletedOrg(null);
      refetch();
    } catch {
      // Silent fail
    }
  };

  const cancelCreate = () => {
    setShowCreateOrg(false);
    setNewOrgName("");
    setNewOrgSlug("");
    setCreateOrgError(null);
  };

  return {
    organizations,
    refetch,
    // Create
    showCreateOrg,
    setShowCreateOrg,
    newOrgName,
    setNewOrgName,
    isCreatingOrg,
    createOrgError,
    setCreateOrgError,
    createOrg,
    cancelCreate,
    // Delete
    deletingOrgId,
    deletedOrg,
    showUndoDelete,
    deleteOrg,
    undoDelete,
  };
}

export function useOrgInvite(selectedOrg: Organization | null) {
  const [generatedInviteId, setGeneratedInviteId] = useState<string | null>(
    null
  );
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  // Reset copied state
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const generateInviteLink = async () => {
    if (!selectedOrg) {
      return;
    }

    setInviteLoading(true);
    setInviteError(null);

    try {
      const result = await authClient.organization.inviteMember({
        organizationId: selectedOrg.id,
        email: `invite-${Date.now()}@placeholder.local`,
        role: "member",
      });

      if (result?.data?.id) {
        setGeneratedInviteId(result.data.id);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not generate link";
      setInviteError(message);
    } finally {
      setInviteLoading(false);
    }
  };

  const inviteLink = generatedInviteId
    ? `${window.location.origin}/invite/${generatedInviteId}`
    : null;

  const copyInviteLink = () => {
    if (!inviteLink) {
      return;
    }
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
  };

  const shareInviteLink = async () => {
    if (!(inviteLink && selectedOrg)) {
      return;
    }

    try {
      await navigator.share({
        title: `Join ${selectedOrg.name}`,
        text: `You've been invited to join ${selectedOrg.name}`,
        url: inviteLink,
      });
    } catch {
      copyInviteLink();
    }
  };

  const resetInvite = () => {
    setInviteError(null);
    setGeneratedInviteId(null);
  };

  return {
    inviteLoading,
    inviteError,
    inviteLink,
    copied,
    canShare,
    generateInviteLink,
    copyInviteLink,
    shareInviteLink,
    resetInvite,
  };
}

export function useOrgRename(
  selectedOrg: Organization | null,
  onSuccess: (updated: Organization) => void
) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);

  const startEditing = (org: Organization) => {
    setEditNameValue(org.name);
    setIsEditingName(true);
  };

  const cancelEditing = () => {
    setIsEditingName(false);
  };

  const saveRename = async () => {
    if (!(selectedOrg && editNameValue.trim())) {
      return;
    }

    setRenameLoading(true);
    try {
      await authClient.organization.update({
        organizationId: selectedOrg.id,
        data: { name: editNameValue },
      });
      onSuccess({ ...selectedOrg, name: editNameValue });
      setIsEditingName(false);
    } catch {
      // Keep editing mode open on error
    } finally {
      setRenameLoading(false);
    }
  };

  const reset = (org: Organization | null) => {
    setEditNameValue(org?.name || "");
    setIsEditingName(false);
  };

  return {
    isEditingName,
    setIsEditingName,
    editNameValue,
    setEditNameValue,
    renameLoading,
    startEditing,
    cancelEditing,
    saveRename,
    reset,
  };
}
