import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./layout/Layout";
import Mainvps from "./pages/Mainvps";
import Workervps from "./pages/Workervps";
import Dockerfleet from "./pages/Dockerfleet";
import Inframonitor from "./pages/Inframonitor";
import Webterminal from "./pages/Webterminal";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="p-6 text-slate-400">Loading...</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Mainvps />} />
              <Route path="/workervps" element={<Workervps />} />
              <Route path="/dockerfleet" element={<Dockerfleet />} />
              <Route path="/inframonitor" element={<Inframonitor />} />
              <Route path="/webterminal" element={<Webterminal />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
