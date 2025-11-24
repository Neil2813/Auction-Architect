"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { PlayCard, PlayCardPlayer } from "@/components/ui/play-card";

const Analytics = () => {
  // dynamic data – loaded from backend, NOT hardcoded
  const [players, setPlayers] = useState<PlayCardPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // search + filters (only visible when "add player" is clicked)
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [natFilter, setNatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // selected single player (for stats)
  const [primaryPlayerId, setPrimaryPlayerId] = useState<string | null>(null);

  // players chosen for comparison
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);

  // ---- FETCH PLAYERS DYNAMICALLY ----
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        // change this URL to whatever your backend exposes
        const res = await fetch("/api/players");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();

        // expecting { players: PlayCardPlayer[] }
        setPlayers(data.players || []);
      } catch (err: any) {
        console.error("Error loading players:", err);
        setLoadError("Failed to load players. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  // ---- FILTERED LIST (used only when search UI is open) ----
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (
        search &&
        !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !(p.team || "")
          .toLowerCase()
          .includes(search.toLowerCase())
      ) {
        return false;
      }

      if (roleFilter !== "all" && p.role !== roleFilter) return false;

      if (natFilter === "india") {
        if ((p.nationality || "").toLowerCase() !== "india") return false;
      } else if (natFilter === "overseas") {
        if ((p.nationality || "").toLowerCase() === "india") return false;
      }

      if (statusFilter !== "all" && p.status !== statusFilter) return false;

      return true;
    });
  }, [players, search, roleFilter, natFilter, statusFilter]);

  // resolved single + comparison players
  const primaryPlayer =
    players.find((p) => p.id === primaryPlayerId) || null;

  const comparisonPlayers = comparisonIds
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean) as PlayCardPlayer[];

  // ---- ACTIONS ----
  const handleOpenSearch = () => {
    setShowSearch(true);
  };

  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearch("");
    setRoleFilter("all");
    setNatFilter("all");
    setStatusFilter("all");
  };

  const handleSelectPrimary = (player: PlayCardPlayer) => {
    setPrimaryPlayerId(player.id);
    // once player is chosen, we can hide the search panel
    handleCloseSearch();
  };

  const handleAddToCompare = (player: PlayCardPlayer) => {
    if (comparisonIds.includes(player.id)) return;
    if (comparisonIds.length >= 4) return; // max 4
    setComparisonIds((prev) => [...prev, player.id]);
  };

  const handleRemoveFromCompare = (player: PlayCardPlayer) => {
    setComparisonIds((prev) => prev.filter((id) => id !== player.id));
  };

  const canCompare = comparisonPlayers.length >= 2;

  // ---- RENDER ----
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-8 space-y-6">
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Player Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Explore player stats, trends, and insights
          </p>
        </div>

        {/* LOADING / ERROR */}
        {loading && (
          <p className="text-muted-foreground text-sm">Loading players...</p>
        )}
        {loadError && (
          <p className="text-destructive text-sm">{loadError}</p>
        )}

        {/* PLAYER LIST / SINGLE PLAYER AREA */}
        <Card>
          <CardHeader>
            <CardTitle>Player List</CardTitle>
            <CardDescription>
              Click &ldquo;+ Add Player&rdquo; to search and pick a player. Clicking a player
              card sets them as the focused player for stats.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 1) Primary player display (stats zone) */}
            {primaryPlayer ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Focused Player</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenSearch}
                  >
                    Change Player
                  </Button>
                </div>
                <div className="max-w-xl">
                  <PlayCard
                    player={primaryPlayer}
                    mode="single"
                    isInComparison={comparisonIds.includes(primaryPlayer.id)}
                    onAddToCompare={handleAddToCompare}
                    onRemoveFromCompare={handleRemoveFromCompare}
                  />
                </div>

                {/* you can plug real stats UI here using primaryPlayer.id */}
                <div className="mt-4 text-sm text-muted-foreground">
                  {/* Placeholder: replace with charts/tables from backend */}
                  Player stats will appear here based on selected player.
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <p className="text-muted-foreground text-sm">
                  No player selected yet.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleOpenSearch}
                  className="inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Player
                </Button>
              </div>
            )}

            {/* 2) Search + filter + results (only when Add / Change pressed) */}
            {showSearch && (
              <div className="space-y-4 border-t border-border pt-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold">Search Players</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseSearch}
                  >
                    Close
                  </Button>
                </div>

                {/* filters row */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or team..."
                      className="pl-10"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <Select
                    value={roleFilter}
                    onValueChange={setRoleFilter}
                  >
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="batter">Batter</SelectItem>
                      <SelectItem value="bowler">Bowler</SelectItem>
                      <SelectItem value="allrounder">All Rounder</SelectItem>
                      <SelectItem value="wk">Wicketkeeper</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={natFilter}
                    onValueChange={setNatFilter}
                  >
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Nationality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="india">India</SelectItem>
                      <SelectItem value="overseas">Overseas</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="unsold">Unsold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* results grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPlayers.length === 0 ? (
                    <p className="text-muted-foreground text-sm col-span-full py-4 text-center">
                      No players match the current filters.
                    </p>
                  ) : (
                    filteredPlayers.map((player) => (
                      <PlayCard
                        key={player.id}
                        player={player}
                        mode="list"
                        isInComparison={comparisonIds.includes(player.id)}
                        onAddToCompare={handleAddToCompare}
                        onRemoveFromCompare={handleRemoveFromCompare}
                        onSelectAsPrimary={handleSelectPrimary}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* COMPARISON SECTION */}
        <Card>
          <CardHeader>
            <CardTitle>Player Comparison</CardTitle>
            <CardDescription>
              Add players using the + button on any card. Minimum 2, maximum 4.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {comparisonPlayers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No players selected for comparison yet.
              </p>
            )}

            {comparisonPlayers.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {comparisonPlayers.map((player) => (
                    <PlayCard
                      key={player.id}
                      player={player}
                      mode="compare"
                      isInComparison
                      onRemoveFromCompare={handleRemoveFromCompare}
                    />
                  ))}
                </div>

                {!canCompare && (
                  <p className="text-xs text-muted-foreground text-center">
                    Add at least {2 - comparisonPlayers.length} more player
                    {comparisonPlayers.length === 1 ? "" : "s"} to enable comparison.
                  </p>
                )}

                {canCompare && (
                  <div className="flex justify-center pt-2">
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => {
                        // plug in your compare logic / navigation here
                        console.log("Compare players:", comparisonPlayers);
                      }}
                    >
                      Compare {comparisonPlayers.length} Player
                      {comparisonPlayers.length > 1 ? "s" : ""}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Analytics;
