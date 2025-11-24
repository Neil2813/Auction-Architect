"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type ScoreMode = "live" | "last";

const IPL_TEAMS = [
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

const Insights = () => {
  const [scoreMode, setScoreMode] = useState<ScoreMode>("live");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-8">
        <div className="space-y-6">
          {/* Header row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Match Center
              </h1>
              <p className="text-muted-foreground mt-2">
                Live scores and team-wise fixtures for the latest IPL action
              </p>
            </div>
          </div>

          {/* SECTION 1: Live / Last Match Score */}
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Scores</CardTitle>
                <CardDescription>
                  View live score or last IPL match score
                </CardDescription>
              </div>

              {/* Toggle buttons for Live vs Last */}
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                <Button
                  type="button"
                  variant={scoreMode === "live" ? "default" : "ghost"}
                  className="rounded-none"
                  onClick={() => setScoreMode("live")}
                >
                  Live Score
                </Button>
                <Button
                  type="button"
                  variant={scoreMode === "last" ? "default" : "ghost"}
                  className="rounded-none border-l border-border"
                  onClick={() => setScoreMode("last")}
                >
                  Last IPL Match
                </Button>
              </div>
            </CardHeader>

            <CardContent className="h-56 flex flex-col items-center justify-center text-center space-y-3">
              {scoreMode === "live" ? (
                <>
                  <p className="text-lg font-semibold text-foreground">
                    Live score will appear here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Connect this section to your live-score API to show real-time updates.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-foreground">
                    Last IPL match score will appear here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Fetch details of the most recent IPL match from your backend and render it here.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* SECTION 2: Team-wise Fixtures */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-foreground">
                Team-wise Fixtures
              </h2>
              <p className="text-xs text-muted-foreground">
                Previous match & next match for each team (scores only, no stats)
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {IPL_TEAMS.map((team) => (
                <Card key={team} className="h-full">
                  <CardHeader>
                    <CardTitle className="text-base leading-snug">
                      {team}
                    </CardTitle>
                    <CardDescription>Fixtures & scores</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        Previous Match
                      </p>
                      <p className="mt-1">
                        {/* hook this to backend: last completed match score */}
                        Score: <span className="text-muted-foreground">-- / --</span>
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        Upcoming Match
                      </p>
                      <p className="mt-1">
                        {/* hook this to backend: upcoming fixture + predicted / last known score placeholder */}
                        Opponent & venue:{" "}
                        <span className="text-muted-foreground">TBD</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Insights;
