"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PixelCanvas } from "@/components/ui/pixel-canvas";
import { Plus, X } from "lucide-react";

type Role = "batter" | "bowler" | "allrounder" | "wk";

export interface PlayCardPlayer {
  id: string;
  name: string;
  team?: string;
  role: Role;
  nationality?: string;
  status?: "sold" | "unsold" | "unknown";
  priceCr?: number;
}

interface PlayCardProps {
  player: PlayCardPlayer;
  mode?: "single" | "compare" | "list";
  isInComparison?: boolean;
  onAddToCompare?: (player: PlayCardPlayer) => void;
  onRemoveFromCompare?: (player: PlayCardPlayer) => void;
  onSelectAsPrimary?: (player: PlayCardPlayer) => void;
}

export const PlayCard: React.FC<PlayCardProps> = ({
  player,
  mode = "list",
  isInComparison,
  onAddToCompare,
  onRemoveFromCompare,
  onSelectAsPrimary,
}) => {
  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAddToCompare) return;
    if (!isInComparison) onAddToCompare(player);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRemoveFromCompare) return;
    onRemoveFromCompare(player);
  };

  const handleSelect = () => {
    if (onSelectAsPrimary) onSelectAsPrimary(player);
  };

  const roleLabelMap: Record<Role, string> = {
    batter: "Batter",
    bowler: "Bowler",
    allrounder: "All Rounder",
    wk: "Wicketkeeper",
  };

  return (
    <button
      type="button"
      onClick={handleSelect}
      className="relative w-full text-left group focus:outline-none"
    >
      <Card className="relative overflow-hidden rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm transition-transform duration-150 group-hover:-translate-y-1 group-hover:border-primary/60">
        <div className="pointer-events-none absolute inset-0 opacity-60 group-hover:opacity-90">
          <PixelCanvas
            gap={6}
            speed={35}
            colors={["#E9EEFB", "#C3D0F4", "#DFB84E"]}
            variant="default"
          />
        </div>

        <div className="relative z-10 p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                {player.team || "Unassigned"}
              </p>
              <h3 className="text-lg font-semibold leading-tight">
                {player.name}
              </h3>
            </div>

            {mode === "list" && (
              <Button
                size="icon"
                variant={isInComparison ? "secondary" : "outline"}
                className="h-8 w-8 shrink-0"
                onClick={isInComparison ? handleRemove : handleAdd}
              >
                {isInComparison ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            )}

            {mode === "compare" && (
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 shrink-0"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-muted/60 px-2 py-0.5">
              {roleLabelMap[player.role]}
            </span>
            {player.nationality && (
              <span className="rounded-full bg-muted/60 px-2 py-0.5">
                {player.nationality}
              </span>
            )}
            {player.status && player.status !== "unknown" && (
              <span className="rounded-full bg-muted/60 px-2 py-0.5 capitalize">
                {player.status}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Price:{" "}
              {player.priceCr != null ? `${player.priceCr.toFixed(2)} Cr` : "--"}
            </span>
            {mode === "single" && (
              <span className="text-primary font-medium">Primary Player</span>
            )}
            {mode === "compare" && (
              <span className="text-primary/80 font-medium">
                Comparison Slot
              </span>
            )}
          </div>
        </div>
      </Card>
    </button>
  );
};
