import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Bell, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, CircleDollarSign, Copy, Clock, CreditCard, ExternalLink, FileText, Globe, Info, KeyRound, LayoutDashboard, LifeBuoy, Lock, LogOut, Menu, Moon, MoreHorizontal, Palette, Phone, PhoneCall, Plus, QrCode, Search, Settings, Shield, ShieldCheck, Smartphone, Sun, Users, Webhook, Wifi, WifiOff, X, Zap, Activity, GripVertical } from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import "./styles.css";
import "./invoice.css";

/**
 * Strip a trailing /api suffix from VITE_API_URL so callers can use either
 *   VITE_API_URL=https://pay.zipremiumservices.com/api
 * or
 *   VITE_API_URL=https://pay.zipremiumservices.com
 * and the fetch calls below (which prepend /api/...) still work.
 */
const RAW_API = import.meta.env.VITE_API_URL || "";
const API_URL = RAW_API.replace(/\/api\/?$/, "");
const MAIN_SITE_URL = import.meta.env.VITE_MAIN_SITE_URL || "";

type Icon = React.ComponentType<{ size?: number; strokeWidth?: number }>;

type AdminNavItem = { label: string; to: string; icon: Icon };

const adminNav: AdminNavItem[] = [
  { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Transactions", to: "/admin/transactions", icon: CreditCard },
  { label: "Payment requests", to: "/admin/requests", icon: FileText },
  { label: "Pay settings", to: "/admin/pay-settings", icon: Palette },
  { label: "Devices", to: "/admin/devices", icon: Smartphone },
  { label: "API keys", to: "/admin/api-keys", icon: KeyRound },
  { label: "Webhooks", to: "/admin/webhooks", icon: Webhook },
  { label: "Payment methods", to: "/admin/payment-methods", icon: CircleDollarSign },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Activity logs", to: "/admin/activity-logs", icon: Activity },
];

/* ────────── Auth helpers ────────── */
function getToken(): string | null { return localStorage.getItem("zi-pay-token"); }
function getUser(): { name: string; email: string; role: string; avatar?: string } | null {
  try { const raw = localStorage.getItem("zi-pay-user"); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function setUser(u: { name: string; email: string; role: string; avatar?: string }) { localStorage.setItem("zi-pay-user", JSON.stringify(u)); }
function clearToken() { localStorage.removeItem("zi-pay-token"); localStorage.removeItem("zi-pay-refresh"); localStorage.removeItem("zi-pay-user"); }
function isAuthenticated(): boolean { return !!getToken(); }

function AdminGuard({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

/* ────────── Brand ────────── */
function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark"><Zap size={16} fill="currentColor" /></div>
      <div><strong>ZI PREMIUM SERVICES</strong><span>Payment Gateway</span></div>
    </div>
  );
}

/* ────────── Sidebar ────────── */
function Sidebar({ collapsed, close }: { collapsed: boolean; close?: () => void }) {
  const location = useLocation();
  const storedUser = getUser();
  const handleLogout = () => { clearToken(); window.location.href = "/admin/login"; };
  const displayName = storedUser?.name || storedUser?.email || "Admin";
  const initials = displayName.replace(/[^A-Za-z0-9 ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "A";
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="side-top">
        <Brand />
        <button className="icon-btn mobile-close" onClick={close}><X size={18} /></button>
      </div>
      <div className="workspace">
        <div className="workspace-avatar">{initials[0]}</div>
        <div><strong>ZI Pay</strong><small>Business workspace</small></div>
        <ChevronDown size={15} />
      </div>
      <nav className="nav">
        {adminNav.map(({ label, to, icon: I }) => (
          <NavLink key={to} to={to} end={to === "/admin/dashboard"} onClick={close} className={({ isActive }) => isActive ? "active" : ""}>
            <I size={18} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="nav-bottom">
        <NavLink to="/admin/settings"><Settings size={18} /><span>Settings</span></NavLink>
        <a href="#support"><LifeBuoy size={18} /><span>Support center</span></a>
      </div>
      <div className="user-card">
        {storedUser?.avatar ? <img className="avatar avatar-img" src={storedUser.avatar} alt={displayName} /> : <div className="avatar">{initials}</div>}
        <div><strong>{displayName}</strong><small>{storedUser?.role ? storedUser.role.charAt(0).toUpperCase() + storedUser.role.slice(1).replace(/_/g, " ") : "Admin"}</small></div>
        <button className="icon-btn" title="Logout" onClick={handleLogout}><LogOut size={17} /></button>
      </div>
    </aside>
  );
}

/* ────────── Header ────────── */
function Header({ onMenu, dark, setDark }: { onMenu: () => void; dark: boolean; setDark: (v: boolean) => void }) {
  const location = useLocation();
  const title = location.pathname === "/admin/dashboard" ? "Dashboard" : adminNav.find((n) => n.to === location.pathname)?.label || "Workspace";
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn menu-btn" onClick={onMenu}><Menu size={20} /></button>
        <div><span className="eyebrow">Workspace / ZI Pay</span><h1>{title}</h1></div>
      </div>
      <div className="top-actions">
        <div className="search"><Search size={16} /><input placeholder="Search anything..." /><kbd>⌘ K</kbd></div>
        <button className="icon-btn" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
        <button className="icon-btn notification"><Bell size={18} /><i /></button>
        <div className="header-avatar">ZA</div>
      </div>
    </header>
  );
}

/* ────────── Status badge ────────── */
function Status({ children }: { children: string }) {
  const s = String(children).toLowerCase();
  return <span className={`status ${s}`}><i />{children}</span>;
}

/* ────────── Metric card ────────── */
function Metric({ label, value, delta, icon: I, tone }: { label: string; value: string; delta: string; icon: Icon; tone: string }) {
  return (
    <div className="metric card">
      <div className="metric-head"><span>{label}</span><div className={`metric-icon ${tone}`}><I size={18} /></div></div>
      <strong>{value}</strong>
      <div className="metric-foot"><span className="positive"><ArrowUpRight size={14} />{delta}</span><span>vs last 30 days</span></div>
    </div>
  );
}

/* ────────── Empty resource page ────────── */
function ResourcePage({ title, icon: I, description, button, children }: { title: string; icon: Icon; description: string; button: string; children?: React.ReactNode }) {
  return (
    <div className="resource-page">
      <div className="page-intro">
        <div>
          <div className="resource-title"><div className="metric-icon purple"><I size={19} /></div><h2>{title}</h2></div>
          <p>{description}</p>
        </div>
        <button className="primary-btn"><Plus size={17} />{button}</button>
      </div>
      {children || (
        <div className="card empty-card">
          <div className="empty-icon"><I size={22} /></div>
          <h3>No {String(title).toLowerCase()} yet</h3>
          <p>Connect your first resource to start managing it from the ZI Pay console.</p>
          <button className="outline-btn">Get started <ArrowUpRight size={14} /></button>
        </div>
      )}
    </div>
  );
}

/* ────────── Dashboard ────────── */
function Dashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/admin/dashboard/overview`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((data) => { if (data.success) setOverview(data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Provider icons for the breakdown rows (DB-driven /api/public/providers).
  useEffect(() => {
    fetch(`${API_URL}/api/public/providers`)
      .then((res) => res.json())
      .then((json) => { const list = Array.isArray(json?.data?.methods) ? json.data.methods : []; if (list.length > 0) setProviders(list); })
      .catch(() => {});
  }, []);

  const m = overview?.metrics;
  const fmt = (v: number) => `৳ ${(v || 0).toLocaleString("en-BD")}`;
  const providerIcon = (name: string) => {
    const hit = providers.find((p) => p.name === name || p.code === name?.toLowerCase());
    return hit?.icon || "";
  };

  return (
    <>
      <div className="page-intro">
        <div><h2>Good morning, {getUser()?.name?.split(" ")[0] || "Admin"}</h2><p>Here is what's happening with your payments today.</p></div>
        <button className="primary-btn"><Plus size={17} /> Create payment request</button>
      </div>
      <div className="metrics">
        <Metric label="Today's Revenue" value={m ? fmt(m.todayRevenue) : "—"} delta="—" icon={CircleDollarSign} tone="purple" />
        <Metric label="Successful payments" value={m ? String(m.successCount) : "—"} delta="—" icon={CheckCircle2} tone="green" />
        <Metric label="Average payment" value={m ? fmt(m.averagePayment) : "—"} delta="—" icon={ArrowUpRight} tone="blue" />
        <Metric label="Total transactions" value={m ? String(m.totalTransactions) : "—"} delta="—" icon={Activity} tone="orange" />
      </div>
      <div className="metrics" style={{ marginTop: 14 }}>
        <Metric label="Pending payments" value={m ? String(m.pendingCount) : "—"} delta="—" icon={Clock} tone="orange" />
        <Metric label="Failed payments" value={m ? String(m.failedCount) : "—"} delta="—" icon={X} tone="red" />
        <Metric label="Week Revenue" value={m ? fmt(m.weekRevenue) : "—"} delta="—" icon={CircleDollarSign} tone="purple" />
        <Metric label="Month Revenue" value={m ? fmt(m.monthRevenue) : "—"} delta="—" icon={CircleDollarSign} tone="green" />
      </div>
      <div className="dashboard-grid">
        <div className="card chart-card" style={{ padding: 20 }}>
          <div className="card-heading">
            <div><span className="card-kicker">Revenue overview</span><h2>{m ? fmt(m.totalRevenue) : "—"}</h2></div>
            <select defaultValue="30"><option value="30">Last 30 days</option><option value="7">Last 7 days</option><option value="90">Last 90 days</option></select>
          </div>
          <div className="chart" style={{ height: 190 }}>
            <div className="y-labels"><span>৳ 80k</span><span>৳ 60k</span><span>৳ 40k</span><span>৳ 20k</span><span>৳ 0</span></div>
            <svg viewBox="0 0 600 130" preserveAspectRatio="none" style={{ position: "absolute", inset: "0 0 20px", width: "100%", height: "calc(100% - 20px)" }}>
              <defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity=".28" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient></defs>
              <path d="M 0,112 30,108 60,114 90,96 120,103 150,91 180,95 210,68 240,80 270,58 300,64 330,45 360,55 390,34 420,40 450,22 480,29 510,14 540,26 570,7 600,18 L 600,130 L 0,130 Z" fill="url(#fill)" />
              <polyline points="0,112 30,108 60,114 90,96 120,103 150,91 180,95 210,68 240,80 270,58 300,64 330,45 360,55 390,34 420,40 450,22 480,29 510,14 540,26 570,7 600,18" fill="none" stroke="#9b7bff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="x-labels"><span>01 Sep</span><span>07 Sep</span><span>14 Sep</span><span>21 Sep</span><span>30 Sep</span></div>
          </div>
        </div>
        <div className="card provider-card" style={{ padding: 20 }}>
          <div className="card-heading"><div><span className="card-kicker">Payment methods</span><h3>Provider performance</h3></div></div>
          {overview?.providerBreakdown?.map((p: any) => (
            <React.Fragment key={p.name}>
              <div className="provider-row">
                <div className="provider-name">
                  <span className={`provider-logo ${p.name?.toLowerCase()}`}>{providerIcon(p.name) ? <img src={providerIcon(p.name)} alt={p.name} /> : p.name?.[0]}</span>
                  <div><strong>{p.name}</strong><small>{p.count} transactions</small></div>
                </div>
                <strong>৳ {p.revenue?.toLocaleString?.("en-BD")}</strong>
                <span className="provider-percent">{p.percentage}%</span>
              </div>
              <div className="progress"><i style={{ width: `${p.percentage}%`, background: p.name === "bKash" ? "#e84d8a" : p.name === "Nagad" ? "#f47e35" : "#8049b8" }} /></div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
}

/* ────────── Transactions page ────────── */
function TransactionsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/payments/admin/payments`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((data) => { if (data.success && data.data?.payments) setPayments(data.data.payments); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="resource-page">
      <div className="page-intro">
        <div><div className="resource-title"><div className="metric-icon purple"><CreditCard size={19} /></div><h2>Transactions</h2></div><p>All payment transactions across the gateway.</p></div>
      </div>
      <div className="card" style={{ padding: "20px 20px 7px" }}>
        <div className="table-wrap" style={{ margin: "0 -20px -7px" }}>
          <table>
            <thead><tr><th>Transaction ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Provider</th><th>Date</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading transactions...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No transactions found</td></tr>
              ) : payments.map((p) => (
                <tr key={p._id}>
                  <td><strong>{p.transactionId}</strong></td>
                  <td>{p.customerName}</td>
                  <td><strong>৳ {typeof p.amount === "number" ? p.amount.toLocaleString("en-BD") : p.amount}</strong></td>
                  <td><Status>{p.status}</Status></td>
                  <td><span className={`mini-provider ${p.provider?.toLowerCase()}`}>{p.provider}</span></td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ────────── Devices page ────────── */
function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/admin/devices`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((data) => { if (data.success && data.data?.devices) setDevices(data.data.devices); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="resource-page">
      <div className="page-intro">
        <div><div className="resource-title"><div className="metric-icon purple"><Smartphone size={19} /></div><h2>Devices</h2></div><p>Android SMS reader devices connected to the gateway.</p></div>
        <button className="primary-btn"><Plus size={17} />Register device</button>
      </div>
      <div className="card" style={{ padding: "20px 20px 7px" }}>
        <div className="table-wrap" style={{ margin: "0 -20px -7px" }}>
          <table>
            <thead><tr><th>Device ID</th><th>Name</th><th>Provider</th><th>Status</th><th>Battery</th><th>Last Sync</th><th>SMS Processed</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading devices...</td></tr>
              ) : devices.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No devices registered</td></tr>
              ) : devices.map((d) => (
                <tr key={d._id}>
                  <td><strong>{d.deviceId}</strong></td>
                  <td>{d.name}</td>
                  <td><span className={`mini-provider ${d.provider}`}>{d.provider}</span></td>
                  <td>{d.status === "online" ? <span style={{ color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 5 }}><Wifi size={12} />Online</span> : <span style={{ color: "#e97389", display: "inline-flex", alignItems: "center", gap: 5 }}><WifiOff size={12} />Offline</span>}</td>
                  <td>{d.batteryLevel != null ? `${d.batteryLevel}%` : "—"}</td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>{d.lastSyncAt ? new Date(d.lastSyncAt).toLocaleString() : "—"}</td>
                  <td>{d.totalSmsProcessed || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ────────── API Keys page ────────── */
function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/admin/api-keys`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((data) => { if (data.success && data.data?.keys) setKeys(data.data.keys); })
      .catch(() => {});
  }, []);

  return (
    <div className="resource-page">
      <div className="page-intro">
        <div><div className="resource-title"><div className="metric-icon purple"><KeyRound size={19} /></div><h2>API Keys</h2></div><p>Manage merchant API keys for programmatic access.</p></div>
        <button className="primary-btn"><Plus size={17} />Generate key</button>
      </div>
      <div className="card" style={{ padding: "20px 20px 7px" }}>
        <div className="table-wrap" style={{ margin: "0 -20px -7px" }}>
          <table>
            <thead><tr><th>Name</th><th>Key</th><th>Merchant</th><th>Status</th><th>Usage</th><th>Last Used</th></tr></thead>
            <tbody>
              {keys.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No API keys generated</td></tr>
              ) : keys.map((k) => (
                <tr key={k._id}>
                  <td><strong>{k.name}</strong></td>
                  <td style={{ fontFamily: "monospace", fontSize: 10 }}>{k.key?.substring(0, 16)}...</td>
                  <td>{k.merchantName}</td>
                  <td>{k.isActive ? <span style={{ color: "var(--green)" }}>Active</span> : <span style={{ color: "#e97389" }}>Revoked</span>}</td>
                  <td>{k.usageCount || 0}</td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ────────── Pay Settings ────────── */
function PaySettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/admin/settings/pay`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((res) => res.json())
      .then((data) => { if (data.success) setSettings(data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: any) => setSettings((s) => ({ ...s, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/admin/settings/pay`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    } catch {} finally { setSaving(false); }
  };

  if (loading) return <div className="content"><p style={{ color: "var(--muted)" }}>Loading settings...</p></div>;

  const inputStyle = { display: "block", width: "100%", marginTop: 7, padding: "12px 13px", border: "1px solid var(--line)", borderRadius: 9, background: "#0d1119", color: "var(--text)" } as const;
  const labelStyle = { display: "block", color: "#cbd0dc", fontSize: 12, fontWeight: 600 } as const;

  const renderMsg = (key: string, label: string, rows = 3) => (
    <label style={labelStyle}>
      {label}
      <textarea rows={rows} value={settings[key] || ""} onChange={(e) => update(key, e.target.value)} style={inputStyle} />
    </label>
  );

  return (
    <div className="resource-page">
      <div className="page-intro">
        <div><div className="resource-title"><div className="metric-icon purple"><Palette size={19} /></div><h2>Pay Settings</h2></div><p>Customize the public payment page.</p></div>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ color: "var(--text)", fontSize: 14, marginBottom: 14 }}>Branding</h3>
        <div style={{ display: "grid", gap: 16 }}>
          <label style={labelStyle}>Page Title <input type="text" value={settings.title || ""} onChange={(e) => update("title", e.target.value)} style={inputStyle} /></label>
          <label style={labelStyle}>Subtitle <input type="text" value={settings.subtitle || ""} onChange={(e) => update("subtitle", e.target.value)} style={inputStyle} /></label>
          <label style={labelStyle}>Description <textarea value={settings.description || ""} onChange={(e) => update("description", e.target.value)} rows={3} style={inputStyle} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={labelStyle}>Logo URL <input type="text" placeholder="https://..." value={settings.logoUrl || ""} onChange={(e) => update("logoUrl", e.target.value)} style={inputStyle} /></label>
            <label style={labelStyle}>Favicon URL <input type="text" placeholder="https://..." value={settings.faviconUrl || ""} onChange={(e) => update("faviconUrl", e.target.value)} style={inputStyle} /></label>
          </div>
          <label style={labelStyle}>Footer Text <input type="text" value={settings.footerText || ""} onChange={(e) => update("footerText", e.target.value)} style={inputStyle} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={labelStyle}>Support Email <input type="email" value={settings.supportEmail || ""} onChange={(e) => update("supportEmail", e.target.value)} style={inputStyle} /></label>
            <label style={labelStyle}>Support Phone <input type="text" value={settings.supportPhone || ""} onChange={(e) => update("supportPhone", e.target.value)} style={inputStyle} /></label>
          </div>
          <label style={labelStyle}>Primary Color <input type="color" value={settings.primaryColor || "#8b5cf6"} onChange={(e) => update("primaryColor", e.target.value)} style={{ ...inputStyle, padding: "4px 13px", height: 44 }} /></label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#cbd0dc", fontSize: 12 }}>
            <input type="checkbox" checked={settings.showBranding ?? true} onChange={(e) => update("showBranding", e.target.checked)} /> Show branding on checkout page
          </label>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginTop: 18 }}>
        <h3 style={{ color: "var(--text)", fontSize: 14, marginBottom: 14 }}>Invoice Page</h3>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={labelStyle}>Merchant Name <input type="text" value={settings.merchantName || ""} onChange={(e) => update("merchantName", e.target.value)} style={inputStyle} /></label>
            <label style={labelStyle}>Merchant Account <input type="text" value={settings.merchantAccount || ""} onChange={(e) => update("merchantAccount", e.target.value)} style={inputStyle} /></label>
          </div>
          <label style={labelStyle}>Invoice Heading <input type="text" value={settings.invoiceHeading || ""} onChange={(e) => update("invoiceHeading", e.target.value)} style={inputStyle} /></label>
          <label style={labelStyle}>Invoice Description <textarea rows={3} value={settings.invoiceDescription || ""} onChange={(e) => update("invoiceDescription", e.target.value)} style={inputStyle} /></label>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginTop: 18 }}>
        <h3 style={{ color: "var(--text)", fontSize: 14, marginBottom: 14 }}>Status Messages</h3>
        <div style={{ display: "grid", gap: 16 }}>
          {renderMsg("pendingPaymentMessage", "Pending Payment Message")}
          {renderMsg("pendingVerificationMessage", "Pending Verification Message")}
          {renderMsg("paidMessage", "Paid Message")}
          {renderMsg("expiredMessage", "Expired Message")}
          {renderMsg("cancelledMessage", "Cancelled Message")}
          {renderMsg("rejectedMessage", "Rejected Message")}
          {renderMsg("supportMessage", "Support Message")}
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginTop: 18 }}>
        <h3 style={{ color: "var(--text)", fontSize: 14, marginBottom: 14 }}>Checkout Instructions (legacy checkout page)</h3>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <label style={labelStyle}>bKash Number <input type="text" value={settings.merchantBkashNumber || ""} onChange={(e) => update("merchantBkashNumber", e.target.value)} style={inputStyle} /></label>
            <label style={labelStyle}>Nagad Number <input type="text" value={settings.merchantNagadNumber || ""} onChange={(e) => update("merchantNagadNumber", e.target.value)} style={inputStyle} /></label>
            <label style={labelStyle}>Rocket Number <input type="text" value={settings.merchantRocketNumber || ""} onChange={(e) => update("merchantRocketNumber", e.target.value)} style={inputStyle} /></label>
          </div>
          {[
            { key: "bkash", label: "bKash" },
            { key: "nagad", label: "Nagad" },
            { key: "rocket" },
            { key: "upay", label: "Upay" },
          ].filter((p) => settings.enabledProviders?.includes(p.key)).map((p) => (
            <label key={p.key} style={labelStyle}>
              {p.label} Instructions
              <textarea
                rows={3}
                placeholder={`e.g. Send money to the ${p.key} number shown and enter the TRX ID.`}
                value={settings.instructions?.[p.key] || ""}
                onChange={(e) => update("instructions", { ...(settings.instructions || {}), [p.key]: e.target.value })}
                style={inputStyle}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────── Payment Methods ────────── */
type MethodForm = {
  code: string; name: string; displayName: string; accountNumber: string; accountName: string;
  accountType: "personal" | "merchant"; icon: string; qrImageUrl: string; instructions: string; steps: string;
  warning: string; notice: string; color: string; minAmount: number; maxAmount: number;
  processingFee: number; processingFeeType: "fixed" | "percentage"; isActive: boolean;
};

const EMPTY_METHOD: MethodForm = {
  code: "", name: "", displayName: "", accountNumber: "", accountName: "",
  accountType: "merchant", icon: "", qrImageUrl: "", instructions: "", steps: "", warning: "", notice: "",
  color: "#F37021", minAmount: 10, maxAmount: 200000, processingFee: 0, processingFeeType: "percentage", isActive: true,
};

function PaymentMethodsPage() {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<MethodForm | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [step, setStep] = useState<"list" | "edit">("list");

  const reload = () => {
    setLoading(true);
    fetch(`${API_URL}/api/admin/payment-methods`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((res) => res.json())
      .then((data) => { if (data.success && data.data?.methods) setMethods(data.data.methods); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const apiCall = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  };

  const startCreate = () => { setEditing({ ...EMPTY_METHOD, steps: "Open your app\nChoose Send Money\nEnter account number" }); setCreating(true); setStep("edit"); setNotice(""); };
  const startEdit = (m: any) => {
    setEditing({
      code: m.code, name: m.name || m.code, displayName: m.displayName || "", accountNumber: m.accountNumber || "",
      accountName: m.accountName || "", accountType: m.accountType || "merchant", icon: m.icon || "",
      qrImageUrl: m.qrImageUrl || "", instructions: m.instructions || "", steps: (m.steps || []).join("\n"), warning: m.warning || "",
      notice: m.notice || "", color: m.color || FALLBACK_PROVIDER_THEME[m.code]?.color || "#8b5cf6",
      minAmount: m.minAmount ?? 10, maxAmount: m.maxAmount ?? 200000, processingFee: m.processingFee ?? 0,
      processingFeeType: m.processingFeeType || "percentage", isActive: m.isActive !== false,
    });
    setCreating(false); setStep("edit"); setNotice("");
  };

  // ── Steps (How it works) editor: add / remove / reorder lines ──
  const currentSteps = (editing?.steps || "").split("\n").filter(Boolean);
  const updateStepLine = (idx: number, value: string) => {
    setEditing((s) => (s ? { ...s, steps: currentSteps.map((line, i) => (i === idx ? value : line)).join("\n") } : s));
  };
  const addStepLine = () => {
    setEditing((s) => (s ? { ...s, steps: currentSteps.concat("").join("\n") } : s));
  };
  const removeStepLine = (idx: number) => {
    setEditing((s) => (s ? { ...s, steps: currentSteps.filter((_, i) => i !== idx).join("\n") } : s));
  };
  const moveStepLine = (idx: number, dir: -1 | 1) => {
    setEditing((s) => {
      if (!s) return s;
      const list = [...currentSteps];
      const target = idx + dir;
      if (target < 0 || target >= list.length) return s;
      [list[idx], list[target]] = [list[target], list[idx]];
      return { ...s, steps: list.join("\n") };
    });
  };

  const saveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    // The backend requires these fields (non-empty) for a new provider.
    if (!editing.displayName.trim() || !editing.accountNumber.trim()) {
      setNotice("Display name and merchant account number are required.");
      return;
    }
    setSaving(true); setNotice("");
    try {
      // Strip empty-string optional fields so the backend schema validates cleanly.
      const payload: Record<string, unknown> = {
        ...editing,
        steps: editing.steps.split("\n").map((s) => s.trim()).filter(Boolean),
        name: editing.name || editing.code,
      };
      for (const key of Object.keys(payload)) {
        if (payload[key] === "" || ((key === "minAmount" || key === "maxAmount") && payload[key] === 0)) {
          payload[key] = undefined;
        }
      }
      if (creating) await apiCall("/api/admin/payment-methods", { method: "POST", body: JSON.stringify(payload) });
      else await apiCall(`/api/admin/payment-methods/${encodeURIComponent(editing.code)}`, { method: "PUT", body: JSON.stringify(payload) });
      setNotice(creating ? "Payment method created." : "Payment method updated.");
      setStep("list"); setEditing(null); reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to save payment method");
    } finally { setSaving(false); }
  };

  const toggleActive = async (m: any) => {
    try { await apiCall(`/api/admin/payment-methods/${encodeURIComponent(m.code)}`, { method: "PUT", body: JSON.stringify({ isActive: !m.isActive }) }); reload(); }
    catch (err) { setNotice(err instanceof Error ? err.message : "Update failed"); }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...methods];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setMethods(next);
    try { await apiCall("/api/admin/payment-methods/reorder", { method: "POST", body: JSON.stringify({ codes: next.map((m) => m.code) }) }); }
    catch (err) { setNotice(err instanceof Error ? err.message : "Reorder failed"); reload(); }
  };

  const remove = async (m: any) => {
    if (!window.confirm(`Delete payment method "${m.code}"? This cannot be undone.`)) return;
    try { await apiCall(`/api/admin/payment-methods/${encodeURIComponent(m.code)}`, { method: "DELETE" }); reload(); }
    catch (err) { setNotice(err instanceof Error ? err.message : "Delete failed"); }
  };

  const field = (key: keyof MethodForm, label: string, placeholder = "") => (
    <label style={{ display: "block", color: "#cbd0dc", fontSize: 12, fontWeight: 600 }}>
      {label}
      <input
        type="text"
        placeholder={placeholder}
        value={String(editing?.[key] ?? "")}
        onChange={(e) => { const v = e.target.value; setEditing((s) => (s ? { ...s, [key]: key === "processingFee" || key === "minAmount" || key === "maxAmount" ? Number(v) : v } as MethodForm : s)); }}
        style={inputStyle}
      />
    </label>
  );

  const inputStyle = { display: "block", width: "100%", marginTop: 7, padding: "12px 13px", border: "1px solid var(--line)", borderRadius: 9, background: "#0d1119", color: "var(--text)" } as const;

  if (step === "edit" && editing) {
    return (
      <div className="resource-page">
        <div className="page-intro">
          <div><div className="resource-title"><div className="metric-icon purple"><CircleDollarSign size={19} /></div><h2>{creating ? "Add Payment Method" : `Edit ${providerLabel(editing.code)}`}</h2></div><p>{creating ? "Create a new payment provider (e.g. Upay)." : "Configure the provider's display, account, QR and instructions."}</p></div>
          <button className="outline-btn" onClick={() => { setStep("list"); setEditing(null); }}>Back</button>
        </div>
        {notice && <div className="form-error" style={{ marginBottom: 14 }}>{notice}</div>}
        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={saveMethod} style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {field("code", "Provider Code", "bkash")}
              {field("displayName", "Display Name (e.g. bKash)", "bKash")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {field("accountNumber", "Account Number", "01XXXXXXXXX")}
              {field("accountName", "Account Name", "Merchant name")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "block", color: "#cbd0dc", fontSize: 12, fontWeight: 600 }}>
                Account Type
                <select value={editing.accountType} onChange={(e) => setEditing((s) => (s ? { ...s, accountType: e.target.value as "personal" | "merchant" } : s))} style={inputStyle}>
                  <option value="merchant">Merchant</option>
                  <option value="personal">Personal</option>
                </select>
              </label>
              {field("color", "Theme Color (hex)", "#F37021")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {field("icon", "Provider Logo URL", "https://...")}
              {field("qrImageUrl", "Merchant QR Image URL", "https://...")}
            </div>
            <label style={{ display: "block", color: "#cbd0dc", fontSize: 12, fontWeight: 600 }}>
              Instructions
              <textarea rows={3} placeholder="How customers should pay with this provider." value={editing.instructions || ""} onChange={(e) => setEditing((s) => (s ? { ...s, instructions: e.target.value } : s))} style={inputStyle} />
            </label>
            <div style={{ display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#cbd0dc", fontSize: 12, fontWeight: 600 }}>
                <span>How It Works / Steps</span>
                <button type="button" onClick={addStepLine} style={{ background: "none", border: "none", color: "var(--purple)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}><Plus size={13} style={{ verticalAlign: "-2px" }} /> Add step</button>
              </div>
              {currentSteps.map((line, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
                  <span style={{ color: "var(--muted)", display: "inline-flex" }}><GripVertical size={15} /></span>
                  <input
                    type="text"
                    value={line}
                    placeholder={`Step ${idx + 1}`}
                    onChange={(e) => updateStepLine(idx, e.target.value)}
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => moveStepLine(idx, -1)} disabled={idx === 0} className="icon-btn" title="Move up"><ChevronUp size={14} /></button>
                  <button type="button" onClick={() => moveStepLine(idx, 1)} disabled={idx === currentSteps.length - 1} className="icon-btn" title="Move down"><ChevronDown size={14} /></button>
                  <button type="button" onClick={() => removeStepLine(idx)} className="icon-btn" title="Remove step"><X size={14} /></button>
                </div>
              ))}
              {currentSteps.length === 0 && (
                <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 7 }}>No steps configured. Add a step to show the "How it works" list on the invoice.</p>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {field("warning", "Warning", "e.g. Only pay the exact amount shown")}
              {field("notice", "Notice", "e.g. No fee for this payment")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              {field("minAmount", "Min Amount (BDT)", "10")}
              {field("maxAmount", "Max Amount (BDT)", "200000")}
              {field("processingFee", "Processing Fee", "0")}
              <label style={{ display: "block", color: "#cbd0dc", fontSize: 12, fontWeight: 600 }}>
                Fee Type
                <select value={editing.processingFeeType} onChange={(e) => setEditing((s) => (s ? { ...s, processingFeeType: e.target.value as "fixed" | "percentage" } : s))} style={inputStyle}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (BDT)</option>
                </select>
              </label>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#cbd0dc", fontSize: 12 }}>
              <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing((s) => (s ? { ...s, isActive: e.target.checked } : s))} /> Active (visible on the invoice page)
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="primary-btn" type="submit" disabled={saving}>{saving ? "Saving..." : (creating ? "Create method" : "Save changes")}</button>
              <button className="outline-btn" type="button" onClick={() => { setStep("list"); setEditing(null); }}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="resource-page">
      <div className="page-intro">
        <div><div className="resource-title"><div className="metric-icon purple"><CircleDollarSign size={19} /></div><h2>Payment Methods</h2></div><p>Configure supported payment providers and their settings.</p></div>
        <button className="primary-btn" onClick={startCreate}><Plus size={15} /> Add provider</button>
      </div>
      {notice && <div className="form-error" style={{ marginBottom: 14 }}>{notice}</div>}
      <div className="card" style={{ padding: "20px 20px 7px" }}>
        <div className="table-wrap" style={{ margin: "0 -20px -7px" }}>
          <table>
            <thead><tr><th>Order</th><th>Provider</th><th>Display Name</th><th>Account</th><th>QR</th><th>Status</th><th>Fee</th><th>Min/Max</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading...</td></tr>
              ) : methods.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No payment methods configured</td></tr>
              ) : methods.map((m, i) => (
                <tr key={m._id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} title="Move up"><ChevronUp size={14} /></button>
                    <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === methods.length - 1} title="Move down"><ChevronDown size={14} /></button>
                  </td>
                  <td><span className={`mini-provider ${m.code}`}>{m.code}</span></td>
                  <td>{m.displayName}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{m.accountNumber}{m.accountName ? <div style={{ color: "var(--muted)" }}>{m.accountName}</div> : null}</td>
                  <td>{m.qrImageUrl ? <a href={m.qrImageUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>View</a> : "—"}</td>
                  <td>{m.isActive ? <span style={{ color: "var(--green)" }}>Active</span> : <span style={{ color: "#e97389" }}>Disabled</span>}</td>
                  <td>{m.processingFee}{m.processingFeeType === "percentage" ? "%" : " BDT"}</td>
                  <td>৳{m.minAmount} - ৳{m.maxAmount}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="icon-btn" onClick={() => startEdit(m)} title="Edit"><Settings size={14} /></button>
                    <button className="icon-btn" onClick={() => toggleActive(m)} title={m.isActive ? "Disable" : "Enable"}>{m.isActive ? <WifiOff size={14} /> : <Wifi size={14} />}</button>
                    <button className="icon-btn" onClick={() => remove(m)} title="Delete"><X size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

/* ────────── Admin Login ────────── */
function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  if (isAuthenticated()) return <Navigate to="/admin/dashboard" replace />;

  const handleLogin = async (tokens: { accessToken: string; refreshToken: string; user?: { name: string; email: string; role: string } }) => {
    localStorage.setItem("zi-pay-token", tokens.accessToken);
    localStorage.setItem("zi-pay-refresh", tokens.refreshToken);
    if (tokens.user) setUser(tokens.user);
    navigate("/admin/dashboard", { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      if (data.data) {
        await handleLogin(data.data);
      } else if (data.accessToken) {
        localStorage.setItem("zi-pay-token", data.accessToken);
        navigate("/admin/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally { setLoading(false); }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setGoogleLoading(true);
    setError("");
    try {
      const credential = credentialResponse?.credential ?? credentialResponse;
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Google login failed");
      if (data.data?.accessToken) {
        await handleLogin(data.data);
      } else if (data.accessToken) {
        localStorage.setItem("zi-pay-token", data.accessToken);
        if (data.refreshToken) localStorage.setItem("zi-pay-refresh", data.refreshToken);
        navigate("/admin/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed");
    } finally { setGoogleLoading(false); }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-shell">
        <Brand />
        <div className="checkout-copy">
          <span className="checkout-kicker">Admin access</span>
          <h1>Sign in to ZI Pay</h1>
          <p>Manage your payment gateway, view transactions, and monitor system health.</p>
        </div>
        <div className="checkout-card">
          {/* Google Sign-In Button */}
          <div style={{ marginBottom: 16 }}>
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google sign-in failed")}
                theme="filled_black"
                size="large"
                text="signin_with"
                shape="rectangular"
                width="400"
              />
            </GoogleOAuthProvider>
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span style={{ color: "var(--muted)", fontSize: 11 }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit}>
            <div className="checkout-fields" style={{ gridTemplateColumns: "1fr", marginTop: 0 }}>
              <label>Email address <input required type="email" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label>Password <input required type="password" minLength={8} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-btn checkout-submit" disabled={loading || googleLoading}>
              {loading ? "Signing in..." : "Sign in"} <ArrowUpRight size={16} />
            </button>
          </form>
        </div>
        <p className="checkout-footer">Powered by ZI Pay Payment Gateway</p>
      </div>
    </div>
  );
}

/* ────────── Landing page ────────── */
function Landing() {
  return (
    <div className="landing-page">
      {/* Background glow blobs */}
      <div className="landing-bg-glow landing-bg-glow-1" />
      <div className="landing-bg-glow landing-bg-glow-2" />
      <div className="landing-bg-glow landing-bg-glow-3" />

      {/* Nav */}
      <nav className="landing-nav">
        <Brand />
      </nav>

      {/* Intro header */}
      <section className="landing-intro">
        <span className="landing-kicker">Payment Gateway</span>
        <h1>Accept payments<br /><span className="gradient-text">any wallet</span></h1>
        <p>Integrate bKash, Nagad, and Rocket into your business with a single, secure API. Built for Bangladesh.</p>
        <div className="landing-intro-actions">
          <a href="/pay" className="primary-btn" style={{ textDecoration: "none", padding: "14px 28px", fontSize: 14 }}>
            Get started <ArrowUpRight size={16} />
          </a>
          <a href="/admin/login" className="outline-btn" style={{ textDecoration: "none", padding: "14px 28px", fontSize: 14 }}>
            Merchant login
          </a>
        </div>
        <div className="provider-badges">
          <span className="provider-badge bkash"><span className="badge-dot" /> bKash</span>
          <span className="provider-badge nagad"><span className="badge-dot" /> Nagad</span>
          <span className="provider-badge rocket"><span className="badge-dot" /> Rocket</span>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div className="feature-card" style={{ animationDelay: "0.1s" }}>
          <div className="feature-icon green"><Zap size={22} /></div>
          <h3>Instant Settlements</h3>
          <p>Payments are verified and settled in real time via SMS monitoring. No waiting for batch processing.</p>
        </div>
        <div className="feature-card" style={{ animationDelay: "0.2s" }}>
          <div className="feature-icon blue"><Globe size={22} /></div>
          <h3>Zero Downtime</h3>
          <p>Multi-device failover ensures your payment gateway stays online even when individual devices go offline.</p>
        </div>
        <div className="feature-card" style={{ animationDelay: "0.3s" }}>
          <div className="feature-icon purple"><Shield size={22} /></div>
          <h3>Bank-Grade Security</h3>
          <p>End-to-end encrypted transactions with device attestation, API key rotation, and webhook verification.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta-section">
        <div className="landing-cta-card">
          <h2>Start accepting payments today</h2>
          <p>No setup fees. Go live in minutes with our simple API integration.</p>
          <a href="/pay" className="primary-btn" style={{ textDecoration: "none", padding: "14px 32px", fontSize: 14 }}>
            Pay now <ArrowUpRight size={16} />
          </a>
          <p className="landing-cta-fine">No setup fees &middot; Go live in minutes</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        Powered by ZI Pay Payment Gateway
      </footer>
    </div>
  );
}

/* ────────── Checkout (public) ────────── */
/* ────────── Provider config (DB-driven via /api/public/providers) ────────── */
type ProviderConfig = {
  code: string;
  displayName: string;
  icon?: string;
  accountNumber: string;
  accountName?: string;
  accountType?: "personal" | "merchant";
  qrImageUrl?: string;
  instructions?: string;
  steps?: string[];
  warning?: string;
  notice?: string;
  color?: string;
  minAmount?: number;
  maxAmount?: number;
};

type InvoiceStatus = "pending" | "processing" | "paid" | "failed" | "expired" | "cancelled" | "rejected";

const FALLBACK_PROVIDERS: ProviderConfig[] = [
  {
    code: "bkash", displayName: "bKash", accountNumber: "", color: "#E2136E",
    steps: ["Open your bKash App", "Choose Send Money", "Enter merchant account number", "Confirm & complete the payment"],
  },
  { code: "nagad", displayName: "Nagad", accountNumber: "", color: "#F58220" },
  { code: "rocket", displayName: "Rocket", accountNumber: "", color: "#7A1FA2" },
  { code: "upay", displayName: "Upay", accountNumber: "", color: "#F37021" },
];

const FALLBACK_PROVIDER_THEME: Record<string, { color: string }> = {
  bkash: { color: "#E2136E" },
  nagad: { color: "#F58220" },
  rocket: { color: "#7A1FA2" },
  upay: { color: "#F37021" },
};

const FALLBACK_SUPPORT: Record<string, { number: string }> = {
  bkash: { number: "16247" },
  nagad: { number: "16167" },
  rocket: { number: "16216" },
  upay: { number: "16267" },
};

function providerLabel(p: string) {
  if (p === "bkash") return "bKash";
  if (p === "upay") return "Upay";
  return p ? p[0].toUpperCase() + p.slice(1) : "Provider";
}

/** Find a provider config by code; falls back to built-in defaults. */
function findProvider(providers: ProviderConfig[], code: string): ProviderConfig {
  const hit = providers.find((m) => m.code === code);
  const fallback = FALLBACK_PROVIDERS.find((m) => m.code === code) || FALLBACK_PROVIDERS[0];
  return { ...fallback, ...hit, steps: hit?.steps?.length ? hit.steps : fallback.steps };
}

type CheckoutPayment = {
  id: string;
  requestId?: string;
  publicInvoiceId?: string;
  secureToken?: string;
  amount: number;
  status: string;
};

type PaySettings = {
  title: string; subtitle: string; description: string;
  enabledProviders: string[]; merchantBkashNumber: string;
  merchantNagadNumber: string; merchantRocketNumber: string;
  instructions: { bkash: string; nagad: string; rocket: string; upay?: string };
  showBranding: boolean; primaryColor: string;
  logoUrl?: string; faviconUrl?: string;
  merchantName?: string; merchantAccount?: string;
  invoiceHeading?: string; invoiceDescription?: string;
  footerText?: string; supportEmail?: string; supportPhone?: string;
  pendingPaymentMessage?: string; pendingVerificationMessage?: string;
  paidMessage?: string; expiredMessage?: string; cancelledMessage?: string;
  rejectedMessage?: string; supportMessage?: string;
};

const defaultPaySettings: PaySettings = {
  title: "ZI PREMIUM SERVICES", subtitle: "Secure checkout",
  description: "Complete your payment through bKash, Nagad, or Rocket.",
  enabledProviders: ["bkash", "nagad", "rocket"],
  merchantBkashNumber: "01614602084", merchantNagadNumber: "01614602084", merchantRocketNumber: "01614602084",
  instructions: { bkash: "Send money to the bKash number shown.", nagad: "Send money to the Nagad number shown.", rocket: "Send money to the Rocket number shown." },
  showBranding: true, primaryColor: "#8b5cf6",
  merchantName: "ZI Premium Services", merchantAccount: "01614602084",
  invoiceHeading: "Complete Your Payment", invoiceDescription: "Complete your payment and enter your transaction details below to confirm.",
  footerText: "Powered by ZiPAY", supportEmail: "support@zipremiumservices.com", supportPhone: "01614602084",
  pendingPaymentMessage: "Please complete your payment within the time shown. After sending money, enter your details below to confirm.",
  pendingVerificationMessage: "Your payment has been submitted and is now pending verification. We will confirm and verify your payment shortly — this usually takes a few minutes.",
  paidMessage: "Your payment has been verified and completed successfully. Thank you for your payment.",
  expiredMessage: "This invoice has expired. Please go back to the store and start a new payment.",
  cancelledMessage: "This payment was cancelled. No money has been taken. Please go back to the store if you still want to pay.",
  rejectedMessage: "This payment could not be verified and has been rejected. If you believe this is a mistake, please contact support.",
  supportMessage: "Having trouble? Contact our support team for assistance.",
};

function Checkout() {
  const [settings, setSettings] = useState<PaySettings>(defaultPaySettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [provider, setProvider] = useState<"bkash" | "nagad" | "rocket" | "upay">("bkash");
  const [form, setForm] = useState({ amount: "", trxId: "" });
  const [payment, setPayment] = useState<CheckoutPayment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/public/pay-settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.title) setSettings(data);
        if (data?.enabledProviders?.length > 0) setProvider(data.enabledProviders[0]);
      })
      .catch(() => setSettings(defaultPaySettings))
      .finally(() => setSettingsLoaded(true));
  }, []);

  // Provider icons for the payment method buttons (DB-driven /api/public/providers).
  useEffect(() => {
    fetch(`${API_URL}/api/public/providers`)
      .then((res) => res.json())
      .then((json) => {
        const list = Array.isArray(json?.data?.methods) ? json.data.methods : [];
        if (list.length > 0) setProviders(list);
      })
      .catch(() => {});
  }, []);

  const update = (key: string, value: string) => setForm((c) => ({ ...c, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/payments/public/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount), provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create payment");
      setPayment(data.data || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create payment");
    } finally { setLoading(false); }
  };

  const merchantNumbers: Record<string, string> = {
    bkash: settings.merchantBkashNumber,
    nagad: settings.merchantNagadNumber,
    rocket: settings.merchantRocketNumber,
    upay: settings.merchantNagadNumber, // legacy checkout; Upay merchants use Nagad number fallback
  };

  if (!settingsLoaded) {
    return <div className="checkout-page"><div className="checkout-shell"><div className="checkout-copy"><h1>Loading checkout...</h1></div></div></div>;
  }

  if (payment) {
    return (
      <div className="checkout-page">
        <div className="checkout-shell">
          {settings.showBranding && <Brand />}
          <div className="checkout-success">
            <div className="success-mark"><CheckCircle2 size={30} /></div>
            <span className="checkout-kicker">Payment request created</span>
            <h1>Complete your payment</h1>
            <p>Send the exact amount using {providerLabel(provider)} to <strong>{merchantNumbers[provider]}</strong>.</p>
            <div className="payment-reference"><span>Payment reference</span><strong>{payment.requestId || payment.id}</strong></div>
            <div className="checkout-summary">
              <div><span>Amount</span><strong>৳ {Number(payment.amount).toLocaleString("en-BD")}</strong></div>
              <div><span>Provider</span><strong>{providerLabel(provider)}</strong></div>
              <div><span>Status</span><Status>{payment.status}</Status></div>
            </div>
            {payment.publicInvoiceId && payment.secureToken ? (
              <button
                className="primary-btn full"
                style={{ marginTop: 8 }}
                onClick={() => (
                  window.location.href =
                    `/payment/invoice?invoiceId=${encodeURIComponent(payment.publicInvoiceId!)}` +
                    `&token=${encodeURIComponent(payment.secureToken!)}`
                )}
              >
                Continue to Payment <ArrowUpRight size={16} />
              </button>
            ) : payment.requestId ? (
              <button
                className="primary-btn full"
                style={{ marginTop: 8 }}
                onClick={() => (window.location.href = `/payment/invoice?requestId=${encodeURIComponent(payment.requestId!)}`)}
              >
                Continue to Payment <ArrowUpRight size={16} />
              </button>
            ) : null}
            <button className="outline-btn full" onClick={() => setPayment(null)}>Create another payment</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-shell">
        {settings.showBranding && (
          <div className="checkout-brand-row">
            <Brand />
          </div>
        )}
        <div className="checkout-copy">
          <span className="checkout-kicker">{settings.subtitle}</span>
          <h1>{settings.title}</h1>
          <p>{settings.description}</p>
        </div>
        <form className="checkout-card" onSubmit={submit}>
          <div className="provider-selector">
            <span className="field-label">Choose payment method</span>
            <div className="provider-options">
              {(settings.enabledProviders as ("bkash" | "nagad" | "rocket" | "upay")[]).map((item) => (
                <button type="button" key={item} className={`provider-option ${provider === item ? "selected" : ""}`} onClick={() => setProvider(item)}>
                  <span className={`provider-logo ${item}`}>{findProvider(providers, item).icon ? <img src={findProvider(providers, item).icon} alt={providerLabel(item)} /> : item[0]}</span><strong>{providerLabel(item)}</strong>
                </button>
              ))}
            </div>
          </div>
          {settings.instructions?.[provider] && (
            <div className="checkout-instruction" style={{ background: "#130e24", border: "1px solid var(--line)", borderRadius: 9, padding: "12px 14px", fontSize: 12, color: "#c3c9d8", lineHeight: 1.6 }}>
              {settings.instructions[provider]}
            </div>
          )}
          <div className="checkout-fields">
            <label>Amount (BDT)<input required type="number" min="1" placeholder="500" value={form.amount} onChange={(e) => update("amount", e.target.value)} /></label>
            <label>Transaction ID<small>from SMS</small><input required type="text" placeholder="A8D9P23" value={form.trxId} onChange={(e) => update("trxId", e.target.value)} /></label>
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-btn checkout-submit" disabled={loading}>
            {loading ? "Creating..." : `Pay with ${providerLabel(provider)}`} <ArrowUpRight size={16} />
          </button>
          <div className="secure-line"><Shield size={13} />Secured by ZI Pay</div>
        </form>
        <p className="checkout-footer">Powered by ZI Pay Payment Gateway</p>
      </div>
    </div>
  );
}

// ── Provider support numbers ────────────────────────────────────
function CustomerSupportFooter({ supportNumber, supportText }: { supportNumber: string; supportText?: string }) {
  return (
    <div className="bk-support">
      <div className="bk-divider" />
      <PhoneCall size={14} className="bk-support-icon" />
      <p className="bk-support-title">Need Help?</p>
      {supportNumber ? (
        <a className="bk-support-tel" href={`tel:${supportNumber}`}>
          Call {supportNumber}
        </a>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: 12 }}>{supportText || "Contact support"}</p>
      )}
    </div>
  );
}

/* ────────── Invoice Payment Page (from main site) ────────── */

/**
 * Strictly coerce a URL/query/API amount to a whole-taka integer. Accepts only
 * plain decimal strings/numbers ("1000", "1000.49" → 1000); anything else
 * (empty, "1e3", "1000abc") returns 0. Never relies on loose Number() coercion.
 */
function toWholeTaka(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : 0;
  if (typeof value !== "string") return 0;
  const s = value.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return 0;
  return Math.round(Number(s));
}

function InvoicePayment() {
  const [params] = useSearchParams();
  const [settings, setSettings] = useState<PaySettings>(defaultPaySettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [provider, setProvider] = useState<string>("bkash");
  const [trxId, setTrxId] = useState("");
  const [payerNumber, setPayerNumber] = useState("");
  const [formStep, setFormStep] = useState<"phone" | "trx">("phone");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copiedMerchant, setCopiedMerchant] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  // ── Invoice data (from backend) ──
  const [invoiceData, setInvoiceData] = useState<{
    requestId: string;
    publicInvoiceId?: string;
    merchantName: string;
    merchantAccount: string;
    orderId: string;
    amount: number;
    provider: string;
    status: InvoiceStatus;
    invoiceExpiresAt?: string;
    customerName?: string;
    customerPhone?: string;
    transactionId?: string;
  } | null>(null);
  const [invoiceError, setInvoiceError] = useState("");

  const copyMerchantNumber = (num: string) => {
    navigator.clipboard.writeText(num).then(() => {
      setCopiedMerchant(true);
      setTimeout(() => setCopiedMerchant(false), 2000);
    }).catch(() => {});
  };

  // Read query params — a secure invoice arrives as invoiceId + token;
  // legacy invoices arrive as requestId; main-site direct invoices arrive
  // as provider/amount/cb only.
  const requestId = params.get("requestId") || "";
  const invoiceId = params.get("invoiceId") || "";
  const token = params.get("token") || "";
  const cb = params.get("cb") || "";

  // ── Load pay settings (shared by both Checkout and InvoicePayment) ──
  // The invoice timer is driven by `invoiceExpiresAt` from the server
  // invoice response — NOT by pay-settings.  See the invoice-fetch
  // useEffect below for the server-authoritative timer calculation.
  useEffect(() => {
    fetch(`${API_URL}/api/public/pay-settings`)
      .then((res) => res.json())
      .then((data) => { if (data?.title) setSettings(data); })
      .catch(() => setSettings(defaultPaySettings))
      .finally(() => setSettingsLoaded(true));
  }, []);

  // ── Load active providers (DB-driven list) ──
  useEffect(() => {
    fetch(`${API_URL}/api/public/providers`)
      .then((res) => res.json())
      .then((json) => {
        const list = Array.isArray(json?.data?.methods) ? json.data.methods : [];
        if (list.length > 0) setProviders(list);
      })
      .catch(() => {});
  }, []);

  // ── Invoice data — secure token-gated flow / legacy requestId / cb-only mint ──
  // Runs only after pay-settings finish loading (settingsLoaded = true).
  useEffect(() => {
    if (!settingsLoaded) return;

    // ── Flow A: Secure token-gated URL (invoiceId + token) ──
    if (invoiceId && token) {
      fetch(`${API_URL}/api/invoices/${encodeURIComponent(invoiceId)}?token=${encodeURIComponent(token)}`)
        .then(async (res) => {
          if (res.status === 410) throw new Error("This invoice has expired.");
          if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Invoice not found"); }
          return res.json();
        })
        .then((json) => {
          const data = json?.data;
          if (!data) throw new Error("Invoice not found");
          setInvoiceData(data);
          if (data.invoiceExpiresAt) {
            const expiryMs = new Date(data.invoiceExpiresAt).getTime() - Date.now();
            setTimeLeft(Math.max(0, Math.floor(expiryMs / 1000)));
          }
        })
        .catch((e: unknown) => setInvoiceError(e instanceof Error ? e.message : "Invoice not found"))
        .finally(() => setSettingsLoaded(true));
      return;
    }

    // ── Flow B: Legacy requestId (backward compatibility) ──
    if (requestId) {
      fetch(`${API_URL}/api/payments/public/request/${encodeURIComponent(requestId)}`)
        .then(async (res) => {
          if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Invoice not found"); }
          return res.json();
        })
        .then((json) => {
          const data = json?.data;
          if (!data) throw new Error("Invoice not found");
          setInvoiceData(data);
          // Note: the public/request endpoint never exposes the secure token, so
          // a bare requestId cannot be upgraded to a secure URL in-browser.  The
          // customer must follow a token-bearing link to use the secure path.
          if (data.invoiceExpiresAt) {
            const expiryMs = new Date(data.invoiceExpiresAt).getTime() - Date.now();
            setTimeLeft(Math.max(0, Math.floor(expiryMs / 1000)));
          }
        })
        .catch((e: unknown) => setInvoiceError(e instanceof Error ? e.message : "Invoice not found"))
        .finally(() => setSettingsLoaded(true));
      return;
    }

    // ── Flow C: cb-only (main site direct invoice without server record) ──
    if (cb) {
      // Decode the provider/amount/orderId from the base64 cb payload, then
      // mint a one-time server-authoritative invoice and redirect to the secure URL.
      let decodedProvider = "bkash";
      let decodedAmount = 0;
      let decodedOrderId = "";
      try {
        const decoded = decodeURIComponent(atob(cb.replace(/-/g, "+").replace(/_/g, "/")));
        const cbParams = new URLSearchParams(decoded);
        decodedProvider = cbParams.get("provider") || params.get("provider") || "bkash";
        decodedAmount = toWholeTaka(cbParams.get("amount")) || toWholeTaka(params.get("amount")) || 0;
        decodedOrderId = cbParams.get("orderId") || "";
      } catch {
        decodedProvider = params.get("provider") || "bkash";
        decodedAmount = toWholeTaka(params.get("amount")) || 0;
      }
      if (!decodedAmount) { setInvoiceError("Invalid payment amount"); setSettingsLoaded(true); return; }

      // Use browser history.replaceState to switch to secure URL after minting,
      // preventing the browser URL from exposing the raw cb/amount/provider.
      fetch(`${API_URL}/api/invoices/mint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: decodedProvider,
          amount: decodedAmount,
          orderId: decodedOrderId || undefined,
        }),
      })
        .then(async (res) => {
          if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Could not create invoice"); }
          return res.json();
        })
        .then((json) => {
          const data = json?.data;
          if (!data?.publicInvoiceId || !data?.secureToken) throw new Error("Invoice creation failed");
          // Redirect to secure URL — browser back-button won't expose cb params
          const secureUrl =
            `/payment/invoice?invoiceId=${encodeURIComponent(data.publicInvoiceId)}` +
            `&token=${encodeURIComponent(data.secureToken)}`;
          window.history.replaceState(null, "", secureUrl);
          window.location.href = secureUrl;
        })
        .catch((e: unknown) => {
          setInvoiceError(e instanceof Error ? e.message : "Could not create invoice");
          setSettingsLoaded(true);
        });
      return;
    }

    // ── No params at all ──
    setInvoiceError("No request ID provided");
    setSettingsLoaded(true);
  }, [settingsLoaded, requestId, invoiceId, token, cb, params]);

  // ── Countdown timer — driven by server-authoritative invoiceExpiresAt ──
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(t => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  // All display values come from the backend when a requestId is present.
  // Otherwise (merchant direct invoice with only provider/amount/cb) fall back to query params.
  const resolvedProvider =
    (invoiceData?.provider as string) ||
    (params.get("provider") as string) ||
    (providers.length > 0 ? providers[0].code : settings.enabledProviders?.[0]) ||
    "bkash";
  const amount = toWholeTaka(invoiceData?.amount) || toWholeTaka(params.get("amount")) || 0;

  // Provider config from the DB-driven list (falls back to built-in defaults).
  const resolvedProviderConfig = findProvider(providers, resolvedProvider);
  const providerColor = resolvedProviderConfig.color || FALLBACK_PROVIDER_THEME[resolvedProvider]?.color || "#8b5cf6";
  const providerSupportNumber = settings.supportPhone || "";
  const providerAccount = invoiceData?.merchantAccount || resolvedProviderConfig.accountNumber || settings.merchantAccount || "";

  // Resolve return URL. Prefer explicit cb param, else derive from document.referrer.
  let returnUrl = "";
  try {
    if (cb) {
      returnUrl = decodeURIComponent(atob(cb.replace(/-/g, "+").replace(/_/g, "/")));
    } else if (document.referrer) {
      try {
        const r = new URL(document.referrer);
        r.search = ""; r.hash = "";
        returnUrl = r.origin + "/payment/process";
      } catch { returnUrl = ""; }
    }
  } catch { returnUrl = ""; }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId.trim() || !payerNumber.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const confirmTrx = trxId.trim().toUpperCase();
      const confirmedPayer = payerNumber.trim();
      // Persist confirmed details locally as a fallback when no return URL is known.
      sessionStorage.setItem("zi-pay-invoice-confirm", JSON.stringify({
        provider: resolvedProvider,
        amount: toWholeTaka(amount),
        trxId: confirmTrx,
        payerNumber: confirmedPayer,
        status: "pending",
      }));

      // Navigate back to main site /payment/process which will create the order.
      // Pass both trxId and payerNumber via query since sessionStorage is origin-scoped.
      if (returnUrl) {
        const sep = returnUrl.includes("?") ? "&" : "?";
        window.location.href = `${returnUrl}${sep}provider=${resolvedProvider}&amount=${toWholeTaka(amount)}&trxId=${encodeURIComponent(confirmTrx)}&payerNumber=${encodeURIComponent(confirmedPayer)}`;
      } else {
        // No origin known — show success state instead.
        setError("return_missing");
      }
    } catch {
      setError("Could not confirm payment");
    } finally { setSubmitting(false); }
  };

  // Invoice not found / invalid requestId
  if (invoiceError) {
    return (
      <div className="bk-page">
        <motion.div
          className="bk-loading bk-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bk-success-card" style={{ padding: "40px 24px", textAlign: "center" }}>
            <div className="bk-success-icon" style={{ background: "linear-gradient(135deg,#f43f5e,#dc2626)" }}>
              <X size={28} />
            </div>
            <h2 className="bk-success-title">Invoice Not Found</h2>
            <p className="bk-success-text">This payment invoice could not be found. It may be invalid or expired. Please contact the store or support for assistance.</p>
            <button
              className="bk-btn bk-btn--primary"
              style={{ width: "100%", background: "#dc2626" }}
              onClick={() => window.location.href = "/pay"}
            >
              Back to Home <ArrowUpRight size={16} />
            </button>
          </div>
        </motion.div>
        <CustomerSupportFooter supportNumber={settings.supportPhone || providerSupportNumber} supportText={settings.supportMessage} />
        <p className="bk-foot">{settings.footerText || "Powered by ZiPAY"}</p>
      </div>
    );
  }

  if (!settingsLoaded) {
    return (
      <div className="bk-page">
        <motion.div
          className="bk-loading bk-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bk-spinner" style={{ borderColor: "#e5e7eb", borderTopColor: providerColor }} />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>Loading payment page...</p>
        </motion.div>
      </div>
    );
  }

  // ── State cards: Pending Verification / Paid / Expired / Cancelled / Rejected ──
  // These render instead of the payment form when the invoice status is final
  // or requires manual verification. All messages are admin-configurable.
  const terminalState = invoiceData ? (invoiceData.status === "paid" || invoiceData.status === "expired" || invoiceData.status === "cancelled" || invoiceData.status === "rejected") : false;

  if (invoiceData && terminalState) {
    const stateConfig: Record<InvoiceStatus, { title: string; text: string; icon: React.ReactNode; tone: string }> = {
      paid: {
        title: "Payment Successful",
        text: settings.paidMessage || "Your payment has been verified and completed successfully. Thank you for your payment.",
        icon: <CheckCircle2 size={28} />,
        tone: "linear-gradient(135deg,#10b981,#059669)",
      },
      expired: {
        title: "Invoice Expired",
        text: settings.expiredMessage || "This invoice has expired. Please go back to the store and start a new payment.",
        icon: <Clock size={28} />,
        tone: "linear-gradient(135deg,#f59e0b,#d97706)",
      },
      cancelled: {
        title: "Payment Cancelled",
        text: settings.cancelledMessage || "This payment was cancelled. No money has been taken. Please go back to the store if you still want to pay.",
        icon: <X size={28} />,
        tone: "linear-gradient(135deg,#6b7280,#4b5563)",
      },
      rejected: {
        title: "Payment Rejected",
        text: settings.rejectedMessage || "This payment could not be verified and has been rejected. If you believe this is a mistake, please contact support.",
        icon: <X size={28} />,
        tone: "linear-gradient(135deg,#f43f5e,#dc2626)",
      },
      pending: {
        title: "Pending Payment",
        text: settings.pendingPaymentMessage || "Please complete your payment within the time shown. After sending money, enter your details below to confirm.",
        icon: <Clock size={28} />,
        tone: "linear-gradient(135deg,#f59e0b,#d97706)",
      },
      processing: {
        title: "Pending Verification",
        text: settings.pendingVerificationMessage || "Your payment has been submitted and is now pending verification.",
        icon: <Clock size={28} />,
        tone: "linear-gradient(135deg,#f59e0b,#d97706)",
      },
      failed: {
        title: "Payment Failed",
        text: settings.pendingVerificationMessage || "Your payment could not be completed. Please try again or contact support.",
        icon: <X size={28} />,
        tone: "linear-gradient(135deg,#f43f5e,#dc2626)",
      },
    };
    const conf = stateConfig[invoiceData.status];

    return (
      <div className="bk-page">
        <motion.div
          className="bk-center"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ width: "100%", maxWidth: 420 }}
        >
          <div className="bk-success-card">
            <div className="bk-success-icon" style={{ background: conf.tone }}>
              {conf.icon}
            </div>
            <h2 className="bk-success-title">{conf.title}</h2>
            <p className="bk-success-text">{conf.text}</p>
            <div className="bk-invoice-card" style={{ marginTop: 18 }}>
              {invoiceData.merchantName && (
                <div className="bk-invoice-row">
                  <span className="bk-invoice-label">Merchant:</span>
                  <span className="bk-invoice-value">{invoiceData.merchantName}</span>
                </div>
              )}
              <div className="bk-invoice-row">
                <span className="bk-invoice-label">Amount:</span>
                <span className="bk-invoice-amount">৳{toWholeTaka(invoiceData.amount).toLocaleString("en-BD")}</span>
              </div>
              {invoiceData.transactionId && (
                <div className="bk-invoice-row">
                  <span className="bk-invoice-label">TRX ID:</span>
                  <span className="bk-invoice-value">{invoiceData.transactionId}</span>
                </div>
              )}
            </div>
            <button
              className="bk-btn bk-btn--primary"
              style={{ width: "100%" }}
              onClick={() => window.location.href = "/pay"}
            >
              Back to Home <ArrowUpRight size={16} />
            </button>
          </div>
        </motion.div>
        <CustomerSupportFooter supportNumber={settings.supportPhone || providerSupportNumber} supportText={settings.supportMessage} />
        <p className="bk-foot">{settings.footerText || "Powered by ZiPAY"}</p>
      </div>
    );
  }

  const pending = (() => {
    try { const raw = sessionStorage.getItem("zi-pay-invoice-confirm"); return raw ? JSON.parse(raw) : null; } catch { return null; }
  })();

  if (pending && !returnUrl) {
    return (
      <div className="bk-page">
        <motion.div
          className="bk-center"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ width: "100%", maxWidth: 420 }}
        >
          <div className="bk-success-card">
            <div className="bk-success-icon" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
              <Clock size={28} />
            </div>
            <h2 className="bk-success-title">Pending Verification</h2>
            <p className="bk-success-text">
              {settings.pendingVerificationMessage || "Your payment has been submitted and is now pending verification. We will confirm and verify your payment shortly — this usually takes a few minutes."}
            </p>
            <p className="bk-success-text" style={{ marginTop: 8 }}>
              <strong>৳ {toWholeTaka(pending.amount).toLocaleString("en-BD")}</strong> via {providerLabel(pending.provider)} — TRX ID <strong>{pending.trxId}</strong>
            </p>
            <button
              className="bk-btn bk-btn--primary"
              style={{ width: "100%" }}
              onClick={() => { sessionStorage.removeItem("zi-pay-invoice-confirm"); window.location.href = "/pay"; }}
            >
              Make Another Payment <ArrowUpRight size={16} />
            </button>
          </div>
        </motion.div>
        <CustomerSupportFooter supportNumber={settings.supportPhone || providerSupportNumber} supportText={settings.supportMessage} />
        <p className="bk-foot">{settings.footerText || "Powered by ZiPAY"}</p>
      </div>
    );
  }

  return (
    <div className="bk-page">
      <motion.div
        className="bk-center"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Top Header */}
        <div className="bk-top">
          <div className="bk-top-lock">
            <Lock size={18} />
          </div>
          <h1 className="bk-title">{settings.invoiceHeading || `${providerLabel(resolvedProvider)} Payment`}</h1>
          <p className="bk-sub">
            <Lock size={11} />
            {settings.invoiceDescription || "Secure Payment · 256-bit SSL Encrypted"}
          </p>
        </div>

        {/* Main Card */}
        <main className="bk-card">
          {/* Invoice Details */}
          <div className="bk-invoice-card">
            <div className="bk-invoice-row">
              <span className="bk-invoice-label">Merchant:</span>
              <span className="bk-invoice-value">{invoiceData?.merchantName || settings.title || "ZiPAY Merchant"}</span>
            </div>
            <div className="bk-invoice-row">
              <span className="bk-invoice-label">Merchant Account:</span>
              <span className="bk-invoice-value" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {providerAccount || "—"}
                {providerAccount ? (
                  <button
                    type="button"
                    onClick={() => copyMerchantNumber(providerAccount)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "inline-flex", color: copiedMerchant ? "#22c55e" : "#9ca3af" }}
                    title={copiedMerchant ? "Copied!" : "Copy number"}
                  >
                    {copiedMerchant ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  </button>
                ) : null}
              </span>
            </div>
            {invoiceData?.orderId && (
              <div className="bk-invoice-row">
                <span className="bk-invoice-label">Invoice:</span>
                <span className="bk-invoice-value">{invoiceData.orderId}</span>
              </div>
            )}
            <div className="bk-invoice-row">
              <span className="bk-invoice-label">Amount:</span>
              <span className="bk-invoice-amount">৳{toWholeTaka(amount).toLocaleString("en-BD")}</span>
            </div>
          </div>

          {/* Provider config — QR + account + instructions from DB */}
          {resolvedProviderConfig.qrImageUrl && (
            <div className="bk-invoice-card" style={{ textAlign: "center" }}>
              <div className="bk-provider-qr">
                <img src={resolvedProviderConfig.qrImageUrl} alt={`${providerLabel(resolvedProvider)} QR`} />
              </div>
              {resolvedProviderConfig.accountName && (
                <p className="bk-provider-acct" style={{ marginTop: 8 }}>{resolvedProviderConfig.accountName}</p>
              )}
              <p className="bk-provider-acct" style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                Scan to pay with {providerLabel(resolvedProvider)} — or send to{" "}
                <strong style={{ color: "var(--text)" }}>{providerAccount || "the merchant number"}</strong>
              </p>
            </div>
          )}

          {resolvedProviderConfig.warning && (
            <div className="bk-provider-note" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)", color: "#92400e" }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{resolvedProviderConfig.warning}</span>
            </div>
          )}
          {resolvedProviderConfig.notice && (
            <div className="bk-provider-note" style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.3)", color: "#1e40af" }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{resolvedProviderConfig.notice}</span>
            </div>
          )}

          {/* Provider Color Section — 2-step flow */}
          <motion.div
            key={resolvedProvider + formStep}
            className="bk-pay-box"
            style={{ background: providerColor }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="bk-pay-title">{providerLabel(resolvedProvider)}</h2>
            <p className="bk-pay-sub">
              {formStep === "phone"
                ? "Your " + providerLabel(resolvedProvider) + " Account Number"
                : "Transaction ID from SMS"
              }
            </p>

            {/* Step 1 — Phone number */}
            {formStep === "phone" && (
              <div className="bk-bignum-wrap">
                <input
                  className="bk-bignum"
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={payerNumber}
                  onChange={(e) => {
                    let v = e.target.value.replace(/[^+\d]/g, "");
                    if (v.startsWith("01")) v = "+880" + v.slice(1);
                    if (v.length > 14) v = v.slice(0, 14);
                    setPayerNumber(v);
                  }}
                  required
                />
              </div>
            )}

            {/* Step 2 — TRX ID */}
            {formStep === "trx" && (
              <div className="bk-bignum-wrap">
                <input
                  className="bk-bignum"
                  type="text"
                  placeholder="A7D8K3P91"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  required
                />
              </div>
            )}

            <p className="bk-pay-hint">
              {formStep === "phone"
                ? "Enter the " + providerLabel(resolvedProvider) + " number you paid from"
                : "You'll find this in your payment confirmation SMS"
              }
            </p>

            {formStep === "phone" && resolvedProviderConfig.steps && resolvedProviderConfig.steps.length > 0 && (
              <ol className="bk-provider-steps">
                {resolvedProviderConfig.steps.map((step, si) => (
                  <li key={si}>{step}</li>
                ))}
              </ol>
            )}

            <div className="bk-btn-row">
              {formStep === "trx" && (
                <button
                  type="button"
                  className="bk-btn bk-btn--ghost"
                  onClick={() => setFormStep("phone")}
                  style={{ color: "#fff", background: "rgba(255,255,255,0.2)" }}
                >
                  Back
                </button>
              )}
              {formStep === "phone" && (
                <button
                  type="button"
                  className="bk-btn bk-btn--ghost"
                  disabled={submitting}
                  style={{ color: "#fff", background: "rgba(255,255,255,0.2)" }}
                  onClick={() => {
                    if (returnUrl) {
                      try {
                        const base = new URL(returnUrl);
                        window.location.href = base.origin + "/payment-and-confirmation";
                      } catch { window.history.back(); }
                    } else { window.history.back(); }
                  }}
                >
                  Close
                </button>
              )}
              {formStep === "phone" ? (
                <button
                  type="button"
                  className="bk-btn bk-btn--primary"
                  style={{ background: "#fff", color: providerColor }}
                  onClick={() => {
                    if (!payerNumber.trim()) return;
                    setFormStep("trx");
                  }}
                >
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="bk-btn bk-btn--primary"
                  style={{ background: "#fff", color: providerColor, opacity: termsAccepted ? 1 : 0.5 }}
                  disabled={submitting || timeLeft === 0 || !trxId.trim() || !termsAccepted}
                  onClick={(e) => submit(e)}
                >
                  {submitting ? (
                    <>
                      <div className="bk-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: providerColor, animationDuration: "0.6s" }} />
                      Processing...
                    </>
                  ) : (
                    <>Confirm <ChevronRight size={16} /></>
                  )}
                </button>
              )}
            </div>
          </motion.div>

          {/* Below the pink box — errors + terms */}
          <div className="bk-form">
            {error && error !== "return_missing" && <div className="bk-error">{error}</div>}
            {error === "return_missing" && (
              <div className="bk-error warning">
                Could not determine the store return URL. Your payment details are saved — please go back to the store and confirm.
              </div>
            )}

            {/* Terms */}
            <label className="bk-terms">
              <input
                type="checkbox"
                className="bk-checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span>I agree to the <a href={`${MAIN_SITE_URL}/terms-of-service`} target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a></span>
            </label>
          </div>
        </main>
      </motion.div>

      {/* ── How it works ── */}
      <motion.div
        className="bk-how"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
      >
        <motion.p
          className="bk-how-title"
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.4 }}
        >
          How it works
        </motion.p>

        <div className="bk-how-steps">
          {resolvedProviderConfig.steps?.map((s, idx) => (
            <motion.div
              key={idx}
              className="bk-how-step"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <span className="bk-how-num">{idx + 1}</span>
              <span className="bk-how-text">{s}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="bk-how-secure"
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.4 }}
        >
          <ShieldCheck size={16} className="bk-how-secure-icon" />
          <div>
            <p className="bk-how-secure-title">100% Secure Payment</p>
            <p className="bk-how-secure-text">
              Your payment information is safe with us. We never store your PIN or OTP.
            </p>
          </div>
        </motion.div>
      </motion.div>

      <CustomerSupportFooter supportNumber={settings.supportPhone || providerSupportNumber} supportText={settings.supportMessage} />
      <p className="bk-foot">{settings.footerText || "Powered by ZiPAY"}</p>
    </div>
  );
}

/* ────────── Payment Status Page ────────── */
function PaymentStatusPage() {
  const [requestId, setRequestId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/payments/public/status/${requestId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Not found");
    }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-shell">
        <Brand />
        <div className="checkout-copy">
          <span className="checkout-kicker">Track Payment</span>
          <h1>Check payment status</h1>
          <p>Enter your payment reference to check its current status.</p>
        </div>
        <form className="checkout-card" onSubmit={check} style={{ textAlign: "center" }}>
          <label style={{ display: "block", color: "#cbd0dc", fontSize: 12, fontWeight: 600, textAlign: "left", marginBottom: 8 }}>
            Payment reference ID
            <input required type="text" placeholder="REQ-..." value={requestId} onChange={(e) => setRequestId(e.target.value)} style={{ display: "block", width: "100%", marginTop: 7, padding: "12px 13px", border: "1px solid var(--line)", borderRadius: 9, background: "#0d1119", color: "var(--text)" }} />
          </label>
          {error && <div className="form-error">{error}</div>}
          {result && (
            <div style={{ marginTop: 16, padding: 16, background: "#0d1119", borderRadius: 10, textAlign: "left" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Amount</span><strong style={{ display: "block" }}>৳ {result.request?.amount || result.amount}</strong></div>
                <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Status</span><Status>{result.request?.status || result.status}</Status></div>
                <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Provider</span><strong style={{ display: "block" }}>{result.request?.provider || result.provider}</strong></div>
                <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Customer</span><strong style={{ display: "block" }}>{result.request?.customerName || result.customerName}</strong></div>
              </div>
            </div>
          )}
          <button className="primary-btn checkout-submit" type="submit">Check status <Search size={14} /></button>
        </form>
        <p className="checkout-footer">Powered by ZI Pay Payment Gateway</p>
      </div>
    </div>
  );
}

/* ────────── Settings Module ────────── */
const SETTINGS_TABS: { label: string; id: string; icon: Icon }[] = [
  { label: "General", id: "general", icon: Settings },
  { label: "Gateway", id: "gateway", icon: Webhook },
  { label: "Security", id: "security", icon: Shield },
  { label: "SMS", id: "sms", icon: Smartphone },
  { label: "Devices", id: "device", icon: Smartphone },
  { label: "Merchant", id: "merchant", icon: Users },
  { label: "Notifications", id: "notification", icon: Bell },
  { label: "Email", id: "email", icon: Bell },
  { label: "API", id: "api", icon: KeyRound },
  { label: "Appearance", id: "appearance", icon: Palette },
  { label: "Analytics", id: "analytics", icon: Activity },
  { label: "System", id: "system", icon: Zap },
];

function useSettings(group: string) {
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/admin/settings/${group}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((d) => { if (d.success) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [group]);

  const update = (key: string, value: any) => setData((s) => ({ ...s, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/settings/${group}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = await res.json();
      if (d.success) { setToast("Settings saved successfully"); setTimeout(() => setToast(""), 3000); }
    } catch {} finally { setSaving(false); }
  };

  return { data, loading, saving, toast, update, save };
}

const inputStyle = { display: "block", width: "100%", marginTop: 7, padding: "12px 13px", border: "1px solid var(--line)", borderRadius: 9, background: "#0d1119", color: "var(--text)" } as const;

function SettingsField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "block", color: "#cbd0dc", fontSize: 12, fontWeight: 600 }}>{label}{children}</label>;
}

function SettingsToggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div><strong style={{ color: "#cbd0dc", fontSize: 12 }}>{label}</strong>{description && <p style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>{description}</p>}</div>
      <button type="button" onClick={() => onChange(!checked)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: checked ? "var(--purple)" : "#333", cursor: "pointer", position: "relative", transition: "background .2s" }}>
        <span style={{ position: "absolute", top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
      </button>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h4 style={{ color: "#9b8cff", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>{title}</h4>
      <div style={{ display: "grid", gap: 16 }}>{children}</div>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  if (!message) return null;
  return <div style={{ position: "fixed", bottom: 24, right: 24, background: "#1db954", color: "#fff", padding: "12px 24px", borderRadius: 9, fontSize: 13, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,.4)" }}>{message}</div>;
}

/* ────────── Individual Settings Panels ────────── */

function GeneralSettings() {
  const { data, loading, saving, toast, update, save } = useSettings("general");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading settings...</div>;
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div><h2>General Settings</h2><p>Configure site identity, language, and company information.</p></div>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Site Identity">
          <SettingsField label="Site Name"><input type="text" value={data.siteName || ""} onChange={(e) => update("siteName", e.target.value)} style={inputStyle} /></SettingsField>
          <SettingsField label="Site URL"><input type="text" value={data.siteUrl || ""} onChange={(e) => update("siteUrl", e.target.value)} style={inputStyle} /></SettingsField>
          <SettingsField label="Company Name"><input type="text" value={data.companyName || ""} onChange={(e) => update("companyName", e.target.value)} style={inputStyle} /></SettingsField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <SettingsField label="Logo URL"><input type="text" value={data.logoUrl || ""} onChange={(e) => update("logoUrl", e.target.value)} style={inputStyle} /></SettingsField>
            <SettingsField label="Favicon URL"><input type="text" value={data.faviconUrl || ""} onChange={(e) => update("faviconUrl", e.target.value)} style={inputStyle} /></SettingsField>
          </div>
        </SettingsSection>
        <SettingsSection title="Contact & Localization">
          <SettingsField label="Support Email"><input type="email" value={data.supportEmail || ""} onChange={(e) => update("supportEmail", e.target.value)} style={inputStyle} /></SettingsField>
          <SettingsField label="Support Phone"><input type="text" value={data.supportPhone || ""} onChange={(e) => update("supportPhone", e.target.value)} style={inputStyle} /></SettingsField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <SettingsField label="Default Language"><input type="text" value={data.defaultLanguage || ""} onChange={(e) => update("defaultLanguage", e.target.value)} style={inputStyle} /></SettingsField>
            <SettingsField label="Timezone"><input type="text" value={data.timezone || ""} onChange={(e) => update("timezone", e.target.value)} style={inputStyle} /></SettingsField>
            <SettingsField label="Currency"><input type="text" value={data.currency || ""} onChange={(e) => update("currency", e.target.value)} style={inputStyle} /></SettingsField>
          </div>
          <SettingsField label="Date Format"><input type="text" value={data.dateFormat || ""} onChange={(e) => update("dateFormat", e.target.value)} style={inputStyle} /></SettingsField>
        </SettingsSection>
      </div>
    </div>
  );
}

function GatewaySettings() {
  const { data, loading, saving, toast, update, save } = useSettings("gateway");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading settings...</div>;
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div><h2>Gateway Settings</h2><p>Control payment gateway behavior and transaction parameters.</p></div>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Gateway Controls">
          <SettingsToggle label="Gateway Enabled" checked={data.enabled ?? true} onChange={(v) => update("enabled", v)} />
          <SettingsToggle label="Maintenance Mode" description="Put the gateway in maintenance mode for all users" checked={data.maintenanceMode ?? false} onChange={(v) => update("maintenanceMode", v)} />
        </SettingsSection>
        <SettingsSection title="Payment Parameters">
          <SettingsField label="Default Payment Expiry (minutes)"><input type="number" value={data.defaultPaymentExpiryMinutes ?? 15} onChange={(e) => update("defaultPaymentExpiryMinutes", Number(e.target.value))} style={inputStyle} /></SettingsField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <SettingsField label="Minimum Payment Amount"><input type="number" value={data.minPaymentAmount ?? 1} onChange={(e) => update("minPaymentAmount", Number(e.target.value))} style={inputStyle} /></SettingsField>
            <SettingsField label="Maximum Payment Amount"><input type="number" value={data.maxPaymentAmount ?? 500000} onChange={(e) => update("maxPaymentAmount", Number(e.target.value))} style={inputStyle} /></SettingsField>
          </div>
          <SettingsField label="Default Provider">
            <select value={data.defaultProvider || "bkash"} onChange={(e) => update("defaultProvider", e.target.value)} style={inputStyle}>
              <option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="rocket">Rocket</option>
            </select>
          </SettingsField>
        </SettingsSection>
        <SettingsSection title="Automation">
          <SettingsToggle label="Duplicate Transaction Protection" checked={data.duplicateTransactionProtection ?? true} onChange={(v) => update("duplicateTransactionProtection", v)} />
          <SettingsToggle label="Auto Verify Payments" checked={data.autoVerify ?? true} onChange={(v) => update("autoVerify", v)} />
          <SettingsToggle label="Auto Expire Pending Orders" checked={data.autoExpirePendingOrders ?? true} onChange={(v) => update("autoExpirePendingOrders", v)} />
          {data.autoExpirePendingOrders && <SettingsField label="Auto Expire After (minutes)"><input type="number" value={data.autoExpireAfterMinutes ?? 30} onChange={(e) => update("autoExpireAfterMinutes", Number(e.target.value))} style={inputStyle} /></SettingsField>}
        </SettingsSection>
      </div>
    </div>
  );
}

function SecuritySettings() {
  const { data, loading, saving, toast, update, save } = useSettings("security");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading settings...</div>;
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div><h2>Security Settings</h2><p>Configure JWT tokens, rate limiting, and password policies.</p></div>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="JWT Tokens">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <SettingsField label="Access Token Expiry"><input type="text" value={data.jwtAccessTokenExpiry || "15m"} onChange={(e) => update("jwtAccessTokenExpiry", e.target.value)} style={inputStyle} /></SettingsField>
            <SettingsField label="Refresh Token Expiry"><input type="text" value={data.jwtRefreshTokenExpiry || "7d"} onChange={(e) => update("jwtRefreshTokenExpiry", e.target.value)} style={inputStyle} /></SettingsField>
          </div>
        </SettingsSection>
        <SettingsSection title="Login Security">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <SettingsField label="Login Attempt Limit"><input type="number" value={data.loginAttemptLimit ?? 5} onChange={(e) => update("loginAttemptLimit", Number(e.target.value))} style={inputStyle} /></SettingsField>
            <SettingsField label="Block Duration (minutes)"><input type="number" value={data.loginBlockDurationMinutes ?? 15} onChange={(e) => update("loginBlockDurationMinutes", Number(e.target.value))} style={inputStyle} /></SettingsField>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <SettingsField label="Session Timeout (minutes)"><input type="number" value={data.sessionTimeoutMinutes ?? 30} onChange={(e) => update("sessionTimeoutMinutes", Number(e.target.value))} style={inputStyle} /></SettingsField>
            <SettingsField label="Max Concurrent Sessions"><input type="number" value={data.maxConcurrentSessions ?? 5} onChange={(e) => update("maxConcurrentSessions", Number(e.target.value))} style={inputStyle} /></SettingsField>
          </div>
        </SettingsSection>
        <SettingsSection title="Password Policy">
          <SettingsField label="Minimum Password Length"><input type="number" value={data.passwordMinLength ?? 8} onChange={(e) => update("passwordMinLength", Number(e.target.value))} style={inputStyle} /></SettingsField>
          <SettingsToggle label="Require Uppercase" checked={data.passwordRequireUppercase ?? false} onChange={(v) => update("passwordRequireUppercase", v)} />
          <SettingsToggle label="Require Number" checked={data.passwordRequireNumber ?? true} onChange={(v) => update("passwordRequireNumber", v)} />
          <SettingsToggle label="Require Special Character" checked={data.passwordRequireSpecialChar ?? false} onChange={(v) => update("passwordRequireSpecialChar", v)} />
        </SettingsSection>
        <SettingsSection title="Rate Limiting">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <SettingsField label="API Rate Limit (per minute)"><input type="number" value={data.apiRateLimitPerMinute ?? 120} onChange={(e) => update("apiRateLimitPerMinute", Number(e.target.value))} style={inputStyle} /></SettingsField>
            <SettingsField label="Auth Rate Limit (per minute)"><input type="number" value={data.authRateLimitPerMinute ?? 10} onChange={(e) => update("authRateLimitPerMinute", Number(e.target.value))} style={inputStyle} /></SettingsField>
          </div>
          <SettingsToggle label="Force HTTPS" checked={data.forceHttps ?? false} onChange={(v) => update("forceHttps", v)} />
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = new URLSearchParams(useLocation().search).get("tab") || "general";

  const smsTabs = [
    { id: "general", label: "General" },
    { id: "providers", label: "Providers" },
    { id: "validation", label: "SMS Validation" },
    { id: "matching", label: "Payment Matching" },
    { id: "duplicate", label: "Duplicate Protection" },
    { id: "device", label: "Device Communication" },
    { id: "retry", label: "Retry Settings" },
    { id: "storage", label: "Storage" },
    { id: "notifications", label: "Notifications" },
    { id: "logs", label: "Logs" },
    { id: "testing", label: "Testing" },
    { id: "stats", label: "Statistics" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="page-intro" style={{ marginBottom: 16, flexShrink: 0 }}>
        <div><h2>SMS Settings</h2><p>Configure SMS gateway, providers, validation, and monitoring.</p></div>
      </div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--line)", marginBottom: 20, overflowX: "auto", flexShrink: 0 }}>
        {smsTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => navigate(`/admin/settings/sms?tab=${t.id}`, { replace: true })}
            style={{
              padding: "10px 16px", border: "none", background: "none",
              color: tab === t.id ? "var(--purple)" : "var(--muted)",
              borderBottom: tab === t.id ? "2px solid var(--purple)" : "2px solid transparent",
              fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", transition: "all .15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "general" && <SmsGeneralTab />}
        {tab === "providers" && <SmsProvidersTab />}
        {tab === "validation" && <SmsValidationTab />}
        {tab === "matching" && <SmsMatchingTab />}
        {tab === "duplicate" && <SmsDuplicateTab />}
        {tab === "device" && <SmsDeviceTab />}
        {tab === "retry" && <SmsRetryTab />}
        {tab === "storage" && <SmsStorageTab />}
        {tab === "notifications" && <SmsNotificationsTab />}
        {tab === "logs" && <SmsLogsTab />}
        {tab === "testing" && <SmsTestingTab />}
        {tab === "stats" && <SmsStatsTab />}
      </div>
    </div>
  );
}

/* ──────────── SMS Sub-Tabs ──────────── */

function SmsGeneralTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>;
  return (
    <div>
      <Toast message={toast} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="SMS Gateway Controls">
          <SettingsToggle label="Enable SMS Gateway" checked={data.enabled ?? true} onChange={(v) => update("enabled", v)} />
          <SettingsToggle label="Enable Payment Detection" checked={data.paymentDetectionEnabled ?? true} onChange={(v) => update("paymentDetectionEnabled", v)} />
          <SettingsToggle label="Auto Verify Payment" checked={data.autoVerifyPayment ?? true} onChange={(v) => update("autoVerifyPayment", v)} />
          <SettingsToggle label="Auto Match Pending Orders" checked={data.autoMatchPendingOrders ?? true} onChange={(v) => update("autoMatchPendingOrders", v)} />
          <SettingsToggle label="Auto Complete Payment" checked={data.autoCompletePayment ?? false} onChange={(v) => update("autoCompletePayment", v)} />
          <SettingsToggle label="Maintenance Mode" description="Disable SMS processing temporarily" checked={data.maintenanceMode ?? false} onChange={(v) => update("maintenanceMode", v)} />
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsProvidersTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  const [activeProvider, setActiveProvider] = useState("bkash");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>;
  const providers = ["bkash", "nagad", "rocket"];
  const p = (data.providers || {})[activeProvider] || {};
  const updateProvider = (field: string, value: any) => {
    const current = { ...(data.providers || {}) };
    current[activeProvider] = { ...(current[activeProvider] || {}), [field]: value };
    update("providers", current);
  };
  return (
    <div>
      <Toast message={toast} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {providers.map((prov) => (
          <button key={prov} onClick={() => setActiveProvider(prov)}
            style={{ padding: "8px 20px", borderRadius: 8, border: activeProvider === prov ? "1px solid var(--purple)" : "1px solid var(--line)", background: activeProvider === prov ? "rgba(139,92,246,.1)" : "transparent", color: activeProvider === prov ? "var(--purple)" : "var(--text)", cursor: "pointer", fontSize: 13, textTransform: "capitalize" }}>
            {prov}
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title={`${activeProvider} Configuration`}>
          <SettingsToggle label="Enabled" checked={p.enabled ?? true} onChange={(v) => updateProvider("enabled", v)} />
          <SettingsField label="Display Name"><input type="text" value={p.displayName || ""} onChange={(e) => updateProvider("displayName", e.target.value)} style={inputStyle} /></SettingsField>
          <SettingsField label="Account Number"><input type="text" value={p.accountNumber || ""} onChange={(e) => updateProvider("accountNumber", e.target.value)} style={inputStyle} /></SettingsField>
          <SettingsField label="Account Type">
            <select value={p.accountType || "Personal"} onChange={(e) => updateProvider("accountType", e.target.value)} style={inputStyle}>
              <option value="Personal">Personal</option><option value="Agent">Agent</option>
            </select>
          </SettingsField>
          <SettingsField label="Priority"><input type="number" value={p.priority ?? 1} onChange={(e) => updateProvider("priority", Number(e.target.value))} style={inputStyle} /></SettingsField>
          <SettingsField label="Sender IDs (comma separated)"><input type="text" value={(p.senderIds || []).join(",")} onChange={(e) => updateProvider("senderIds", e.target.value.split(",").map((s: string) => s.trim()))} style={inputStyle} /></SettingsField>
          <SettingsField label="Logo URL"><input type="text" value={p.logoUrl || ""} onChange={(e) => updateProvider("logoUrl", e.target.value)} style={inputStyle} /></SettingsField>
          <SettingsField label="Status">
            <select value={p.status || "active"} onChange={(e) => updateProvider("status", e.target.value)} style={inputStyle}>
              <option value="active">Active</option><option value="inactive">Inactive</option><option value="maintenance">Maintenance</option>
            </select>
          </SettingsField>
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsValidationTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>;
  return (
    <div>
      <Toast message={toast} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Validation Rules">
          <SettingsToggle label="Accept Only Registered Devices" checked={data.acceptOnlyRegisteredDevices ?? true} onChange={(v) => update("acceptOnlyRegisteredDevices", v)} />
          <SettingsToggle label="Verify Device API Key" checked={data.verifyDeviceApiKey ?? true} onChange={(v) => update("verifyDeviceApiKey", v)} />
          <SettingsToggle label="Verify Device ID" checked={data.verifyDeviceId ?? true} onChange={(v) => update("verifyDeviceId", v)} />
          <SettingsToggle label="Verify Timestamp" checked={data.verifyTimestamp ?? true} onChange={(v) => update("verifyTimestamp", v)} />
          <SettingsToggle label="Reject Duplicate Requests" checked={data.rejectDuplicateRequests ?? true} onChange={(v) => update("rejectDuplicateRequests", v)} />
          <SettingsToggle label="Reject Invalid Provider" checked={data.rejectInvalidProvider ?? true} onChange={(v) => update("rejectInvalidProvider", v)} />
          <SettingsToggle label="Reject Invalid Amount" checked={data.rejectInvalidAmount ?? true} onChange={(v) => update("rejectInvalidAmount", v)} />
          <SettingsToggle label="Reject Old SMS" checked={data.rejectOldSms ?? true} onChange={(v) => update("rejectOldSms", v)} />
          <SettingsField label="SMS Expiration (minutes)"><input type="number" value={data.smsExpirationMinutes ?? 10} onChange={(e) => update("smsExpirationMinutes", Number(e.target.value))} style={inputStyle} /></SettingsField>
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsMatchingTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>;
  const priority = (data.matchingPriority as string[]) || ["transactionId", "amount", "phoneNumber", "provider", "pendingOrder", "timeWindow"];
  const labels: Record<string, string> = { transactionId: "Transaction ID", amount: "Amount", phoneNumber: "Phone Number", provider: "Provider", pendingOrder: "Pending Order", timeWindow: "Time Window" };
  const moveUp = (idx: number) => { if (idx === 0) return; const n = [...priority]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; update("matchingPriority", n); };
  const moveDown = (idx: number) => { if (idx === priority.length - 1) return; const n = [...priority]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; update("matchingPriority", n); };
  return (
    <div>
      <Toast message={toast} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Matching Priority (drag to reorder)">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {priority.map((item, idx) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#111", borderRadius: 8, border: "1px solid var(--line)" }}>
                <span style={{ color: "var(--muted)", fontSize: 11, minWidth: 20 }}>{idx + 1}.</span>
                <span style={{ flex: 1, fontSize: 13 }}>{labels[item] || item}</span>
                <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ border: "none", background: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}>▲</button>
                <button onClick={() => moveDown(idx)} disabled={idx === priority.length - 1} style={{ border: "none", background: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}>▼</button>
              </div>
            ))}
          </div>
        </SettingsSection>
        <SettingsSection title="Additional Options">
          <SettingsField label="Amount Tolerance"><input type="number" value={data.amountTolerance ?? 0} onChange={(e) => update("amountTolerance", Number(e.target.value))} style={inputStyle} /></SettingsField>
          <SettingsField label="Match Time Window (minutes)"><input type="number" value={data.matchTimeWindowMinutes ?? 15} onChange={(e) => update("matchTimeWindowMinutes", Number(e.target.value))} style={inputStyle} /></SettingsField>
          <SettingsToggle label="Allow Partial Match" checked={data.allowPartialMatch ?? false} onChange={(v) => update("allowPartialMatch", v)} />
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsDuplicateTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>;
  return (
    <div>
      <Toast message={toast} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Duplicate Detection">
          <SettingsToggle label="Duplicate Transaction ID" checked={data.duplicateTransactionId ?? true} onChange={(v) => update("duplicateTransactionId", v)} />
          <SettingsToggle label="Duplicate SMS Hash" checked={data.duplicateSmsHash ?? true} onChange={(v) => update("duplicateSmsHash", v)} />
          <SettingsToggle label="Duplicate Request" checked={data.duplicateRequest ?? true} onChange={(v) => update("duplicateRequest", v)} />
          <SettingsField label="Duplicate Time Window (minutes)"><input type="number" value={data.duplicateTimeWindowMinutes ?? 10} onChange={(e) => update("duplicateTimeWindowMinutes", Number(e.target.value))} style={inputStyle} /></SettingsField>
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsDeviceTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>;
  return (
    <div>
      <Toast message={toast} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Device Communication">
          <SettingsField label="Heartbeat Interval (seconds)"><input type="number" value={data.heartbeatIntervalSeconds ?? 30} onChange={(e) => update("heartbeatIntervalSeconds", Number(e.target.value))} style={inputStyle} /></SettingsField>
          <SettingsField label="Offline Timeout (seconds)"><input type="number" value={data.offlineTimeoutSeconds ?? 120} onChange={(e) => update("offlineTimeoutSeconds", Number(e.target.value))} style={inputStyle} /></SettingsField>
          <SettingsField label="Minimum App Version"><input type="text" value={data.minimumAppVersion || "1.0.0"} onChange={(e) => update("minimumAppVersion", e.target.value)} style={inputStyle} /></SettingsField>
          <SettingsToggle label="Force App Update" checked={data.forceAppUpdate ?? false} onChange={(v) => update("forceAppUpdate", v)} />
          <SettingsToggle label="Device Approval Required" checked={data.deviceApprovalRequired ?? true} onChange={(v) => update("deviceApprovalRequired", v)} />
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsRetryTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>;
  return (
    <div>
      <Toast message={toast} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Retry Configuration">
          <SettingsField label="Retry Count"><input type="number" value={data.retryCount ?? 3} onChange={(e) => update("retryCount", Number(e.target.value))} style={inputStyle} /></SettingsField>
          <SettingsField label="Retry Delay (seconds)"><input type="number" value={data.retryDelaySeconds ?? 30} onChange={(e) => update("retryDelaySeconds", Number(e.target.value))} style={inputStyle} /></SettingsField>
          <SettingsField label="Queue Size"><input type="number" value={data.queueSize ?? 100} onChange={(e) => update("queueSize", Number(e.target.value))} style={inputStyle} /></SettingsField>
          <SettingsToggle label="Auto Resend" checked={data.autoResend ?? false} onChange={(v) => update("autoResend", v)} />
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsStorageTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  const [cleanupMsg, setCleanupMsg] = useState("");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>;
  const doCleanup = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/settings/sms/cleanup`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await res.json();
      setCleanupMsg(`Cleaned up ${d.data?.deleted || 0} old SMS records.`);
    } catch { setCleanupMsg("Cleanup failed."); }
  };
  return (
    <div>
      <Toast message={toast} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="SMS Storage">
          <SettingsToggle label="Save Raw SMS" checked={data.saveRawSms ?? true} onChange={(v) => update("saveRawSms", v)} />
          <SettingsToggle label="Save Parsed SMS" checked={data.saveParsedSms ?? true} onChange={(v) => update("saveParsedSms", v)} />
          <SettingsField label="SMS Retention (days)"><input type="number" value={data.smsRetentionDays ?? 90} onChange={(e) => update("smsRetentionDays", Number(e.target.value))} style={inputStyle} /></SettingsField>
          <SettingsToggle label="Auto Cleanup" checked={data.autoCleanup ?? true} onChange={(v) => update("autoCleanup", v)} />
        </SettingsSection>
        <div style={{ marginTop: 16, padding: "16px 0", borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="outline-btn" onClick={doCleanup}>Manual Cleanup</button>
            {cleanupMsg && <span style={{ fontSize: 12, color: "#1db954" }}>{cleanupMsg}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SmsNotificationsTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>;
  return (
    <div>
      <Toast message={toast} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Notification Channels">
          <SettingsToggle label="Browser Notification" checked={data.browserNotification ?? false} onChange={(v) => update("browserNotification", v)} />
          <SettingsToggle label="Email Notification" checked={data.emailNotification ?? true} onChange={(v) => update("emailNotification", v)} />
          <SettingsToggle label="Webhook Notification" checked={data.webhookNotification ?? true} onChange={(v) => update("webhookNotification", v)} />
        </SettingsSection>
        <SettingsSection title="Trigger Events">
          <SettingsToggle label="New Payment" checked={data.notifyNewPayment ?? true} onChange={(v) => update("notifyNewPayment", v)} />
          <SettingsToggle label="Failed Verification" checked={data.notifyFailedVerification ?? true} onChange={(v) => update("notifyFailedVerification", v)} />
          <SettingsToggle label="Duplicate SMS" checked={data.notifyDuplicateSms ?? false} onChange={(v) => update("notifyDuplicateSms", v)} />
          <SettingsToggle label="Device Offline" checked={data.notifyDeviceOffline ?? true} onChange={(v) => update("notifyDeviceOffline", v)} />
          <SettingsToggle label="API Error" checked={data.notifyApiError ?? true} onChange={(v) => update("notifyApiError", v)} />
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [loading, setLoading] = useState(true);
  const limit = 15;

  const fetchLogs = (p: number) => {
    setLoading(true);
    fetch(`${API_URL}/api/admin/settings/sms/logs?page=${p}&limit=${limit}&search=${encodeURIComponent(search)}&type=${type}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((d) => { if (d.success) { setLogs(d.data.logs); setTotal(d.data.total); setPage(p); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(1); }, [type, search]);

  const logTypes = ["all", "sms_received", "payment_verified", "payment_failed", "device_online", "device_offline"];
  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input type="text" placeholder="Search transactions, phone..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 6, background: "#0d1119", color: "var(--text)", fontSize: 12, minWidth: 200 }} />
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 6, background: "#0d1119", color: "var(--text)", fontSize: 12 }}>
          {logTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <button className="outline-btn" style={{ fontSize: 12 }} onClick={() => {/* CSV export */}}>Export CSV</button>
        <button className="outline-btn" style={{ fontSize: 12 }} onClick={() => {/* Excel export */}}>Export Excel</button>
      </div>
      <div className="card" style={{ padding: "20px 20px 7px" }}>
        <div className="table-wrap" style={{ margin: "0 -20px -7px" }}>
          <table>
            <thead><tr><th>Time</th><th>Action</th><th>Message</th><th>Type</th><th>Details</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} style={{ textAlign: "center", padding: 30, color: "var(--muted)" }}>Loading...</td></tr>
              : logs.length === 0 ? <tr><td colSpan={5} style={{ textAlign: "center", padding: 30, color: "var(--muted)" }}>No logs found</td></tr>
              : logs.map((l: any) => (
                <tr key={l._id}>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(l.createdAt).toLocaleString()}</td>
                  <td><span className={`status ${l.severity || "info"}`}><i />{l.action}</span></td>
                  <td style={{ fontSize: 12, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>{l.message}</td>
                  <td style={{ fontSize: 11 }}>{l.entityType || "—"}</td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>{JSON.stringify(l.metadata?.parsed || {}).substring(0, 60)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {total > limit && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
          <button className="outline-btn" disabled={page <= 1} onClick={() => fetchLogs(page - 1)}>Previous</button>
          <span style={{ fontSize: 12, color: "var(--muted)", padding: "6px 12px" }}>Page {page} of {Math.ceil(total / limit)}</span>
          <button className="outline-btn" disabled={page >= Math.ceil(total / limit)} onClick={() => fetchLogs(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

function SmsTestingTab() {
  const [smsText, setSmsText] = useState("");
  const [provider, setProvider] = useState("bkash");
  const [deviceId, setDeviceId] = useState("test-device-001");
  const [result, setResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const testSms = async () => {
    setTesting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/settings/sms/test`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ smsText, provider, deviceId }),
      });
      const d = await res.json();
      setResult(d.data || d);
    } catch { setResult({ error: "Test failed" }); }
    finally { setTesting(false); }
  };

  return (
    <div>
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <SettingsSection title="SMS Testing Tool">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <SettingsField label="Provider">
              <select value={provider} onChange={(e) => setProvider(e.target.value)} style={inputStyle}>
                <option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="rocket">Rocket</option>
              </select>
            </SettingsField>
            <SettingsField label="Device ID"><input type="text" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} style={inputStyle} /></SettingsField>
          </div>
          <SettingsField label="SMS Text"><textarea rows={4} value={smsText} onChange={(e) => setSmsText(e.target.value)} placeholder="Paste the SMS content here..." style={{ ...inputStyle, resize: "vertical" }} /></SettingsField>
          <button className="primary-btn" onClick={testSms} disabled={testing || !smsText} style={{ marginTop: 12 }}>
            {testing ? "Testing..." : "Test Payment Detection"} <ArrowUpRight size={14} />
          </button>
        </SettingsSection>
      </div>

      {result && (
        <div className="card" style={{ padding: 24 }}>
          <SettingsSection title="Parsed Result">
            {result.parsed ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Provider</span><p style={{ fontSize: 13, textTransform: "capitalize" }}>{result.parsed.provider}</p></div>
                <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Amount</span><p style={{ fontSize: 13 }}>৳ {result.parsed.amount}</p></div>
                <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Sender</span><p style={{ fontSize: 13 }}>{result.parsed.sender}</p></div>
                <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Phone</span><p style={{ fontSize: 13 }}>{result.parsed.phone}</p></div>
                <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Transaction ID</span><p style={{ fontSize: 13 }}>{result.parsed.transactionId || "N/A"}</p></div>
                <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Payment Time</span><p style={{ fontSize: 13 }}>{new Date(result.parsed.paymentTime).toLocaleString()}</p></div>
                <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Validation</span><p style={{ fontSize: 13, color: result.parsed.validationResult === "success" ? "#1db954" : "#e97389" }}>{result.parsed.validationResult}</p></div>
                <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Status</span><p style={{ fontSize: 13 }}>{result.parsed.finalStatus}</p></div>
              </div>
            ) : <p style={{ color: "var(--muted)", fontSize: 13 }}>{result.error || "No result"}</p>}
          </SettingsSection>
          {result.issues?.length > 0 && (
            <SettingsSection title="Issues">
              <ul style={{ color: "#e97389", fontSize: 12, paddingLeft: 16 }}>{result.issues.map((i: string, idx: number) => <li key={idx}>{i}</li>)}</ul>
            </SettingsSection>
          )}
          <SettingsSection title="Raw JSON Response">
            <pre style={{ background: "#0a0a0f", padding: 16, borderRadius: 8, fontSize: 11, color: "#7dd3fc", overflow: "auto", maxHeight: 300, border: "1px solid var(--line)" }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </SettingsSection>
        </div>
      )}
    </div>
  );
}

function SmsStatsTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API_URL}/api/admin/settings/sms/stats`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((res) => res.json())
      .then((d) => { if (d.success) setStats(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading stats...</div>;
  const s = stats || {};
  return (
    <div>
      <div className="metrics" style={{ marginBottom: 14 }}>
        <Metric label="SMS Received Today" value={String(s.smsReceivedToday ?? 0)} delta="—" icon={Bell} tone="purple" />
        <Metric label="Payments Verified" value={String(s.paymentsVerified ?? 0)} delta="—" icon={CheckCircle2} tone="green" />
        <Metric label="Pending Payments" value={String(s.pendingPayments ?? 0)} delta="—" icon={Clock} tone="orange" />
        <Metric label="Failed Verification" value={String(s.failedVerification ?? 0)} delta="—" icon={X} tone="red" />
      </div>
      <div className="metrics" style={{ marginBottom: 14 }}>
        <Metric label="Duplicate SMS" value={String(s.duplicateSms ?? 0)} delta="—" icon={Copy} tone="orange" />
        <Metric label="Online Devices" value={String(s.onlineDevices ?? 0)} delta="—" icon={Wifi} tone="green" />
        <Metric label="Success Rate" value={`${s.charts?.successRate ?? 0}%`} delta="—" icon={Activity} tone="blue" />
        <Metric label="—" value="—" delta="—" icon={Zap} tone="purple" />
      </div>
      {s.charts?.providerDistribution && (
        <div className="card" style={{ padding: 20, marginBottom: 14 }}>
          <div className="card-heading"><span className="card-kicker">Provider Distribution</span></div>
          {s.charts.providerDistribution.map((p: any) => (
            <React.Fragment key={p.name}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontSize: 13 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{p.count} ({p.percentage}%)</span>
              </div>
              <div className="progress"><i style={{ width: `${p.percentage}%`, background: p.name === "bkash" ? "#e84d8a" : p.name === "nagad" ? "#f47e35" : "#8049b8" }} /></div>
            </React.Fragment>
          ))}
        </div>
      )}
      {s.charts?.hourly && (
        <div className="card" style={{ padding: 20 }}>
          <div className="card-heading"><span className="card-kicker">Hourly SMS Today</span></div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 100, marginTop: 12 }}>
            {s.charts.hourly.map((h: any) => {
              const max = Math.max(...s.charts.hourly.map((x: any) => x.count), 1);
              return <div key={h.hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: "100%", maxWidth: 30, height: `${(h.count / max) * 80}px`, minHeight: 2, background: "var(--purple)", borderRadius: "3px 3px 0 0" }} />
                <span style={{ fontSize: 9, color: "var(--muted)", marginTop: 4 }}>{h.hour}h</span>
              </div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DeviceSettings() {
  const { data, loading, saving, toast, update, save } = useSettings("device");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading settings...</div>;
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div><h2>Device Settings</h2><p>Configure Android SMS reader device management.</p></div>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Device Limits">
          <SettingsField label="Max Devices Per Merchant"><input type="number" value={data.maxDevicesPerMerchant ?? 10} onChange={(e) => update("maxDevicesPerMerchant", Number(e.target.value))} style={inputStyle} /></SettingsField>
          <SettingsField label="Minimum App Version"><input type="text" value={data.minimumAppVersion || "1.0.0"} onChange={(e) => update("minimumAppVersion", e.target.value)} style={inputStyle} /></SettingsField>
        </SettingsSection>
        <SettingsSection title="Heartbeat & Timeout">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <SettingsField label="Heartbeat Interval (seconds)"><input type="number" value={data.heartbeatIntervalSeconds ?? 30} onChange={(e) => update("heartbeatIntervalSeconds", Number(e.target.value))} style={inputStyle} /></SettingsField>
            <SettingsField label="Offline Timeout (seconds)"><input type="number" value={data.offlineTimeoutSeconds ?? 120} onChange={(e) => update("offlineTimeoutSeconds", Number(e.target.value))} style={inputStyle} /></SettingsField>
          </div>
        </SettingsSection>
        <SettingsSection title="Approval">
          <SettingsToggle label="Require Device Approval" checked={data.requireDeviceApproval ?? true} onChange={(v) => update("requireDeviceApproval", v)} />
          <SettingsToggle label="Auto Disable Offline Device" checked={data.autoDisableOfflineDevice ?? true} onChange={(v) => update("autoDisableOfflineDevice", v)} />
        </SettingsSection>
      </div>
    </div>
  );
}

function MerchantSettings() {
  const { data, loading, saving, toast, update, save } = useSettings("merchant");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading settings...</div>;
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div><h2>Merchant Settings</h2><p>Configure merchant registration and default limits.</p></div>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Registration">
          <SettingsToggle label="Allow Merchant Registration" checked={data.allowRegistration ?? true} onChange={(v) => update("allowRegistration", v)} />
          <SettingsToggle label="Require Email Verification" checked={data.requireEmailVerification ?? true} onChange={(v) => update("requireEmailVerification", v)} />
          <SettingsToggle label="Require Manual Approval" checked={data.requireManualApproval ?? false} onChange={(v) => update("requireManualApproval", v)} />
        </SettingsSection>
        <SettingsSection title="Defaults">
          <SettingsField label="Default Plan"><input type="text" value={data.defaultPlan || "free"} onChange={(e) => update("defaultPlan", e.target.value)} style={inputStyle} /></SettingsField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <SettingsField label="Default Transaction Limit"><input type="number" value={data.defaultTransactionLimit ?? 1000} onChange={(e) => update("defaultTransactionLimit", Number(e.target.value))} style={inputStyle} /></SettingsField>
            <SettingsField label="Default Device Limit"><input type="number" value={data.defaultDeviceLimit ?? 5} onChange={(e) => update("defaultDeviceLimit", Number(e.target.value))} style={inputStyle} /></SettingsField>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const { data, loading, saving, toast, update, save } = useSettings("notification");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading settings...</div>;
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div><h2>Notification Settings</h2><p>Manage email, browser, and webhook notification channels.</p></div>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Channels">
          <SettingsToggle label="Email Notifications" checked={data.emailNotifications ?? true} onChange={(v) => update("emailNotifications", v)} />
          <SettingsToggle label="Browser Notifications" checked={data.browserNotifications ?? false} onChange={(v) => update("browserNotifications", v)} />
          <SettingsToggle label="Webhook Notifications" checked={data.webhookNotifications ?? true} onChange={(v) => update("webhookNotifications", v)} />
        </SettingsSection>
        <SettingsSection title="Event Notifications">
          <SettingsToggle label="Payment Success Notification" checked={data.paymentSuccessNotify ?? true} onChange={(v) => update("paymentSuccessNotify", v)} />
          <SettingsToggle label="Payment Failed Notification" checked={data.paymentFailedNotify ?? true} onChange={(v) => update("paymentFailedNotify", v)} />
          <SettingsToggle label="Offline Device Alert" checked={data.offlineDeviceAlert ?? true} onChange={(v) => update("offlineDeviceAlert", v)} />
        </SettingsSection>
      </div>
    </div>
  );
}

function EmailSettings() {
  const { data, loading, saving, toast, update, save } = useSettings("email");
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testMsg, setTestMsg] = useState("");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading settings...</div>;
  const testEmail = async () => {
    setTesting(true); setTestMsg("");
    try {
      const res = await fetch(`${API_URL}/api/admin/settings/email/test`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo }),
      });
      const d = await res.json();
      setTestMsg(d.message || d.error || "Done");
    } catch { setTestMsg("Test failed"); }
    finally { setTesting(false); }
  };
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div><h2>Email Settings</h2><p>Configure SMTP server for transactional emails.</p></div>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="SMTP Configuration">
          <SettingsField label="SMTP Host"><input type="text" value={data.smtpHost || ""} onChange={(e) => update("smtpHost", e.target.value)} style={inputStyle} /></SettingsField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <SettingsField label="SMTP Port"><input type="number" value={data.smtpPort ?? 587} onChange={(e) => update("smtpPort", Number(e.target.value))} style={inputStyle} /></SettingsField>
            <SettingsField label="Encryption">
              <select value={data.encryption || "tls"} onChange={(e) => update("encryption", e.target.value)} style={inputStyle}>
                <option value="none">None</option><option value="ssl">SSL</option><option value="tls">TLS</option>
              </select>
            </SettingsField>
          </div>
          <SettingsField label="SMTP Username"><input type="text" value={data.smtpUsername || ""} onChange={(e) => update("smtpUsername", e.target.value)} style={inputStyle} /></SettingsField>
          <SettingsField label="SMTP Password"><input type="password" value={data.smtpPassword || ""} onChange={(e) => update("smtpPassword", e.target.value)} style={inputStyle} /></SettingsField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <SettingsField label="Sender Name"><input type="text" value={data.senderName || ""} onChange={(e) => update("senderName", e.target.value)} style={inputStyle} /></SettingsField>
            <SettingsField label="Sender Email"><input type="email" value={data.senderEmail || ""} onChange={(e) => update("senderEmail", e.target.value)} style={inputStyle} /></SettingsField>
          </div>
        </SettingsSection>
        <SettingsSection title="Test Email">
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <SettingsField label="Send Test To"><input type="email" placeholder="test@example.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} style={inputStyle} /></SettingsField>
            </div>
            <button className="outline-btn" onClick={testEmail} disabled={testing || !testTo}>{testing ? "Sending..." : "Send Test"}</button>
          </div>
          {testMsg && <p style={{ color: testMsg.includes("would be") || testMsg.includes("sent") ? "#1db954" : "#e97389", fontSize: 12, marginTop: 8 }}>{testMsg}</p>}
        </SettingsSection>
      </div>
    </div>
  );
}

function ApiSettings() {
  const { data, loading, saving, toast, update, save } = useSettings("api");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading settings...</div>;
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div><h2>API Settings</h2><p>Manage API access and versioning.</p></div>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="API Configuration">
          <SettingsToggle label="Enable API" checked={data.enableApi ?? true} onChange={(v) => update("enableApi", v)} />
          <SettingsField label="API Version"><input type="text" value={data.apiVersion || "v1"} onChange={(e) => update("apiVersion", e.target.value)} style={inputStyle} /></SettingsField>
        </SettingsSection>
        <div className="card empty-card" style={{ marginTop: 16 }}>
          <div className="empty-icon"><KeyRound size={22} /></div>
          <h3>API Keys Management</h3>
          <p>Manage your merchant API keys from the <strong>API Keys</strong> page in the main navigation.</p>
          <button className="outline-btn" onClick={() => window.location.href = "/admin/api-keys"}>Go to API Keys <ArrowUpRight size={14} /></button>
        </div>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const { data, loading, saving, toast, update, save } = useSettings("appearance");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading settings...</div>;
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div><h2>Appearance Settings</h2><p>Customize the admin panel look and feel.</p></div>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Theme">
          <SettingsField label="Theme Mode">
            <select value={data.theme || "dark"} onChange={(e) => update("theme", e.target.value)} style={inputStyle}>
              <option value="dark">Dark</option><option value="light">Light</option>
            </select>
          </SettingsField>
          <SettingsField label="Primary Color"><input type="color" value={data.primaryColor || "#8b5cf6"} onChange={(e) => update("primaryColor", e.target.value)} style={{ ...inputStyle, padding: "4px 13px", height: 44 }} /></SettingsField>
        </SettingsSection>
        <SettingsSection title="Layout">
          <SettingsField label="Sidebar Style">
            <select value={data.sidebarStyle || "default"} onChange={(e) => update("sidebarStyle", e.target.value)} style={inputStyle}>
              <option value="default">Default</option><option value="compact">Compact</option>
            </select>
          </SettingsField>
          <SettingsField label="Dashboard Layout">
            <select value={data.dashboardLayout || "grid"} onChange={(e) => update("dashboardLayout", e.target.value)} style={inputStyle}>
              <option value="grid">Grid</option><option value="list">List</option>
            </select>
          </SettingsField>
        </SettingsSection>
      </div>
    </div>
  );
}

function AnalyticsSettings() {
  const { data, loading, saving, toast, update, save } = useSettings("analytics");
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading settings...</div>;
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div><h2>Analytics Settings</h2><p>Configure analytics and reporting preferences.</p></div>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Dashboard">
          <SettingsField label="Default Dashboard Range (days)"><input type="text" value={data.defaultDashboardRange || "30"} onChange={(e) => update("defaultDashboardRange", e.target.value)} style={inputStyle} /></SettingsField>
        </SettingsSection>
        <SettingsSection title="Features">
          <SettingsToggle label="Enable Revenue Charts" checked={data.enableRevenueCharts ?? true} onChange={(v) => update("enableRevenueCharts", v)} />
          <SettingsToggle label="Enable CSV Export" checked={data.enableExportCsv ?? true} onChange={(v) => update("enableExportCsv", v)} />
          <SettingsToggle label="Enable Excel Export" checked={data.enableExportExcel ?? false} onChange={(v) => update("enableExportExcel", v)} />
        </SettingsSection>
      </div>
    </div>
  );
}

function SystemStatusPage() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API_URL}/api/admin/settings/system-info`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((res) => res.json())
      .then((d) => { if (d.success) setInfo(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading system info...</div>;
  const i = info || {};
  return (
    <div>
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div><div className="resource-title"><div className="metric-icon purple"><Zap size={19} /></div><h2>System Status</h2></div><p>Monitor server health, resource usage, and environment details.</p></div>
      </div>
      <div className="metrics" style={{ marginBottom: 14 }}>
        <Metric label="Uptime" value={i.uptimeFormatted || "N/A"} delta="—" icon={Activity} tone="purple" />
        <Metric label="Memory (RSS)" value={i.memory?.rss || "N/A"} delta="—" icon={Zap} tone="blue" />
        <Metric label="MongoDB" value={i.mongo?.status || "N/A"} delta="—" icon={Zap} tone="green" />
        <Metric label="Environment" value={i.environment || "N/A"} delta="—" icon={Zap} tone="orange" />
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Server">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Node Version</span><p style={{ fontSize: 13 }}>{i.nodeVersion}</p></div>
            <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Platform</span><p style={{ fontSize: 13 }}>{i.platform} ({i.arch})</p></div>
            <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Heap Used</span><p style={{ fontSize: 13 }}>{i.memory?.heapUsed}</p></div>
            <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Heap Total</span><p style={{ fontSize: 13 }}>{i.memory?.heapTotal}</p></div>
          </div>
        </SettingsSection>
        <SettingsSection title="MongoDB">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Status</span><p style={{ fontSize: 13, color: i.mongo?.status === "connected" ? "#1db954" : "#e97389" }}>{i.mongo?.status}</p></div>
            <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Host</span><p style={{ fontSize: 13 }}>{i.mongo?.host}</p></div>
            <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Database</span><p style={{ fontSize: 13 }}>{i.mongo?.name}</p></div>
          </div>
        </SettingsSection>
        <SettingsSection title="Storage">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Total</span><p style={{ fontSize: 13 }}>{i.storage?.total}</p></div>
            <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Used</span><p style={{ fontSize: 13 }}>{i.storage?.used}</p></div>
            <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Free</span><p style={{ fontSize: 13 }}>{i.storage?.free}</p></div>
          </div>
        </SettingsSection>
        <SettingsSection title="CPU">
          <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Model</span><p style={{ fontSize: 13 }}>{i.cpu?.model}</p></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Cores</span><p style={{ fontSize: 13 }}>{i.cpu?.cores}</p></div>
            <div><span style={{ color: "var(--muted)", fontSize: 11 }}>Load Avg</span><p style={{ fontSize: 13 }}>{i.cpu?.loadAvg?.join(", ")}</p></div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

/* ────────── Settings Shell ────────── */
function AdminSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = location.pathname.replace("/admin/settings/", "") || "general";
  const activeTab = SETTINGS_TABS.find((t) => t.id === currentTab) ? currentTab : "general";

  return (
    <div style={{ display: "flex", gap: 0, height: "100%" }}>
      {/* Settings Sidebar */}
      <nav style={{ width: 200, minWidth: 200, borderRight: "1px solid var(--line)", padding: "16px 0", overflowY: "auto" }}>
        {SETTINGS_TABS.map(({ label, id, icon: I }) => (
          <button
            key={id}
            onClick={() => navigate(`/admin/settings/${id}`)}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px",
              border: "none", background: activeTab === id ? "rgba(139,92,246,.15)" : "transparent",
              color: activeTab === id ? "var(--purple)" : "var(--text)", fontSize: 12, cursor: "pointer",
              borderLeft: activeTab === id ? "3px solid var(--purple)" : "3px solid transparent",
              textAlign: "left", transition: "all .15s",
            }}
          >
            <I size={16} />{label}
          </button>
        ))}
      </nav>
      {/* Settings Content */}
      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
        <Routes>
          <Route index element={<Navigate to="general" replace />} />
          <Route path="general" element={<GeneralSettings />} />
          <Route path="gateway" element={<GatewaySettings />} />
          <Route path="security" element={<SecuritySettings />} />
          <Route path="sms" element={<SmsSettings />} />
          <Route path="device" element={<DeviceSettings />} />
          <Route path="merchant" element={<MerchantSettings />} />
          <Route path="notification" element={<NotificationSettings />} />
          <Route path="email" element={<EmailSettings />} />
          <Route path="api" element={<ApiSettings />} />
          <Route path="appearance" element={<AppearanceSettings />} />
          <Route path="analytics" element={<AnalyticsSettings />} />
          <Route path="system" element={<SystemStatusPage />} />
          <Route path="*" element={<Navigate to="general" replace />} />
        </Routes>
      </div>
    </div>
  );
}

/* ────────── Admin Layout ────────── */
function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(true);

  /* Hydrate user data from /api/auth/me on mount */
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (data?.success && data?.data?.user) setUser(data.data.user);
      })
      .catch(() => { /* keep whatever was in localStorage */ });
  }, []);

  return (
    <div className={`app ${dark ? "dark" : "light"}`}>
      <Sidebar collapsed={sidebarOpen} close={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}
      <div className="main">
        <Header onMenu={() => setSidebarOpen((v) => !v)} dark={dark} setDark={setDark} />
        <div className="content">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="requests" element={<ResourcePage title="Payment requests" icon={FileText} description="View and manage incoming payment requests." button="Create request" />} />
            <Route path="pay-settings" element={<PaySettingsPage />} />
            <Route path="devices" element={<DevicesPage />} />
            <Route path="api-keys" element={<ApiKeysPage />} />
            <Route path="webhooks" element={<ResourcePage title="Webhooks" icon={Webhook} description="Configure webhook endpoints for real-time event delivery." button="Add webhook" />} />
            <Route path="payment-methods" element={<PaymentMethodsPage />} />
            <Route path="users" element={<ResourcePage title="Users" icon={Users} description="Manage admin users and their role assignments." button="Add user" />} />
            <Route path="activity-logs" element={<ResourcePage title="Activity Logs" icon={Activity} description="View system-wide activity and audit logs." button="Export logs" />} />
            <Route path="settings/*" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

/* ────────── Root App ────────── */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pay" element={<Checkout />} />
        <Route path="/payment/invoice" element={<InvoicePayment />} />
        <Route path="/track" element={<PaymentStatusPage />} />
        <Route path="/status/:requestId" element={<PaymentStatusPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<AdminGuard><AdminLayout /></AdminGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/* ────────── Mount ────────── */
createRoot(document.getElementById("root")!).render(<App />);

export default App;
