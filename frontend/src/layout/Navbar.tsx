import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Activity, Server, ServerCog, Container, Menu, X } from "lucide-react";

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
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

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
      </nav>

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
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
