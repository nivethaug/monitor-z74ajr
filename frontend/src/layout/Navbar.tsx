import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Activity, Server, ServerCog, Container, Menu, X, RefreshCw, LogOut, Clock, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMetrics, logout } from "@/lib/metrics-context";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Server;
  testId: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Main VPS", icon: Server, testId: "navbar-link-mainvps" },
  { to: "/workervps", label: "Worker VPS", icon: ServerCog, testId: "navbar-link-workervps" },
  { to: "/dockerfleet", label: "Docker Fleet", icon: Container, testId: "navbar-link-dockerfleet" },
  { to: "/inframonitor", label: "Infra Monitor", icon: Activity, testId: "navbar-link-inframonitor" },
  { to: "/webterminal", label: "Web Terminal", icon: TerminalSquare, testId: "navbar-link-webterminal" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { loading, error, lastUpdated, autoRefresh, setAutoRefresh, refresh, data } = useMetrics();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <nav aria-label="Main navigation" className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Activity className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <span className="font-semibold text-slate-100 hidden sm:inline">DreamAgent Monitor</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1" data-testid="navbar-desktop">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                data-testid={item.testId}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                  }`
                }
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span
              className="hidden lg:flex items-center gap-1 text-xs text-slate-500 font-mono"
              data-testid="navbar-last-updated"
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              {lastUpdated}
            </span>
          )}

          <label
            className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none px-2 py-1 rounded-md hover:bg-slate-800/50"
            data-testid="navbar-autorefresh-toggle"
          >
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-3.5 w-3.5 accent-blue-500"
              aria-label="Toggle auto refresh every 30 seconds"
            />
            Auto
          </label>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            disabled={loading}
            data-testid="navbar-refresh-button"
            className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            <span className="hidden sm:inline">{loading ? "Refreshing..." : "Refresh"}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            data-testid="navbar-logout-button"
            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Logout</span>
          </Button>

          {/* Mobile toggle */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
            data-testid="sidebar-toggle-button"
            className="md:hidden p-2 rounded-md text-slate-300 hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {error && data && (
        <div className="px-4 py-1.5 bg-red-500/10 border-t border-red-500/30 text-xs text-red-300" data-testid="navbar-error-banner">
          Last refresh failed — showing previous data. {error}
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950" data-testid="navbar-mobile">
          <div className="flex flex-col p-2 gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setMobileOpen(false)}
                  data-testid={`mobile-${item.testId}`}
                  className={`flex items-center gap-2 px-3 py-3 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                    active ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
            <label className="flex items-center gap-2 px-3 py-3 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 accent-blue-500"
              />
              Auto-refresh (30s)
            </label>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
