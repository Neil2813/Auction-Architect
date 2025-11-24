"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

const AUCTION_API_BASE =
  import.meta.env.VITE_AUCTION_API_URL || "http://localhost:8001";

type RoleKey = "batter" | "bowler" | "allrounder" | "wk";

type AuctionPlayer = {
  id: string;
  name: string;
  role: RoleKey;
  countryBucket: string;
  predictedPriceCr: number | null;
};

const mapRoleStringToKey = (role: string | null | undefined): RoleKey => {
  const r = (role || "").toLowerCase();
  if (r.includes("bowl")) return "bowler";
  if (r.includes("all")) return "allrounder";
  if (r.includes("keep") || r.includes("wk")) return "wk";
  return "batter";
};

const Auction = () => {
  const [players, setPlayers] = useState<AuctionPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [roleFilter, setRoleFilter] = useState<"all" | RoleKey>("all");
  const [natFilter, setNatFilter] = useState<"all" | "india" | "overseas">(
    "all"
  );
  const [search, setSearch] = useState("");

  // load players on mount
  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${AUCTION_API_BASE}/players/2025/table`);
        if (!res.ok) {
          throw new Error(`API error ${res.status}`);
        }
        const data = await res.json();

        const mapped: AuctionPlayer[] = (data.players || []).map(
          (p: any, idx: number) => {
            const roleKey = mapRoleStringToKey(p.role);
            return {
              id: `${p.name || "player"}-${idx}`,
              name: String(p.name || "").trim(),
              role: roleKey,
              countryBucket: String(p.country_bucket || ""),
              predictedPriceCr:
                typeof p.predicted_price_cr === "number"
                  ? p.predicted_price_cr
                  : p.predicted_price_cr != null
                  ? Number(p.predicted_price_cr)
                  : null,
            };
          }
        );

        setPlayers(mapped);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load players");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  // derived filtered list
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (roleFilter !== "all" && p.role !== roleFilter) return false;

      if (natFilter === "india" && p.countryBucket !== "Indian") return false;
      if (natFilter === "overseas" && p.countryBucket !== "Overseas")
        return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [players, roleFilter, natFilter, search]);

  const formatCr = (val: number | null | undefined) => {
    if (val == null || isNaN(val)) return "-";
    return val.toFixed(2);
  };

  const handleDownloadCsv = () => {
    const rows = [
      ["Player Name", "Role", "Nationality", "Predicted Price (Cr)"],
      ...filteredPlayers.map((p) => [
        p.name,
        p.role.toUpperCase(),
        p.countryBucket,
        formatCr(p.predictedPriceCr),
      ]),
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "auction_predictions_2025.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-8">
        <div className="space-y-6">
          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Predict Auction Prices
            </h1>
            <p className="text-muted-foreground mt-2">
              Live model predictions for the 2025 auction. Filter and search
              through all players and their predicted auction value.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <Select
              value={roleFilter}
              onValueChange={(v) =>
                setRoleFilter(v as "all" | RoleKey)
              }
            >
              <SelectTrigger className="w-full md:w-[200px]">
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
              onValueChange={(v) =>
                setNatFilter(v as "all" | "india" | "overseas")
              }
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Nationality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="india">India</SelectItem>
                <SelectItem value="overseas">Overseas</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search player..."
              className="flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDownloadCsv}>
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Predicted Price (Cr)</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-8"
                    >
                      Loading predictions…
                    </TableCell>
                  </TableRow>
                )}

                {error && !loading && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-destructive py-8"
                    >
                      {error}
                    </TableCell>
                  </TableRow>
                )}

                {!loading && !error && filteredPlayers.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-8"
                    >
                      No players match your filters.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  !error &&
                  filteredPlayers.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="capitalize">
                        {p.role}
                      </TableCell>
                      <TableCell>{p.countryBucket}</TableCell>
                      <TableCell className="font-medium">
                        {formatCr(p.predictedPriceCr)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auction;
