import { useQuery, useZero } from "@rocicorp/zero/react";
import { Check, Plus, Unlink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANE_OPTIONS, type RoadmapLane } from "@/lib/constants";
import type { Schema } from "@/schema";

type AddToRoadmapProps = {
  feedbackId: string;
  currentLane?: string | null;
  onSuccess?: () => void;
};

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
    z.query.feedback.where("roadmapLane", "=", lane)
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
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant={isOnRoadmap ? "secondary" : "outline"}>
          {isOnRoadmap ? (
            <>
              <Check className="mr-1 h-4 w-4" />
              On Roadmap
            </>
          ) : (
            <>
              <Plus className="mr-1 h-4 w-4" />
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
            <Select
              onValueChange={(v) => setLane(v as RoadmapLane)}
              value={lane}
            >
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

          <div className="flex justify-end gap-2">
            {isOnRoadmap && (
              <Button
                disabled={isSubmitting}
                onClick={handleRemoveFromRoadmap}
                variant="destructive"
              >
                <Unlink className="mr-1 h-4 w-4" />
                Remove
              </Button>
            )}
            <Button
              disabled={isSubmitting}
              onClick={isOnRoadmap ? handleUpdateLane : handleAddToRoadmap}
            >
              {isOnRoadmap ? "Update Lane" : "Add to Roadmap"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
