import React, { useEffect, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
} from "react-router-dom";
import {
  Activity,
  Bell,
  CircleDollarSign,
  FileText,
  Globe,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Smartphone,
  Sun,
  Users,
  Webhook,
  X,
  Zap,
  CreditCard,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";

/* ──── Auth helpers (mirror main.tsx) ──── */
function getToken(): string | null {
  return localStorage.getItem("zi-pay-token");
}
function getUser() {
  try {
    const raw = localStorage.getItem("zi-pay-user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function setUser(u: {
  name: string;
  email: string;
  role: string;
  avatar?: string;
}) {
  localStorage.setItem("zi-pay-user", JSON.stringify(u));
}
function clearToken() {
  localStorage.removeItem("zi-pay-token");
  localStorage.removeItem("zi-pay-refresh");
  localStorage.removeItem("zi-pay-user");
}

const RAW_API = import.meta.env.VITE_API_URL || "";
const API_URL = RAW_API.replace(/\/api\/?$/, "");

/* ──── Navigation ──── */
type NavItem = { label: string; to: string; icon: LucideIcon };

const adminNav: NavItem[] = [
  { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Transactions", to: "/admin/transactions", icon: CreditCard },
  { label: "Payments", to: "/admin/payments", icon: Globe },
  { label: "Orders", to: "/admin/orders", icon: FileText },
  { label: "Customers", to: "/admin/customers", icon: Users },
  {
    label: "Payment Methods",
    to: "/admin/payment-methods",
    icon: CircleDollarSign,
  },
  { label: "Refunds", to: "/admin/refunds", icon: RefreshCw },
  { label: "Reconciliation", to: "/admin/reconciliation", icon: Activity },
  { label: "API Keys", to: "/admin/api-keys", icon: KeyRound },
  { label: "Notifications", to: "/admin/notifications", icon: Bell },
  { label: "Security", to: "/admin/security", icon: ShieldCheck },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: Shield },
  {
    label: "System Health",
    to: "/admin/system-health",
    icon: Smartphone,
  },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Zap size={16} fill="currentColor" />
      </div>
      <div>
        <strong>ZI PREMIUM SERVICES</strong>
        <span>Payment Gateway</span>
      </div>
    </div>
  );
}

/* ──── Sidebar ──── */
function Sidebar({
  collapsed,
  close,
}: {
  collapsed: boolean;
  close?: () => void;
}) {
  const storedUser = getUser();
  const handleLogout = () => {
    clearToken();
    window.location.href = "/admin/login";
  };
  const displayName =
    storedUser?.name || storedUser?.email || "Admin";
  const initials =
    displayName
      .replace(/[^A-Za-z0-9 ]/g, "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p: string) => p[0].toUpperCase())
      .join("") || "A";

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="side-top">
        <Brand />
        <button className="icon-btn mobile-close" onClick={close}>
          <X size={18} />
        </button>
      </div>
      <div className="workspace">
        <div className="workspace-avatar">{initials[0]}</div>
        <div>
          <strong>ZI Pay</strong>
          <small>Business workspace</small>
        </div>
        <ChevronDown size={15} />
      </div>
      <nav className="nav">
        {adminNav.map(({ label, to, icon: I }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/admin/dashboard"}
            onClick={close}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <I size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="nav-bottom">
        <NavLink
          to="/admin/settings"
          onClick={close}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
        <a href="#support">
          <LifeBuoy size={18} />
          <span>Support center</span>
        </a>
      </div>
      <div className="user-card">
        {storedUser?.avatar ? (
          <img
            className="avatar avatar-img"
            src={storedUser.avatar}
            alt={displayName}
          />
        ) : (
          <div className="avatar">{initials}</div>
        )}
        <div>
          <strong>{displayName}</strong>
          <small>
            {storedUser?.role
              ? storedUser.role.charAt(0).toUpperCase() +
                storedUser.role.slice(1).replace(/_/g, " ")
              : "Admin"}
          </small>
        </div>
        <button className="icon-btn" title="Logout" onClick={handleLogout}>
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  );
}

/* ──── Header ──── */
function Header({
  onMenu,
  dark,
  setDark,
}: {
  onMenu: () => void;
  dark: boolean;
  setDark: (v: boolean) => void;
}) {
  const location = useLocation();
  const title =
    location.pathname === "/admin/dashboard"
      ? "Dashboard"
      : adminNav.find((n) => n.to === location.pathname)?.label || "Workspace";

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn menu-btn" onClick={onMenu}>
          <Menu size={20} />
        </button>
        <div>
          <span className="eyebrow">Workspace / ZI Pay</span>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="top-actions">
        <div className="search">
          <Search size={16} />
          <input placeholder="Search anything..." />
          <kbd>⌘ K</kbd>
        </div>
        <button
          className="icon-btn"
          onClick={() => setDark(!dark)}
          aria-label="Toggle theme"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="icon-btn notification">
          <Bell size={18} />
          <i />
        </button>
        <div className="header-avatar">ZA</div>
      </div>
    </header>
  );
}

/* ──── Admin Layout (matches original structure exactly) ──── */
export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(true);

  /* Hydrate user data from /api/auth/me on mount */
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (data?.success && data?.data?.user) setUser(data.data.user);
      })
      .catch(() => {
        /* keep whatever was in localStorage */
      });
  }, []);

  return (
    <div className={`app ${dark ? "dark" : "light"}`}>
      <Sidebar collapsed={sidebarOpen} close={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div
          className="scrim"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="main">
        <Header
          onMenu={() => setSidebarOpen((v) => !v)}
          dark={dark}
          setDark={setDark}
        />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
