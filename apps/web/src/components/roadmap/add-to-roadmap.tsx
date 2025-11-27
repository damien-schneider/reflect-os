import { useState } from "react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { Plus, Check, Unlink } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { type RoadmapLane, LANE_OPTIONS } from "../../lib/constants";
import type { Schema } from "../../schema";

interface AddToRoadmapProps {
  feedbackId: string;
  currentLane?: string | null;
  onSuccess?: () => void;
}

export function AddToRoadmap({
  feedbackId,
  currentLane,
  onSuccess,
}: AddToRoadmapProps) {
  const z = useZero<Schema>();
  const [open, setOpen] = useState(false);
  const [lane, setLane] = useState<RoadmapLane>(
    (currentLane as RoadmapLane) || "later"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOnRoadmap = !!currentLane;

  // Get existing feedback items on roadmap to calculate sort order
  const [existingFeedbacks] = useQuery(
    z.query.feedback
      .where("roadmapLane", "=", lane)
  );

  const handleAddToRoadmap = async () => {
    setIsSubmitting(true);
    try {
      // Calculate sort order (add at end)
      const maxOrder = (existingFeedbacks ?? []).reduce(
        (max, item) => Math.max(max, item.roadmapOrder ?? 0),
        0
      );

      await z.mutate.feedback.update({
        id: feedbackId,
        roadmapLane: lane,
        roadmapOrder: maxOrder + 1000,
        updatedAt: Date.now(),
      });

      setOpen(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFromRoadmap = async () => {
    setIsSubmitting(true);
    try {
      await z.mutate.feedback.update({
        id: feedbackId,
        roadmapLane: null,
        roadmapOrder: null,
        updatedAt: Date.now(),
      });

      setOpen(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLane = async () => {
    setIsSubmitting(true);
    try {
      await z.mutate.feedback.update({
        id: feedbackId,
        roadmapLane: lane,
        updatedAt: Date.now(),
      });

      setOpen(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={isOnRoadmap ? "secondary" : "outline"}
          size="sm"
        >
          {isOnRoadmap ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              On Roadmap
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Add to Roadmap
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isOnRoadmap ? "Manage Roadmap Status" : "Add to Roadmap"}
          </DialogTitle>
          <DialogDescription>
            {isOnRoadmap
              ? "Update the roadmap lane or remove from roadmap."
              : "Add this feedback to your roadmap."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Lane</Label>
            <Select value={lane} onValueChange={(v) => setLane(v as RoadmapLane)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            {isOnRoadmap && (
              <Button
                variant="destructive"
                onClick={handleRemoveFromRoadmap}
                disabled={isSubmitting}
              >
                <Unlink className="h-4 w-4 mr-1" />
                Remove
              </Button>
            )}
            <Button
              onClick={isOnRoadmap ? handleUpdateLane : handleAddToRoadmap}
              disabled={isSubmitting}
            >
              {isOnRoadmap ? "Update Lane" : "Add to Roadmap"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
