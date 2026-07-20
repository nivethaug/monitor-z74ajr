import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

/**
 * Layout component - Main application layout wrapper
 *
 * Provides the base structure for all pages using React Router nested routes.
 * Pages render inside the <Outlet /> component.
 */
const Layout = () => {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-950">
      <Navbar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
