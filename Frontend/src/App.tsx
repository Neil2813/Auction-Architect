import gsap from "gsap";
import { ScrollTrigger, SplitText } from "gsap/all";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";


import Landing from "./pages/Landing";
import Auction from "./pages/Auction";
import SquadBuilder from "./pages/SquadBuilder";
import BestXI from "./pages/BestXI";
import Analytics from "./pages/Analytics";
import Insights from "./pages/Insights";

import About from "./pages/About";
import NotFound from "./pages/NotFound";

gsap.registerPlugin(ScrollTrigger, SplitText);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auction" element={<Auction />} />
            <Route path="/squad-builder" element={<SquadBuilder />} />
            <Route path="/best-xi" element={<BestXI />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
  </QueryClientProvider>
);

export default App;
