"use client";

import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";

const VENUES = [
  "Arun Jaitley Stadium (formerly Feroz Shah Kotla), Delhi",
  "Barabati Stadium, Cuttack",
  "Barsapara Cricket Stadium, Guwahati",
  "Brabourne Stadium, Mumbai",
  "BRSABV Ekana Cricket Stadium, Lucknow",
  "Dr YS Rajasekhara Reddy ACA-VDCA Cricket Stadium, Visakhapatnam",
  "Dr DY Patil Sports Academy, Mumbai (Navi Mumbai)",
  "Eden Gardens, Kolkata",
  "Green Park, Kanpur",
  "Himachal Pradesh Cricket Association Stadium, Dharamsala",
  "Holkar Cricket Stadium, Indore",
  "JSCA International Stadium Complex, Ranchi",
  "M Chinnaswamy Stadium, Bengaluru",
  "MA Chidambaram Stadium, Chennai",
  "Maharaja Yadavindra Singh International Cricket Stadium, Mullanpur (New Chandigarh)",
  "Maharashtra Cricket Association Stadium, Pune",
  "Narendra Modi Stadium (formerly Sardar Vallabhbhai Patel Stadium), Ahmedabad",
  "Nehru Stadium, Kochi",
  "Punjab Cricket Association IS Bindra Stadium (formerly PCA Stadium), Mohali",
  "Rajiv Gandhi International Stadium, Hyderabad",
  "Saurashtra Cricket Association Stadium (also Niranjan Shah Stadium), Rajkot",
  "Sawai Mansingh Stadium, Jaipur",
  "Shaheed Veer Narayan Sing International Stadium, Raipur",
  "Vidarbha Cricket Association Stadium, Nagpur",
  "Wankhede Stadium, Mumbai",
  "Buffalo Park, East London",
  "Diamond Oval, Kimberley",
  "Dubai International Cricket Stadium, Dubai",
  "Sharjah Cricket Association Stadium, Sharjah",
  "Sheikh Zayed Cricket Stadium, Abu Dhabi",
  "Kingsmead, Durban",
  "Mangaung Oval, Bloemfontein",
  "Newlands, Cape Town",
  "St George's Park, Port Elizabeth",
  "SuperSport Park, Centurion",
  "Wanderers Stadium, Johannesburg",
];

const TEAMS = [
  "Chennai Super Kings",
  "Delhi Capitals",
  "Gujarat Titans",
  "Kolkata Knight Riders",
  "Lucknow Super Giants",
  "Mumbai Indians",
  "Punjab Kings",
  "Rajasthan Royals",
  "Royal Challengers Bengaluru",
  "Sunrisers Hyderabad",
];

// Map display name → team_code expected by backend
const TEAM_CODE_MAP: Record<string, string> = {
  "Chennai Super Kings": "CSK",
  "Delhi Capitals": "DC",
  "Gujarat Titans": "GT",
  "Kolkata Knight Riders": "KKR",
  "Lucknow Super Giants": "LSG",
  "Mumbai Indians": "MI",
  "Punjab Kings": "PBKS",
  "Rajasthan Royals": "RR",
  "Royal Challengers Bengaluru": "RCB",
  "Sunrisers Hyderabad": "SRH",
};

const XI_API_BASE =
  import.meta.env.VITE_XI_API_URL || "http://localhost:8002";

type XIPlayer = {
  name: string;
  country: string;
  role: string;
  final_score: number;
};

