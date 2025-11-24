"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const AUCTION_API_BASE =
  import.meta.env.VITE_AUCTION_API_URL || "http://localhost:8001";

const LOCAL_STORAGE_KEY = "auction_selected_players";

// Optional: shape for selected players
type Player = {
  id: string;
  name: string;
  role: "batter" | "bowler" | "allrounder" | "wk";
  isOverseas: boolean;
  price: number; // in Cr
};

const SquadBuilder = () => {
  // --- core constraints state ---
  const [teamSize, setTeamSize] = useState<number>(25);

  // min + max overseas range
  const [overseasRange, setOverseasRange] = useState<[number, number]>([2, 8]);

  const [budget, setBudget] = useState<number>(90); // in Cr

  // role constraints bundled in one object (for now, used for UI / future logic)
  const [roleConstraints, setRoleConstraints] = useState({
    minBatters: 6,
    maxBatters: 8,
    minBowlers: 6,
    maxBowlers: 8,
    minAllRounders: 2,
    maxAllRounders: 4,
    minWicketkeepers: 2,
    maxWicketkeepers: 3,
  });

  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);

  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [minOverseas, maxOverseas] = overseasRange;

  // Load squad from localStorage on mount (sync with Auction page / previous runs)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed: Player[] = JSON.parse(raw);
        setSelectedPlayers(parsed);
      }
    } catch (err) {
      console.error("Failed to load saved squad:", err);
    }
  }, []);

  // Persist squad to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(selectedPlayers));
    } catch (err) {
      console.error("Failed to persist squad:", err);
    }
  }, [selectedPlayers]);

  // derived summary values
  const totalPlayers = selectedPlayers.length;
  const overseasCount = selectedPlayers.filter((p) => p.isOverseas).length;
  const budgetUsed = selectedPlayers.reduce(
    (sum, p) => sum + (p.price || 0),
    0
  );
  const budgetLeft = Math.max(budget - budgetUsed, 0);

  const handleNumberChange = (
    key: keyof typeof roleConstraints,
    value: string
  ) => {
    const parsed = parseInt(value, 10);
    setRoleConstraints((prev) => ({
      ...prev,
      [key]: isNaN(parsed) ? 0 : parsed,
    }));
  };

  const mapRoleStringToKey = (role: string | null | undefined): Player["role"] => {
    const r = (role || "").toLowerCase();
    if (r.includes("bowl")) return "bowler";
    if (r.includes("all")) return "allrounder";
    if (r.includes("keep") || r.includes("wk")) return "wk";
    return "batter";
  };

  const handleSuggestPlayers = async () => {
    setLoadingSuggest(true);
    setError(null);

    try {
      // backend expects budget in raw units (INR); we keep budget in Cr in UI
      const totalPurseRaw = budget * 10_000_000; // 1 Cr = 1e7

      const params = new URLSearchParams({
        total_purse: String(totalPurseRaw),
        squad_size: String(teamSize),
        max_overseas: String(maxOverseas),
        min_overseas: String(minOverseas),
      });

      const res = await fetch(
        `${AUCTION_API_BASE}/squad/2025?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }
      const data = await res.json();

      const backendPlayers = data.players || [];

      const mapped: Player[] = backendPlayers.map(
        (p: any, idx: number): Player => {
          const roleKey = mapRoleStringToKey(p.role);
          const priceCr =
            p.predicted_price != null
              ? Number(p.predicted_price) / 10_000_000
              : 0;

          return {
            id: `${p.name || "player"}-${idx}`,
            name: String(p.name || "").trim(),
            role: roleKey,
            isOverseas: String(p.country_bucket || "") !== "Indian",
            price: priceCr,
          };
        }
      );

      setSelectedPlayers(mapped);
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || "Failed to get suggested players from backend"
      );
    } finally {
      setLoadingSuggest(false);
    }
  };

  const handleReset = () => {
    setTeamSize(25);
    setOverseasRange([2, 8]);
    setBudget(90);
    setRoleConstraints({
      minBatters: 6,
      maxBatters: 8,
      minBowlers: 6,
      maxBowlers: 8,
      minAllRounders: 2,
      maxAllRounders: 4,
      minWicketkeepers: 2,
      maxWicketkeepers: 3,
    });
    setSelectedPlayers([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-8">
        <div className="space-y-6">
          {/* Title + subtitle */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Fill Your Squad
            </h1>
            <p className="text-muted-foreground mt-2">
              Start with favorites from the Auction page or let the model
              suggest an optimized squad under your constraints.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: constraints + suggestions */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Squad Constraints</CardTitle>
                  <CardDescription>
                    Set your team requirements and budget
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Team size slider */}
                  <div className="space-y-2">
                    <Label>Team Size: {teamSize}</Label>
                    <Slider
                      value={[teamSize]}
                      max={25}
                      min={1}
                      step={1}
                      onValueChange={(val) => setTeamSize(val[0])}
                    />
                  </div>

                  {/* Overseas MIN slider */}
                  <div className="space-y-2">
                    <Label>Minimum Overseas: {minOverseas}</Label>
                    <Slider
                      value={[minOverseas]}
                      max={8}
                      min={0}
                      step={1}
                      onValueChange={(v) => {
                        const newMin = v[0];
                        setOverseasRange([
                          newMin,
                          Math.max(newMin, maxOverseas),
                        ]);
                      }}
                    />
                  </div>

                  {/* Overseas MAX slider */}
                  <div className="space-y-2">
                    <Label>Maximum Overseas: {maxOverseas}</Label>
                    <Slider
                      value={[maxOverseas]}
                      max={8}
                      min={0}
                      step={1}
                      onValueChange={(v) => {
                        const newMax = v[0];
                        setOverseasRange([
                          Math.min(minOverseas, newMax),
                          newMax,
                        ]);
                      }}
                    />
                  </div>

                  {/* Budget input */}
                  <div className="space-y-2">
                    <Label>Budget (Cr)</Label>
                    <Input
                      type="number"
                      value={budget}
                      onChange={(e) =>
                        setBudget(
                          e.target.value === "" ? 0 : Number(e.target.value)
                        )
                      }
                      placeholder="90"
                    />
                  </div>

                  {/* Role constraints */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Batters</Label>
                      <Input
                        type="number"
                        value={roleConstraints.minBatters}
                        onChange={(e) =>
                          handleNumberChange(
                            "minBatters",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Batters</Label>
                      <Input
                        type="number"
                        value={roleConstraints.maxBatters}
                        onChange={(e) =>
                          handleNumberChange(
                            "maxBatters",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Bowlers</Label>
                      <Input
                        type="number"
                        value={roleConstraints.minBowlers}
                        onChange={(e) =>
                          handleNumberChange(
                            "minBowlers",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Bowlers</Label>
                      <Input
                        type="number"
                        value={roleConstraints.maxBowlers}
                        onChange={(e) =>
                          handleNumberChange(
                            "maxBowlers",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Min All Rounders</Label>
                      <Input
                        type="number"
                        value={roleConstraints.minAllRounders}
                        onChange={(e) =>
                          handleNumberChange(
                            "minAllRounders",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max All Rounders</Label>
                      <Input
                        type="number"
                        value={roleConstraints.maxAllRounders}
                        onChange={(e) =>
                          handleNumberChange(
                            "maxAllRounders",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Wicketkeepers</Label>
                      <Input
                        type="number"
                        value={roleConstraints.minWicketkeepers}
                        onChange={(e) =>
                          handleNumberChange(
                            "minWicketkeepers",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Wicketkeepers</Label>
                      <Input
                        type="number"
                        value={roleConstraints.maxWicketkeepers}
                        onChange={(e) =>
                          handleNumberChange(
                            "maxWicketkeepers",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSuggestPlayers}
                    disabled={loadingSuggest}
                  >
                    {loadingSuggest
                      ? "Suggesting players..."
                      : "Suggest Players"}
                  </Button>
                </CardContent>
              </Card>

              {/* Suggested Players */}
              <Card>
                <CardHeader>
                  <CardTitle>Suggested Players</CardTitle>
                  <CardDescription>
                    Based on your constraints and backend model
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedPlayers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      Set constraints and click &quot;Suggest Players&quot; to
                      see recommendations, or add players from the Auction page.
                    </p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                      {selectedPlayers.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 shadow-sm"
                        >
                          <div>
                            <div className="font-semibold text-foreground">
                              {p.name}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                              <span className="px-2 py-0.5 rounded-full border border-border uppercase tracking-wide">
                                {p.role}
                              </span>
                              <span className="px-2 py-0.5 rounded-full border border-border">
                                {p.isOverseas ? "Overseas" : "Indian"}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-primary whitespace-nowrap">
                            ₹{p.price.toFixed(2)} Cr
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Summary + controls */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Squad Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Players</span>
                    <span className="font-semibold">
                      {totalPlayers} / {teamSize}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overseas</span>
                    <span className="font-semibold">
                      {overseasCount} / {maxOverseas}{" "}
                      <span className="text-xs text-muted-foreground">
                        (Min {minOverseas})
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget Used</span>
                    <span className="font-semibold">
                      ₹{budgetUsed.toFixed(2)} Cr
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget Left</span>
                    <span className="font-semibold text-primary">
                      ₹{budgetLeft.toFixed(2)} Cr
                    </span>
                  </div>
                  <div className="pt-4 space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleReset}
                    >
                      Reset
                    </Button>
                    <Button variant="secondary" className="w-full">
                      Save Squad
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SquadBuilder;
