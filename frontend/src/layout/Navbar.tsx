import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Container,
  Boxes,
  HardDrive,
  Settings,
  RefreshCw,
  LogOut,
  Server,
  ServerCog,
} from "lucide-react";
import { useMetrics } from "@/lib/metrics-context";

/**
 * BottomNavigation — sticky mobile-first tab bar.
 * Icon-only on small screens with a 64px tall, safe-area-aware bar.
 */
const BottomNavigation = () => {
  const location = useLocation();
  const { refresh, loading } = useMetrics();

  const handleLogout = () => {
    localStorage.removeItem('monitor_token');
    window.location.href = '/login';
  };

  const items = [
    { to: "/", label: "Overview", Icon: LayoutGrid, match: ["/", "/workervps"] },
    { to: "/dockerfleet", label: "Containers", Icon: Container, match: ["/dockerfleet"] },
    { to: "/inframonitor", label: "Processes", Icon: Boxes, match: ["/inframonitor"] },
    { to: "/webterminal", label: "Storage", Icon: HardDrive, match: ["/webterminal"] },
    { to: "#logout", label: "Logout", Icon: LogOut, match: ["#logout"], action: handleLogout },
  ];

  return (
    <nav
      className="bottom-nav fixed inset-x-0 bottom-0 z-40 pb-safe"
      aria-label="Primary"
      data-testid="bottom-nav"
    >
      <div className="mx-auto max-w-md px-3">
        <ul className="flex items-center justify-between h-16">
          {items.map(({ to, label, Icon, match, action }) => {
            const active = match.some((m) =>
              m === "/" ? location.pathname === "/" : location.pathname.startsWith(m)
            );
            return (
              <li key={label} className="flex-1">
                {action ? (
                  <button
                    onClick={action}
                    className="bottom-nav-item w-full"
                    aria-label={label}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span className="leading-none">{label}</span>
                  </button>
                ) : (
                  <NavLink
                    to={to}
                    className={`bottom-nav-item ${active ? "active" : ""}`}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span className="leading-none">{label}</span>
                  </NavLink>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default BottomNavigation;
