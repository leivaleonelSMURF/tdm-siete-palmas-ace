import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Rankings from "./pages/Rankings";
import PlayerProfile from "./pages/PlayerProfile";
import Tournaments from "./pages/Tournaments";
import TournamentDetail from "./pages/TournamentDetail";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import Challenges from "./pages/Challenges";
import Register from "./pages/Register";
import Rules from "./pages/Rules";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/jugador/:id" element={<PlayerProfile />} />
          <Route path="/torneos" element={<Tournaments />} />
          <Route path="/torneo/:id" element={<TournamentDetail />} />
          <Route path="/noticias" element={<News />} />
          <Route path="/noticia/:id" element={<NewsDetail />} />
          <Route path="/desafios" element={<Challenges />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/reglas" element={<Rules />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
