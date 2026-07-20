import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { MetricsProvider } from "@/lib/metrics-context";

/**
 * Layout component - Main application layout wrapper
 *
 * Provides the base structure for all pages using React Router
 * nested routes via <Outlet />.
 */
const Layout = () => {
  return (
    <MetricsProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Navbar />
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </MetricsProvider>
  );
};

export default Layout;
