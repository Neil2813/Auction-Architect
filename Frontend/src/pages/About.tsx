import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">About & Help</h1>
            <p className="text-muted-foreground mt-2">
              Learn more about The Auction Architect
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>About The Auction Architect</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="text-muted-foreground">
                The Auction Architect is your ultimate companion for IPL auction predictions and squad building. 
                Our platform uses advanced analytics to help you predict player prices, build optimal squads, 
                and select the best playing XI based on match conditions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Common questions about IPL auctions and our app</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How do auction predictions work?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    When you set constraints (team size, minimum bowlers, overseas rules, etc.), they’re sent directly to the backend.
The backend runs a constraint-aware algorithm that filters players, ranks them by efficiency, and selects the best squad under your budget similar to how teams run pre-auction simulations.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-2">
                  <AccordionTrigger>How does Squad Builder Works?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    The Squad Builder takes the budget and rules you set like total team size, overseas limits, and role balance and finds the most efficient squad you can build for the 2025 season.

When you hit “Suggest Players”, the app sends your constraints to our backend engine. The system already knows every player’s predicted auction price, impact score, and efficiency rating.

It filters players who fit your conditions, ranks them based on value and performance, and then selects the strongest possible combination without breaking your budget or overseas limits.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-3">
                  <AccordionTrigger>How does the Best XI selector work?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    The Best XI engine uses: <br/>

Venue-based pitch profiling <br/>

Toss decision impact <br/>

ML-driven role scoring <br/>
Team composition rules <br/>

Credit-weighted impact player calculation <br/>

It merges your selected team context with real model outputs to generate a match-ready lineup.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger>What do we use?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We process a combined dataset of auction history, season statistics, batting/bowling breakdowns, and context-driven features.
Every prediction runs live — no cached or fixed results.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact & Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">Email Support</p>
                <p className="text-sm text-muted-foreground">support@auctionarchitect.com</p>
              </div>
              <div>
                <p className="font-medium">Feature Requests</p>
                <p className="text-sm text-muted-foreground">feedback@auctionarchitect.com</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy & Terms</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="text-muted-foreground">
                We respect your privacy and are committed to protecting your personal data. 
                All predictions and squad data are stored securely and are never shared with third parties.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default About;
