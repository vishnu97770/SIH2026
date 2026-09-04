import { NavLink, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { Icon } from "./Icon";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/assistant", label: "AI Mining Assistant", icon: "assistant" },
  { to: "/production", label: "Production Intelligence", icon: "production" },
  { to: "/anomalies", label: "Anomaly Detection", icon: "orange" },
  { to: "/forecast", label: "Production Forecast", icon: "trend" },
  { to: "/geology", label: "Geological & Map", icon: "geology" },
  { to: "/reports", label: "Intelligence Reports", icon: "reports" },
  { to: "/documents", label: "Documents", icon: "documents" },
];

export function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={`flex h-full flex-col bg-stone-900 text-stone-300 transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className={`flex items-center border-b border-stone-800 ${collapsed ? "justify-center px-2" : "px-4"} h-16`}>
        <Logo collapsed={collapsed} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-stone-400 hover:bg-stone-800 hover:text-white"
              }`
            }
          >
            <Icon name={item.icon} className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-stone-800 px-3 py-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-semibold text-white">
            {user?.name?.[0] ?? "U"}
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-medium text-white">{user?.name ?? "User"}</div>
              <div className="truncate text-xs text-stone-400">{user?.email ?? ""}</div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-stone-400 transition-colors hover:bg-stone-800 hover:text-white ${
            collapsed ? "w-full justify-center" : "w-full"
          }`}
        >
          <Icon name="logout" className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      <button
        onClick={onToggle}
        className="hidden items-center justify-center gap-2 border-t border-stone-800 px-3 py-2 text-sm text-stone-400 hover:bg-stone-800 hover:text-white lg:flex"
      >
        <Icon name={collapsed ? "expand" : "collapse"} className="h-4 w-4" />
        {!collapsed && "Collapse"}
      </button>
    </aside>
  );
}
