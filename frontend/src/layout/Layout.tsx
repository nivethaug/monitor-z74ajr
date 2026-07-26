import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { MetricsProvider } from "@/lib/metrics-context";

/**
 * Layout — mobile-first shell.
 * - Dark app background (#090B14)
 * - Sticky bottom navigation (64px + safe area)
 * - Content padding prevents bottom-nav overlap
 */
const Layout = () => {
  return (
    <MetricsProvider>
      <div className="app-bg min-h-screen text-slate-100">
        <main className="w-full max-w-md mx-auto px-4 pt-3 pb-28 page-enter md:max-w-none md:mx-0 md:px-6 md:pt-5 md:pb-32">
          <Outlet />
        </main>
        <Navbar />
      </div>
    </MetricsProvider>
  );
};

export default Layout;
