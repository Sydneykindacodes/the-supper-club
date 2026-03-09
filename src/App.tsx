import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div style={{ fontFamily: "'Montserrat', sans-serif", background: "#242424", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div style={{ fontSize: "11px", color: "#d4cdc4", letterSpacing: "4px", textTransform: "uppercase" }}>Loading</div>
          <div style={{ width: "40px", height: "2px", background: "rgba(212,205,196,0.3)", borderRadius: "1px", overflow: "hidden", position: "relative" }}>
            <div style={{ width: "20px", height: "2px", background: "#d4cdc4", borderRadius: "1px", animation: "slide 1s ease-in-out infinite alternate" }} />
          </div>
        </div>
        <style>{`@keyframes slide { from { transform: translateX(0); } to { transform: translateX(20px); } }`}</style>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/" element={user ? <Index user={user} signOut={signOut} /> : <Navigate to="/auth" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;