const BestXI = () => {
  const [myTeam, setMyTeam] = useState<string>("");
  const [opponentTeam, setOpponentTeam] = useState<string>("");
  const [venue, setVenue] = useState<string>("");
  const [pitchCondition, setPitchCondition] = useState<string>("");
  const [tossDecision, setTossDecision] = useState<string>("");
  const [maxOverseas, setMaxOverseas] = useState<number>(4);

  const [loadingXI, setLoadingXI] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [playingXI, setPlayingXI] = useState<XIPlayer[]>([]);
  const [impactPlayer, setImpactPlayer] = useState<XIPlayer | null>(null);
  const [pitchData, setPitchData] = useState<{
    pitch_type?: string;
    pitch_notes?: string;
  } | null>(null);

  const teamBalance = useMemo(() => {
    let batters = 0;
    let bowlers = 0;
    let allrounders = 0;
    let keepers = 0;
    let overseas = 0;

    for (const p of playingXI) {
      const role = p.role.toLowerCase();
      if (role.includes("wicket") || role.includes("keeper") || role === "wk") {
        keepers += 1;
      } else if (role.includes("all")) {
        allrounders += 1;
      } else if (role.includes("bowl")) {
        bowlers += 1;
      } else {
        batters += 1;
      }

      if (p.country && p.country.toLowerCase() !== "india") {
        overseas += 1;
      }
    }

    return { batters, bowlers, allrounders, keepers, overseas };
  }, [playingXI]);

  const handleSelectBestXI = async () => {
    setError(null);

    if (!myTeam) {
      setError("Select your team first.");
      return;
    }

    const teamCode = TEAM_CODE_MAP[myTeam] || myTeam;

    setLoadingXI(true);
    try {
      const payload = {
        team_code: teamCode,
        venue: venue || "chepauk", // backend supports partials; defaulting if empty
        toss_decision: (tossDecision || "bat").toLowerCase(),
      };

      const res = await fetch(`${XI_API_BASE}/predict-xi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `API error ${res.status}`);
      }

      const data = await res.json();

      setPlayingXI(data.starting_xi || []);
      setImpactPlayer(data.impact_player || null);
      setPitchData({
        pitch_type: data.pitch_type,
        pitch_notes: data.pitch_notes,
      });
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate Best XI. Check backend & inputs.");
      setPlayingXI([]);
      setImpactPlayer(null);
      setPitchData(null);
    } finally {
      setLoadingXI(false);
    }
  };

  const handleExport = () => {
    if (!playingXI.length) return;

    const rows = [
      ["#",
        "Player",
        "Country",
        "Role",
        "Final Score"],
      ...playingXI.map((p, idx) => [
        idx + 1,
        p.name,
        p.country,
        p.role,
        p.final_score.toFixed(2),
      ]),
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "best_xi.csv";
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
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Build Your Best Playing XI
            </h1>
            <p className="text-muted-foreground mt-2">
              Use the ML-powered engine to generate the best XI and an impact
              player for your team.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* LEFT: Context + Generate */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Match Context</CardTitle>
                  <CardDescription>
                    Set venue, opponent, and conditions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Venue</Label>
                    <Select value={venue} onValueChange={setVenue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select venue" />
                      </SelectTrigger>
                      <SelectContent>
                        {VENUES.map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Pitch Condition (UI only)</Label>
                    <Select
                      value={pitchCondition}
                      onValueChange={setPitchCondition}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pitch type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="batting">Batting Friendly</SelectItem>
                        <SelectItem value="bowling">Bowling Friendly</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* My Team + Opponent dropdowns */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>My Team</Label>
                      <Select value={myTeam} onValueChange={setMyTeam}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your team" />
                        </SelectTrigger>
                        <SelectContent>
                          {TEAMS.map((team) => (
                            <SelectItem key={team} value={team}>
                              {team}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Opponent Team (visual only)</Label>
                      <Select
                        value={opponentTeam}
                        onValueChange={setOpponentTeam}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select opponent" />
                        </SelectTrigger>
                        <SelectContent>
                          {TEAMS.map((team) => (
                            <SelectItem
                              key={team}
                              value={team}
                              disabled={team === myTeam}
                            >
                              {team}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Toss Decision</Label>
                    <Select
                      value={tossDecision}
                      onValueChange={setTossDecision}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select decision" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bat">Bat First</SelectItem>
                        <SelectItem value="bowl">Bowl First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Overseas in XI (UI only)</Label>
                    <Input
                      type="number"
                      value={maxOverseas}
                      min={0}
                      max={4}
                      onChange={(e) =>
                        setMaxOverseas(
                          e.target.value === ""
                            ? 0
                            : Math.min(4, Math.max(0, Number(e.target.value)))
                        )
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Current model enforces its own constraints; this is for
                      display and future validation.
                    </p>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSelectBestXI}
                    disabled={loadingXI}
                  >
                    {loadingXI ? "Selecting Best XI…" : "Select Best XI"}
                  </Button>
                </CardContent>
              </Card>

              {/* Playing XI display */}
              <Card>
                <CardHeader>
                  <CardTitle>Playing XI</CardTitle>
                  <CardDescription>Your optimized lineup</CardDescription>
                </CardHeader>
                <CardContent>
                  {pitchData && (
                    <div className="mb-4 text-xs text-muted-foreground space-y-1">
                      <p>
                        <span className="font-semibold">Pitch type:</span>{" "}
                        {pitchData.pitch_type || "N/A"}
                      </p>
                      {pitchData.pitch_notes && (
                        <p>{pitchData.pitch_notes}</p>
                      )}
                    </div>
                  )}

                  {playingXI.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Set match context and click &quot;Select Best XI&quot; to
                      generate lineup.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {playingXI.map((p, idx) => (
                        <div
                          key={`${p.name}-${idx}`}
                          className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 shadow-sm"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">
                                {idx + 1}. {p.name}
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full border border-border uppercase tracking-wide text-muted-foreground">
                                {p.role}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {p.country}
                            </p>
                          </div>
                          <div className="text-sm font-semibold text-primary whitespace-nowrap">
                            Score: {p.final_score.toFixed(2)}
                          </div>
                        </div>
                      ))}

                      {impactPlayer && (
                        <div className="mt-4 rounded-lg border border-yellow-500/40 bg-yellow-500/5 px-3 py-3">
                          <p className="text-xs font-semibold text-yellow-300 mb-1">
                            Impact Player
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {impactPlayer.name}{" "}
                            <span className="text-[11px] ml-2 px-2 py-0.5 rounded-full border border-border uppercase tracking-wide text-muted-foreground">
                              {impactPlayer.role}
                            </span>
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {impactPlayer.country} · Score{" "}
                            {impactPlayer.final_score.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: Team balance + leadership + export */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Balance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Batters</span>
                    <span className="font-semibold">
                      {teamBalance.batters}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bowlers</span>
                    <span className="font-semibold">
                      {teamBalance.bowlers}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      All Rounders
                    </span>
                    <span className="font-semibold">
                      {teamBalance.allrounders}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overseas</span>
                    <span className="font-semibold">
                     {maxOverseas} / {teamBalance.overseas} 
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleExport}
                disabled={!playingXI.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Export as CSV
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BestXI;
