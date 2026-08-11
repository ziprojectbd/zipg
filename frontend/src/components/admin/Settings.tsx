import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Routes, Route, Navigate } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock,
  Copy,
  KeyRound,
  Palette,
  Settings,
  Shield,
  Smartphone,
  Users,
  Webhook,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { Metric, Spinner } from "./ui";

/* ──── Constants ──── */
function getToken(): string | null {
  return localStorage.getItem("zi-pay-token");
}

const RAW_API = import.meta.env.VITE_API_URL || "";
const API_URL = RAW_API.replace(/\/api\/?$/, "");

/* ──── Settings Tabs ──── */
const SETTINGS_TABS: { label: string; id: string; icon: React.ComponentType<{ size?: number }> }[] = [
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

/* ──── useSettings hook ──── */
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
      .then((d) => {
        if (d.success) setData(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [group]);

  const update = (key: string, value: any) => setData((s) => ({ ...s, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/settings/${group}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const d = await res.json();
      if (d.success) {
        setToast("Settings saved successfully");
        setTimeout(() => setToast(""), 3000);
      }
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return { data, loading, saving, toast, update, save };
}

/* ──── Helpers ──── */
const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: 7,
  padding: "12px 13px",
  border: "1px solid var(--line)",
  borderRadius: 9,
  background: "#0d1119",
  color: "var(--text)",
} as const;

function SettingsField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "block",
        color: "#cbd0dc",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
      {children}
    </label>
  );
}

function SettingsToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <strong style={{ color: "#cbd0dc", fontSize: 12 }}>{label}</strong>
        {description && (
          <p
            style={{
              color: "var(--muted)",
              fontSize: 11,
              marginTop: 2,
            }}
          >
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          border: "none",
          background: checked ? "var(--purple)" : "#333",
          cursor: "pointer",
          position: "relative",
          transition: "background .2s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            transition: "left .2s",
          }}
        />
      </button>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h4
        style={{
          color: "#9b8cff",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 12,
        }}
      >
        {title}
      </h4>
      <div style={{ display: "grid", gap: 16 }}>{children}</div>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        background: "#1db954",
        color: "#fff",
        padding: "12px 24px",
        borderRadius: 9,
        fontSize: 13,
        zIndex: 9999,
        boxShadow: "0 4px 20px rgba(0,0,0,.4)",
      }}
    >
      {message}
    </div>
  );
}

/* ══════════════════════════════════════════════ */
/*          Individual Settings Panels            */
/* ══════════════════════════════════════════════ */

function GeneralSettings() {
  const { data, loading, saving, toast, update, save } = useSettings("general");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>
        Loading settings...
      </div>
    );
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div>
          <h2>General Settings</h2>
          <p>Configure site identity, language, and company information.</p>
        </div>
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Site Identity">
          <SettingsField label="Site Name">
            <input
              type="text"
              value={data.siteName || ""}
              onChange={(e) => update("siteName", e.target.value)}
              style={inputStyle}
            />
          </SettingsField>
          <SettingsField label="Site URL">
            <input
              type="text"
              value={data.siteUrl || ""}
              onChange={(e) => update("siteUrl", e.target.value)}
              style={inputStyle}
            />
          </SettingsField>
          <SettingsField label="Company Name">
            <input
              type="text"
              value={data.companyName || ""}
              onChange={(e) => update("companyName", e.target.value)}
              style={inputStyle}
            />
          </SettingsField>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <SettingsField label="Logo URL">
              <input
                type="text"
                value={data.logoUrl || ""}
                onChange={(e) => update("logoUrl", e.target.value)}
                style={inputStyle}
              />
            </SettingsField>
            <SettingsField label="Favicon URL">
              <input
                type="text"
                value={data.faviconUrl || ""}
                onChange={(e) => update("faviconUrl", e.target.value)}
                style={inputStyle}
              />
            </SettingsField>
          </div>
        </SettingsSection>
        <SettingsSection title="Contact & Localization">
          <SettingsField label="Support Email">
            <input
              type="email"
              value={data.supportEmail || ""}
              onChange={(e) => update("supportEmail", e.target.value)}
              style={inputStyle}
            />
          </SettingsField>
          <SettingsField label="Support Phone">
            <input
              type="text"
              value={data.supportPhone || ""}
              onChange={(e) => update("supportPhone", e.target.value)}
              style={inputStyle}
            />
          </SettingsField>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
            }}
          >
            <SettingsField label="Default Language">
              <input
                type="text"
                value={data.defaultLanguage || ""}
                onChange={(e) => update("defaultLanguage", e.target.value)}
                style={inputStyle}
              />
            </SettingsField>
            <SettingsField label="Timezone">
              <input
                type="text"
                value={data.timezone || ""}
                onChange={(e) => update("timezone", e.target.value)}
                style={inputStyle}
              />
            </SettingsField>
            <SettingsField label="Currency">
              <input
                type="text"
                value={data.currency || ""}
                onChange={(e) => update("currency", e.target.value)}
                style={inputStyle}
              />
            </SettingsField>
          </div>
          <SettingsField label="Date Format">
            <input
              type="text"
              value={data.dateFormat || ""}
              onChange={(e) => update("dateFormat", e.target.value)}
              style={inputStyle}
            />
          </SettingsField>
        </SettingsSection>
      </div>
    </div>
  );
}

function GatewaySettings() {
  const { data, loading, saving, toast, update, save } = useSettings("gateway");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>
        Loading settings...
      </div>
    );
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div>
          <h2>Gateway Settings</h2>
          <p>Control payment gateway behavior and transaction parameters.</p>
        </div>
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Gateway Controls">
          <SettingsToggle
            label="Gateway Enabled"
            checked={data.enabled ?? true}
            onChange={(v) => update("enabled", v)}
          />
          <SettingsToggle
            label="Maintenance Mode"
            description="Put the gateway in maintenance mode for all users"
            checked={data.maintenanceMode ?? false}
            onChange={(v) => update("maintenanceMode", v)}
          />
        </SettingsSection>
        <SettingsSection title="Payment Parameters">
          <SettingsField label="Default Payment Expiry (minutes)">
            <input
              type="number"
              value={data.defaultPaymentExpiryMinutes ?? 15}
              onChange={(e) =>
                update("defaultPaymentExpiryMinutes", Number(e.target.value))
              }
              style={inputStyle}
            />
          </SettingsField>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <SettingsField label="Minimum Payment Amount">
              <input
                type="number"
                value={data.minPaymentAmount ?? 1}
                onChange={(e) =>
                  update("minPaymentAmount", Number(e.target.value))
                }
                style={inputStyle}
              />
            </SettingsField>
            <SettingsField label="Maximum Payment Amount">
              <input
                type="number"
                value={data.maxPaymentAmount ?? 500000}
                onChange={(e) =>
                  update("maxPaymentAmount", Number(e.target.value))
                }
                style={inputStyle}
              />
            </SettingsField>
          </div>
          <SettingsField label="Default Provider">
            <select
              value={data.defaultProvider || "bkash"}
              onChange={(e) => update("defaultProvider", e.target.value)}
              style={inputStyle}
            >
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="rocket">Rocket</option>
            </select>
          </SettingsField>
        </SettingsSection>
        <SettingsSection title="Automation">
          <SettingsToggle
            label="Duplicate Transaction Protection"
            checked={data.duplicateTransactionProtection ?? true}
            onChange={(v) => update("duplicateTransactionProtection", v)}
          />
          <SettingsToggle
            label="Auto Verify Payments"
            checked={data.autoVerify ?? true}
            onChange={(v) => update("autoVerify", v)}
          />
          <SettingsToggle
            label="Auto Expire Pending Orders"
            checked={data.autoExpirePendingOrders ?? true}
            onChange={(v) => update("autoExpirePendingOrders", v)}
          />
          {data.autoExpirePendingOrders && (
            <SettingsField label="Auto Expire After (minutes)">
              <input
                type="number"
                value={data.autoExpireAfterMinutes ?? 30}
                onChange={(e) =>
                  update("autoExpireAfterMinutes", Number(e.target.value))
                }
                style={inputStyle}
              />
            </SettingsField>
          )}
        </SettingsSection>
      </div>
    </div>
  );
}

function SecuritySettings() {
  const { data, loading, saving, toast, update, save } = useSettings("security");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>
        Loading settings...
      </div>
    );
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div>
          <h2>Security Settings</h2>
          <p>Configure JWT tokens, rate limiting, and password policies.</p>
        </div>
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="JWT Tokens">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <SettingsField label="Access Token Expiry">
              <input
                type="text"
                value={data.jwtAccessTokenExpiry || "15m"}
                onChange={(e) =>
                  update("jwtAccessTokenExpiry", e.target.value)
                }
                style={inputStyle}
              />
            </SettingsField>
            <SettingsField label="Refresh Token Expiry">
              <input
                type="text"
                value={data.jwtRefreshTokenExpiry || "7d"}
                onChange={(e) =>
                  update("jwtRefreshTokenExpiry", e.target.value)
                }
                style={inputStyle}
              />
            </SettingsField>
          </div>
        </SettingsSection>
        <SettingsSection title="Login Security">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <SettingsField label="Login Attempt Limit">
              <input
                type="number"
                value={data.loginAttemptLimit ?? 5}
                onChange={(e) =>
                  update("loginAttemptLimit", Number(e.target.value))
                }
                style={inputStyle}
              />
            </SettingsField>
            <SettingsField label="Block Duration (minutes)">
              <input
                type="number"
                value={data.loginBlockDurationMinutes ?? 15}
                onChange={(e) =>
                  update("loginBlockDurationMinutes", Number(e.target.value))
                }
                style={inputStyle}
              />
            </SettingsField>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <SettingsField label="Session Timeout (minutes)">
              <input
                type="number"
                value={data.sessionTimeoutMinutes ?? 30}
                onChange={(e) =>
                  update("sessionTimeoutMinutes", Number(e.target.value))
                }
                style={inputStyle}
              />
            </SettingsField>
            <SettingsField label="Max Concurrent Sessions">
              <input
                type="number"
                value={data.maxConcurrentSessions ?? 5}
                onChange={(e) =>
                  update("maxConcurrentSessions", Number(e.target.value))
                }
                style={inputStyle}
              />
            </SettingsField>
          </div>
        </SettingsSection>
        <SettingsSection title="Password Policy">
          <SettingsField label="Minimum Password Length">
            <input
              type="number"
              value={data.passwordMinLength ?? 8}
              onChange={(e) =>
                update("passwordMinLength", Number(e.target.value))
              }
              style={inputStyle}
            />
          </SettingsField>
          <SettingsToggle
            label="Require Uppercase"
            checked={data.passwordRequireUppercase ?? false}
            onChange={(v) => update("passwordRequireUppercase", v)}
          />
          <SettingsToggle
            label="Require Number"
            checked={data.passwordRequireNumber ?? true}
            onChange={(v) => update("passwordRequireNumber", v)}
          />
          <SettingsToggle
            label="Require Special Character"
            checked={data.passwordRequireSpecialChar ?? false}
            onChange={(v) => update("passwordRequireSpecialChar", v)}
          />
        </SettingsSection>
        <SettingsSection title="Rate Limiting">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <SettingsField label="API Rate Limit (per minute)">
              <input
                type="number"
                value={data.apiRateLimitPerMinute ?? 120}
                onChange={(e) =>
                  update("apiRateLimitPerMinute", Number(e.target.value))
                }
                style={inputStyle}
              />
            </SettingsField>
            <SettingsField label="Auth Rate Limit (per minute)">
              <input
                type="number"
                value={data.authRateLimitPerMinute ?? 10}
                onChange={(e) =>
                  update("authRateLimitPerMinute", Number(e.target.value))
                }
                style={inputStyle}
              />
            </SettingsField>
          </div>
          <SettingsToggle
            label="Force HTTPS"
            checked={data.forceHttps ?? false}
            onChange={(v) => update("forceHttps", v)}
          />
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const tab = new URLSearchParams(location.search).get("tab") || "general";

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
        <div>
          <h2>SMS Settings</h2>
          <p>
            Configure SMS gateway, providers, validation, and monitoring.
          </p>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--line)",
          marginBottom: 20,
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        {smsTabs.map((t) => (
          <button
            key={t.id}
            onClick={() =>
              navigate(`/admin/settings/sms?tab=${t.id}`, { replace: true })
            }
            style={{
              padding: "10px 16px",
              border: "none",
              background: "none",
              color:
                tab === t.id ? "var(--purple)" : "var(--muted)",
              borderBottom:
                tab === t.id
                  ? "2px solid var(--purple)"
                  : "2px solid transparent",
              fontSize: 12,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all .15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
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

/* ── SMS Sub-Tabs ── */

function SmsGeneralTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>
    );
  return (
    <div>
      <Toast message={toast} />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="SMS Gateway Controls">
          <SettingsToggle
            label="Enable SMS Gateway"
            checked={data.enabled ?? true}
            onChange={(v) => update("enabled", v)}
          />
          <SettingsToggle
            label="Enable Payment Detection"
            checked={data.paymentDetectionEnabled ?? true}
            onChange={(v) => update("paymentDetectionEnabled", v)}
          />
          <SettingsToggle
            label="Auto Verify Payment"
            checked={data.autoVerifyPayment ?? true}
            onChange={(v) => update("autoVerifyPayment", v)}
          />
          <SettingsToggle
            label="Auto Match Pending Orders"
            checked={data.autoMatchPendingOrders ?? true}
            onChange={(v) => update("autoMatchPendingOrders", v)}
          />
          <SettingsToggle
            label="Auto Complete Payment"
            checked={data.autoCompletePayment ?? false}
            onChange={(v) => update("autoCompletePayment", v)}
          />
          <SettingsToggle
            label="Maintenance Mode"
            description="Disable SMS processing temporarily"
            checked={data.maintenanceMode ?? false}
            onChange={(v) => update("maintenanceMode", v)}
          />
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsProvidersTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  const [activeProvider, setActiveProvider] = useState("bkash");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>
    );
  const providers = ["bkash", "nagad", "rocket"];
  const p = (data.providers || {})[activeProvider] || {};
  const updateProvider = (field: string, value: any) => {
    const current = { ...(data.providers || {}) };
    current[activeProvider] = {
      ...(current[activeProvider] || {}),
      [field]: value,
    };
    update("providers", current);
  };
  return (
    <div>
      <Toast message={toast} />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {providers.map((prov) => (
          <button
            key={prov}
            onClick={() => setActiveProvider(prov)}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border:
                activeProvider === prov
                  ? "1px solid var(--purple)"
                  : "1px solid var(--line)",
              background:
                activeProvider === prov
                  ? "rgba(139,92,246,.1)"
                  : "transparent",
              color:
                activeProvider === prov
                  ? "var(--purple)"
                  : "var(--text)",
              cursor: "pointer",
              fontSize: 13,
              textTransform: "capitalize",
            }}
          >
            {prov}
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title={`${activeProvider} Configuration`}>
          <SettingsToggle
            label="Enabled"
            checked={p.enabled ?? true}
            onChange={(v) => updateProvider("enabled", v)}
          />
          <SettingsField label="Display Name">
            <input
              type="text"
              value={p.displayName || ""}
              onChange={(e) => updateProvider("displayName", e.target.value)}
              style={inputStyle}
            />
          </SettingsField>
          <SettingsField label="Account Number">
            <input
              type="text"
              value={p.accountNumber || ""}
              onChange={(e) =>
                updateProvider("accountNumber", e.target.value)
              }
              style={inputStyle}
            />
          </SettingsField>
          <SettingsField label="Account Type">
            <select
              value={p.accountType || "Personal"}
              onChange={(e) => updateProvider("accountType", e.target.value)}
              style={inputStyle}
            >
              <option value="Personal">Personal</option>
              <option value="Agent">Agent</option>
            </select>
          </SettingsField>
          <SettingsField label="Priority">
            <input
              type="number"
              value={p.priority ?? 1}
              onChange={(e) =>
                updateProvider("priority", Number(e.target.value))
              }
              style={inputStyle}
            />
          </SettingsField>
          <SettingsField label="Sender IDs (comma separated)">
            <input
              type="text"
              value={(p.senderIds || []).join(",")}
              onChange={(e) =>
                updateProvider(
                  "senderIds",
                  e.target.value
                    .split(",")
                    .map((s: string) => s.trim())
                )
              }
              style={inputStyle}
            />
          </SettingsField>
          <SettingsField label="Logo URL">
            <input
              type="text"
              value={p.logoUrl || ""}
              onChange={(e) => updateProvider("logoUrl", e.target.value)}
              style={inputStyle}
            />
          </SettingsField>
          <SettingsField label="Status">
            <select
              value={p.status || "active"}
              onChange={(e) => updateProvider("status", e.target.value)}
              style={inputStyle}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </SettingsField>
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsValidationTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>
    );
  return (
    <div>
      <Toast message={toast} />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Validation Rules">
          <SettingsToggle
            label="Accept Only Registered Devices"
            checked={data.acceptOnlyRegisteredDevices ?? true}
            onChange={(v) => update("acceptOnlyRegisteredDevices", v)}
          />
          <SettingsToggle
            label="Verify Device API Key"
            checked={data.verifyDeviceApiKey ?? true}
            onChange={(v) => update("verifyDeviceApiKey", v)}
          />
          <SettingsToggle
            label="Verify Device ID"
            checked={data.verifyDeviceId ?? true}
            onChange={(v) => update("verifyDeviceId", v)}
          />
          <SettingsToggle
            label="Verify Timestamp"
            checked={data.verifyTimestamp ?? true}
            onChange={(v) => update("verifyTimestamp", v)}
          />
          <SettingsToggle
            label="Reject Duplicate Requests"
            checked={data.rejectDuplicateRequests ?? true}
            onChange={(v) => update("rejectDuplicateRequests", v)}
          />
          <SettingsToggle
            label="Reject Invalid Provider"
            checked={data.rejectInvalidProvider ?? true}
            onChange={(v) => update("rejectInvalidProvider", v)}
          />
          <SettingsToggle
            label="Reject Invalid Amount"
            checked={data.rejectInvalidAmount ?? true}
            onChange={(v) => update("rejectInvalidAmount", v)}
          />
          <SettingsToggle
            label="Reject Old SMS"
            checked={data.rejectOldSms ?? true}
            onChange={(v) => update("rejectOldSms", v)}
          />
          <SettingsField label="SMS Expiration (minutes)">
            <input
              type="number"
              value={data.smsExpirationMinutes ?? 10}
              onChange={(e) =>
                update("smsExpirationMinutes", Number(e.target.value))
              }
              style={inputStyle}
            />
          </SettingsField>
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsMatchingTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>
    );
  const priority = (data.matchingPriority as string[]) || [
    "transactionId",
    "amount",
    "phoneNumber",
    "provider",
    "pendingOrder",
    "timeWindow",
  ];
  const labels: Record<string, string> = {
    transactionId: "Transaction ID",
    amount: "Amount",
    phoneNumber: "Phone Number",
    provider: "Provider",
    pendingOrder: "Pending Order",
    timeWindow: "Time Window",
  };
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const n = [...priority];
    [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]];
    update("matchingPriority", n);
  };
  const moveDown = (idx: number) => {
    if (idx === priority.length - 1) return;
    const n = [...priority];
    [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]];
    update("matchingPriority", n);
  };
  return (
    <div>
      <Toast message={toast} />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Matching Priority (drag to reorder)">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {priority.map((item, idx) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  background: "#111",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                }}
              >
                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: 11,
                    minWidth: 20,
                  }}
                >
                  {idx + 1}.
                </span>
                <span style={{ flex: 1, fontSize: 13 }}>
                  {labels[item] || item}
                </span>
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  style={{
                    border: "none",
                    background: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  ▲
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === priority.length - 1}
                  style={{
                    border: "none",
                    background: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  ▼
                </button>
              </div>
            ))}
          </div>
        </SettingsSection>
        <SettingsSection title="Additional Options">
          <SettingsField label="Amount Tolerance">
            <input
              type="number"
              value={data.amountTolerance ?? 0}
              onChange={(e) =>
                update("amountTolerance", Number(e.target.value))
              }
              style={inputStyle}
            />
          </SettingsField>
          <SettingsField label="Match Time Window (minutes)">
            <input
              type="number"
              value={data.matchTimeWindowMinutes ?? 15}
              onChange={(e) =>
                update("matchTimeWindowMinutes", Number(e.target.value))
              }
              style={inputStyle}
            />
          </SettingsField>
          <SettingsToggle
            label="Allow Partial Match"
            checked={data.allowPartialMatch ?? false}
            onChange={(v) => update("allowPartialMatch", v)}
          />
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsDuplicateTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>
    );
  return (
    <div>
      <Toast message={toast} />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Duplicate Detection">
          <SettingsToggle
            label="Duplicate Transaction ID"
            checked={data.duplicateTransactionId ?? true}
            onChange={(v) => update("duplicateTransactionId", v)}
          />
          <SettingsToggle
            label="Duplicate SMS Hash"
            checked={data.duplicateSmsHash ?? true}
            onChange={(v) => update("duplicateSmsHash", v)}
          />
          <SettingsToggle
            label="Duplicate Request"
            checked={data.duplicateRequest ?? true}
            onChange={(v) => update("duplicateRequest", v)}
          />
          <SettingsField label="Duplicate Time Window (minutes)">
            <input
              type="number"
              value={data.duplicateTimeWindowMinutes ?? 10}
              onChange={(e) =>
                update(
                  "duplicateTimeWindowMinutes",
                  Number(e.target.value)
                )
              }
              style={inputStyle}
            />
          </SettingsField>
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsDeviceTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>
    );
  return (
    <div>
      <Toast message={toast} />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Device Communication">
          <SettingsField label="Heartbeat Interval (seconds)">
            <input
              type="number"
              value={data.heartbeatIntervalSeconds ?? 30}
              onChange={(e) =>
                update(
                  "heartbeatIntervalSeconds",
                  Number(e.target.value)
                )
              }
              style={inputStyle}
            />
          </SettingsField>
          <SettingsField label="Offline Timeout (seconds)">
            <input
              type="number"
              value={data.offlineTimeoutSeconds ?? 120}
              onChange={(e) =>
                update("offlineTimeoutSeconds", Number(e.target.value))
              }
              style={inputStyle}
            />
          </SettingsField>
          <SettingsField label="Minimum App Version">
            <input
              type="text"
              value={data.minimumAppVersion || "1.0.0"}
              onChange={(e) =>
                update("minimumAppVersion", e.target.value)
              }
              style={inputStyle}
            />
          </SettingsField>
          <SettingsToggle
            label="Force App Update"
            checked={data.forceAppUpdate ?? false}
            onChange={(v) => update("forceAppUpdate", v)}
          />
          <SettingsToggle
            label="Device Approval Required"
            checked={data.deviceApprovalRequired ?? true}
            onChange={(v) => update("deviceApprovalRequired", v)}
          />
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsRetryTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>
    );
  return (
    <div>
      <Toast message={toast} />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Retry Configuration">
          <SettingsField label="Retry Count">
            <input
              type="number"
              value={data.retryCount ?? 3}
              onChange={(e) =>
                update("retryCount", Number(e.target.value))
              }
              style={inputStyle}
            />
          </SettingsField>
          <SettingsField label="Retry Delay (seconds)">
            <input
              type="number"
              value={data.retryDelaySeconds ?? 30}
              onChange={(e) =>
                update("retryDelaySeconds", Number(e.target.value))
              }
              style={inputStyle}
            />
          </SettingsField>
          <SettingsField label="Queue Size">
            <input
              type="number"
              value={data.queueSize ?? 100}
              onChange={(e) =>
                update("queueSize", Number(e.target.value))
              }
              style={inputStyle}
            />
          </SettingsField>
          <SettingsToggle
            label="Auto Resend"
            checked={data.autoResend ?? false}
            onChange={(v) => update("autoResend", v)}
          />
        </SettingsSection>
      </div>
    </div>
  );
}

function SmsStorageTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  const [cleanupMsg, setCleanupMsg] = useState("");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>
    );
  const doCleanup = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/admin/settings/sms/cleanup`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      const d = await res.json();
      setCleanupMsg(
        `Cleaned up ${d.data?.deleted || 0} old SMS records.`
      );
    } catch {
      setCleanupMsg("Cleanup failed.");
    }
  };
  return (
    <div>
      <Toast message={toast} />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="SMS Storage">
          <SettingsToggle
            label="Save Raw SMS"
            checked={data.saveRawSms ?? true}
            onChange={(v) => update("saveRawSms", v)}
          />
          <SettingsToggle
            label="Save Parsed SMS"
            checked={data.saveParsedSms ?? true}
            onChange={(v) => update("saveParsedSms", v)}
          />
          <SettingsField label="SMS Retention (days)">
            <input
              type="number"
              value={data.smsRetentionDays ?? 90}
              onChange={(e) =>
                update("smsRetentionDays", Number(e.target.value))
              }
              style={inputStyle}
            />
          </SettingsField>
          <SettingsToggle
            label="Auto Cleanup"
            checked={data.autoCleanup ?? true}
            onChange={(v) => update("autoCleanup", v)}
          />
        </SettingsSection>
        <div
          style={{
            marginTop: 16,
            padding: "16px 0",
            borderTop: "1px solid var(--line)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <button className="outline-btn" onClick={doCleanup}>
              Manual Cleanup
            </button>
            {cleanupMsg && (
              <span style={{ fontSize: 12, color: "#1db954" }}>
                {cleanupMsg}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SmsNotificationsTab() {
  const { data, loading, saving, toast, update, save } = useSettings("sms");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>Loading...</div>
    );
  return (
    <div>
      <Toast message={toast} />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Notification Channels">
          <SettingsToggle
            label="Browser Notification"
            checked={data.browserNotification ?? false}
            onChange={(v) => update("browserNotification", v)}
          />
          <SettingsToggle
            label="Email Notification"
            checked={data.emailNotification ?? true}
            onChange={(v) => update("emailNotification", v)}
          />
          <SettingsToggle
            label="Webhook Notification"
            checked={data.webhookNotification ?? true}
            onChange={(v) => update("webhookNotification", v)}
          />
        </SettingsSection>
        <SettingsSection title="Trigger Events">
          <SettingsToggle
            label="New Payment"
            checked={data.notifyNewPayment ?? true}
            onChange={(v) => update("notifyNewPayment", v)}
          />
          <SettingsToggle
            label="Failed Verification"
            checked={data.notifyFailedVerification ?? true}
            onChange={(v) => update("notifyFailedVerification", v)}
          />
          <SettingsToggle
            label="Duplicate SMS"
            checked={data.notifyDuplicateSms ?? false}
            onChange={(v) => update("notifyDuplicateSms", v)}
          />
          <SettingsToggle
            label="Device Offline"
            checked={data.notifyDeviceOffline ?? true}
            onChange={(v) => update("notifyDeviceOffline", v)}
          />
          <SettingsToggle
            label="API Error"
            checked={data.notifyApiError ?? true}
            onChange={(v) => update("notifyApiError", v)}
          />
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
    fetch(
      `${API_URL}/api/admin/settings/sms/logs?page=${p}&limit=${limit}&search=${encodeURIComponent(search)}&type=${type}`,
      {
        headers: { Authorization: `Bearer ${getToken()}` },
      }
    )
      .then((res) => res.json())
      .then((d) => {
        if (d.success) {
          setLogs(d.data.logs);
          setTotal(d.data.total);
          setPage(p);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs(1);
  }, [type, search]);

  const logTypes = [
    "all",
    "sms_received",
    "payment_verified",
    "payment_failed",
    "device_online",
    "device_offline",
  ];
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search transactions, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid var(--line)",
            borderRadius: 6,
            background: "#0d1119",
            color: "var(--text)",
            fontSize: 12,
            minWidth: 200,
          }}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid var(--line)",
            borderRadius: 6,
            background: "#0d1119",
            color: "var(--text)",
            fontSize: 12,
          }}
        >
          {logTypes.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="card" style={{ padding: "20px 20px 7px" }}>
        <div className="table-wrap" style={{ margin: "0 -20px -7px" }}>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Message</th>
                <th>Type</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: 30,
                      color: "var(--muted)",
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: 30,
                      color: "var(--muted)",
                    }}
                  >
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((l: any) => (
                  <tr key={l._id}>
                    <td style={{ fontSize: 11, color: "var(--muted)" }}>
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`status ${l.severity || "info"}`}
                      >
                        <i />
                        {l.action}
                      </span>
                    </td>
                    <td
                      style={{
                        fontSize: 12,
                        maxWidth: 300,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {l.message}
                    </td>
                    <td style={{ fontSize: 11 }}>
                      {l.entityType || "—"}
                    </td>
                    <td
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                      }}
                    >
                      {JSON.stringify(
                        l.metadata?.parsed || {}
                      ).substring(0, 60)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {total > limit && (
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginTop: 16,
          }}
        >
          <button
            className="outline-btn"
            disabled={page <= 1}
            onClick={() => fetchLogs(page - 1)}
          >
            Previous
          </button>
          <span
            style={{
              fontSize: 12,
              color: "var(--muted)",
              padding: "6px 12px",
            }}
          >
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <button
            className="outline-btn"
            disabled={page >= Math.ceil(total / limit)}
            onClick={() => fetchLogs(page + 1)}
          >
            Next
          </button>
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
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ smsText, provider, deviceId }),
      });
      const d = await res.json();
      setResult(d.data || d);
    } catch {
      setResult({ error: "Test failed" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <SettingsSection title="SMS Testing Tool">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <SettingsField label="Provider">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                style={inputStyle}
              >
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="rocket">Rocket</option>
              </select>
            </SettingsField>
            <SettingsField label="Device ID">
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                style={inputStyle}
              />
            </SettingsField>
          </div>
          <SettingsField label="SMS Text">
            <textarea
              rows={4}
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              placeholder="Paste the SMS content here..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </SettingsField>
          <button
            className="primary-btn"
            onClick={testSms}
            disabled={testing || !smsText}
            style={{ marginTop: 12 }}
          >
            {testing ? "Testing..." : "Test Payment Detection"}{" "}
            <ArrowUpRight size={14} />
          </button>
        </SettingsSection>
      </div>

      {result && (
        <div className="card" style={{ padding: 24 }}>
          <SettingsSection title="Parsed Result">
            {result.parsed ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>
                    Provider
                  </span>
                  <p
                    style={{
                      fontSize: 13,
                      textTransform: "capitalize",
                      margin: 0,
                    }}
                  >
                    {result.parsed.provider}
                  </p>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>
                    Amount
                  </span>
                  <p style={{ fontSize: 13, margin: 0 }}>
                    ৳ {result.parsed.amount}
                  </p>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>
                    Sender
                  </span>
                  <p style={{ fontSize: 13, margin: 0 }}>
                    {result.parsed.sender}
                  </p>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>
                    Phone
                  </span>
                  <p style={{ fontSize: 13, margin: 0 }}>
                    {result.parsed.phone}
                  </p>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>
                    Transaction ID
                  </span>
                  <p style={{ fontSize: 13, margin: 0 }}>
                    {result.parsed.transactionId || "N/A"}
                  </p>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>
                    Payment Time
                  </span>
                  <p style={{ fontSize: 13, margin: 0 }}>
                    {new Date(
                      result.parsed.paymentTime
                    ).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>
                    Validation
                  </span>
                  <p
                    style={{
                      fontSize: 13,
                      margin: 0,
                      color:
                        result.parsed.validationResult === "success"
                          ? "#1db954"
                          : "#e97389",
                    }}
                  >
                    {result.parsed.validationResult}
                  </p>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>
                    Status
                  </span>
                  <p style={{ fontSize: 13, margin: 0 }}>
                    {result.parsed.finalStatus}
                  </p>
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                {result.error || "No result"}
              </p>
            )}
          </SettingsSection>
          {result.issues?.length > 0 && (
            <SettingsSection title="Issues">
              <ul
                style={{
                  color: "#e97389",
                  fontSize: 12,
                  paddingLeft: 16,
                }}
              >
                {result.issues.map((i: string, idx: number) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>
            </SettingsSection>
          )}
          <SettingsSection title="Raw JSON Response">
            <pre
              style={{
                background: "#0a0a0f",
                padding: 16,
                borderRadius: 8,
                fontSize: 11,
                color: "#7dd3fc",
                overflow: "auto",
                maxHeight: 300,
                border: "1px solid var(--line)",
              }}
            >
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
    fetch(`${API_URL}/api/admin/settings/sms/stats`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((d) => {
        if (d.success) setStats(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>
        Loading stats...
      </div>
    );
  const s = stats || {};
  return (
    <div>
      <div className="metrics" style={{ marginBottom: 14 }}>
        <Metric
          label="SMS Received Today"
          value={String(s.smsReceivedToday ?? 0)}
          delta="—"
          icon={Bell}
          tone="purple"
        />
        <Metric
          label="Payments Verified"
          value={String(s.paymentsVerified ?? 0)}
          delta="—"
          icon={CheckCircle2}
          tone="green"
        />
        <Metric
          label="Pending Payments"
          value={String(s.pendingPayments ?? 0)}
          delta="—"
          icon={Clock}
          tone="orange"
        />
        <Metric
          label="Failed Verification"
          value={String(s.failedVerification ?? 0)}
          delta="—"
          icon={X}
          tone="red"
        />
      </div>
      <div className="metrics" style={{ marginBottom: 14 }}>
        <Metric
          label="Duplicate SMS"
          value={String(s.duplicateSms ?? 0)}
          delta="—"
          icon={Copy}
          tone="orange"
        />
        <Metric
          label="Online Devices"
          value={String(s.onlineDevices ?? 0)}
          delta="—"
          icon={Wifi}
          tone="green"
        />
        <Metric
          label="Success Rate"
          value={`${s.charts?.successRate ?? 0}%`}
          delta="—"
          icon={Activity}
          tone="blue"
        />
        <Metric
          label="—"
          value="—"
          delta="—"
          icon={Zap}
          tone="purple"
        />
      </div>
      {s.charts?.providerDistribution && (
        <div className="card" style={{ padding: 20, marginBottom: 14 }}>
          <div className="card-heading">
            <span className="card-kicker">Provider Distribution</span>
          </div>
          {s.charts.providerDistribution.map((p: any) => (
            <React.Fragment key={p.name}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                <span style={{ fontSize: 13 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  {p.count} ({p.percentage}%)
                </span>
              </div>
              <div className="progress">
                <i
                  style={{
                    width: `${p.percentage}%`,
                    background:
                      p.name === "bkash"
                        ? "#e84d8a"
                        : p.name === "nagad"
                          ? "#f47e35"
                          : "#8049b8",
                  }}
                />
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
      {s.charts?.hourly && (
        <div className="card" style={{ padding: 20 }}>
          <div className="card-heading">
            <span className="card-kicker">Hourly SMS Today</span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 4,
              alignItems: "flex-end",
              height: 100,
              marginTop: 12,
            }}
          >
            {s.charts.hourly.map((h: any) => {
              const max = Math.max(
                ...s.charts.hourly.map((x: any) => x.count),
                1
              );
              return (
                <div
                  key={h.hour}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 30,
                      height: `${(h.count / max) * 80}px`,
                      minHeight: 2,
                      background: "var(--purple)",
                      borderRadius: "3px 3px 0 0",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: "var(--muted)",
                      marginTop: 4,
                    }}
                  >
                    {h.hour}h
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DeviceSettings() {
  const { data, loading, saving, toast, update, save } =
    useSettings("device");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>
        Loading settings...
      </div>
    );
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div>
          <h2>Device Settings</h2>
          <p>Configure Android SMS reader device management.</p>
        </div>
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Device Limits">
          <SettingsField label="Max Devices Per Merchant">
            <input
              type="number"
              value={data.maxDevicesPerMerchant ?? 10}
              onChange={(e) =>
                update(
                  "maxDevicesPerMerchant",
                  Number(e.target.value)
                )
              }
              style={inputStyle}
            />
          </SettingsField>
          <SettingsField label="Minimum App Version">
            <input
              type="text"
              value={data.minimumAppVersion || "1.0.0"}
              onChange={(e) =>
                update("minimumAppVersion", e.target.value)
              }
              style={inputStyle}
            />
          </SettingsField>
        </SettingsSection>
        <SettingsSection title="Heartbeat & Timeout">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <SettingsField label="Heartbeat Interval (seconds)">
              <input
                type="number"
                value={data.heartbeatIntervalSeconds ?? 30}
                onChange={(e) =>
                  update(
                    "heartbeatIntervalSeconds",
                    Number(e.target.value)
                  )
                }
                style={inputStyle}
              />
            </SettingsField>
            <SettingsField label="Offline Timeout (seconds)">
              <input
                type="number"
                value={data.offlineTimeoutSeconds ?? 120}
                onChange={(e) =>
                  update(
                    "offlineTimeoutSeconds",
                    Number(e.target.value)
                  )
                }
                style={inputStyle}
              />
            </SettingsField>
          </div>
        </SettingsSection>
        <SettingsSection title="Approval">
          <SettingsToggle
            label="Require Device Approval"
            checked={data.requireDeviceApproval ?? true}
            onChange={(v) => update("requireDeviceApproval", v)}
          />
          <SettingsToggle
            label="Auto Disable Offline Device"
            checked={data.autoDisableOfflineDevice ?? true}
            onChange={(v) => update("autoDisableOfflineDevice", v)}
          />
        </SettingsSection>
      </div>
    </div>
  );
}

function MerchantSettings() {
  const { data, loading, saving, toast, update, save } =
    useSettings("merchant");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>
        Loading settings...
      </div>
    );
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div>
          <h2>Merchant Settings</h2>
          <p>Configure merchant registration and default limits.</p>
        </div>
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Registration">
          <SettingsToggle
            label="Allow Merchant Registration"
            checked={data.allowRegistration ?? true}
            onChange={(v) => update("allowRegistration", v)}
          />
          <SettingsToggle
            label="Require Email Verification"
            checked={data.requireEmailVerification ?? true}
            onChange={(v) => update("requireEmailVerification", v)}
          />
          <SettingsToggle
            label="Require Manual Approval"
            checked={data.requireManualApproval ?? false}
            onChange={(v) => update("requireManualApproval", v)}
          />
        </SettingsSection>
        <SettingsSection title="Defaults">
          <SettingsField label="Default Plan">
            <input
              type="text"
              value={data.defaultPlan || "free"}
              onChange={(e) => update("defaultPlan", e.target.value)}
              style={inputStyle}
            />
          </SettingsField>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <SettingsField label="Default Transaction Limit">
              <input
                type="number"
                value={data.defaultTransactionLimit ?? 1000}
                onChange={(e) =>
                  update(
                    "defaultTransactionLimit",
                    Number(e.target.value)
                  )
                }
                style={inputStyle}
              />
            </SettingsField>
            <SettingsField label="Default Device Limit">
              <input
                type="number"
                value={data.defaultDeviceLimit ?? 5}
                onChange={(e) =>
                  update(
                    "defaultDeviceLimit",
                    Number(e.target.value)
                  )
                }
                style={inputStyle}
              />
            </SettingsField>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const { data, loading, saving, toast, update, save } =
    useSettings("notification");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>
        Loading settings...
      </div>
    );
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div>
          <h2>Notification Settings</h2>
          <p>
            Manage email, browser, and webhook notification channels.
          </p>
        </div>
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Channels">
          <SettingsToggle
            label="Email Notifications"
            checked={data.emailNotifications ?? true}
            onChange={(v) => update("emailNotifications", v)}
          />
          <SettingsToggle
            label="Browser Notifications"
            checked={data.browserNotifications ?? false}
            onChange={(v) => update("browserNotifications", v)}
          />
          <SettingsToggle
            label="Webhook Notifications"
            checked={data.webhookNotifications ?? true}
            onChange={(v) => update("webhookNotifications", v)}
          />
        </SettingsSection>
        <SettingsSection title="Event Notifications">
          <SettingsToggle
            label="Payment Success Notification"
            checked={data.paymentSuccessNotify ?? true}
            onChange={(v) => update("paymentSuccessNotify", v)}
          />
          <SettingsToggle
            label="Payment Failed Notification"
            checked={data.paymentFailedNotify ?? true}
            onChange={(v) => update("paymentFailedNotify", v)}
          />
          <SettingsToggle
            label="Offline Device Alert"
            checked={data.offlineDeviceAlert ?? true}
            onChange={(v) => update("offlineDeviceAlert", v)}
          />
        </SettingsSection>
      </div>
    </div>
  );
}

function EmailSettings() {
  const { data, loading, saving, toast, update, save } =
    useSettings("email");
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testMsg, setTestMsg] = useState("");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>
        Loading settings...
      </div>
    );
  const testEmail = async () => {
    setTesting(true);
    setTestMsg("");
    try {
      const res = await fetch(`${API_URL}/api/admin/settings/email/test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: testTo }),
      });
      const d = await res.json();
      setTestMsg(d.message || d.error || "Done");
    } catch {
      setTestMsg("Test failed");
    } finally {
      setTesting(false);
    }
  };
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div>
          <h2>Email Settings</h2>
          <p>Configure SMTP server for transactional emails.</p>
        </div>
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="SMTP Configuration">
          <SettingsField label="SMTP Host">
            <input
              type="text"
              value={data.smtpHost || ""}
              onChange={(e) => update("smtpHost", e.target.value)}
              style={inputStyle}
            />
          </SettingsField>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <SettingsField label="SMTP Port">
              <input
                type="number"
                value={data.smtpPort ?? 587}
                onChange={(e) =>
                  update("smtpPort", Number(e.target.value))
                }
                style={inputStyle}
              />
            </SettingsField>
            <SettingsField label="Encryption">
              <select
                value={data.encryption || "tls"}
                onChange={(e) =>
                  update("encryption", e.target.value)
                }
                style={inputStyle}
              >
                <option value="none">None</option>
                <option value="ssl">SSL</option>
                <option value="tls">TLS</option>
              </select>
            </SettingsField>
          </div>
          <SettingsField label="SMTP Username">
            <input
              type="text"
              value={data.smtpUsername || ""}
              onChange={(e) =>
                update("smtpUsername", e.target.value)
              }
              style={inputStyle}
            />
          </SettingsField>
          <SettingsField label="SMTP Password">
            <input
              type="password"
              value={data.smtpPassword || ""}
              onChange={(e) =>
                update("smtpPassword", e.target.value)
              }
              style={inputStyle}
            />
          </SettingsField>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <SettingsField label="Sender Name">
              <input
                type="text"
                value={data.senderName || ""}
                onChange={(e) =>
                  update("senderName", e.target.value)
                }
                style={inputStyle}
              />
            </SettingsField>
            <SettingsField label="Sender Email">
              <input
                type="email"
                value={data.senderEmail || ""}
                onChange={(e) =>
                  update("senderEmail", e.target.value)
                }
                style={inputStyle}
              />
            </SettingsField>
          </div>
        </SettingsSection>
        <SettingsSection title="Test Email">
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: 1 }}>
              <SettingsField label="Send Test To">
                <input
                  type="email"
                  placeholder="test@example.com"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  style={inputStyle}
                />
              </SettingsField>
            </div>
            <button
              className="outline-btn"
              onClick={testEmail}
              disabled={testing || !testTo}
            >
              {testing ? "Sending..." : "Send Test"}
            </button>
          </div>
          {testMsg && (
            <p
              style={{
                color:
                  testMsg.includes("would be") ||
                  testMsg.includes("sent")
                    ? "#1db954"
                    : "#e97389",
                fontSize: 12,
                marginTop: 8,
              }}
            >
              {testMsg}
            </p>
          )}
        </SettingsSection>
      </div>
    </div>
  );
}

function ApiSettings() {
  const { data, loading, saving, toast, update, save } =
    useSettings("api");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>
        Loading settings...
      </div>
    );
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div>
          <h2>API Settings</h2>
          <p>Manage API access and versioning.</p>
        </div>
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="API Configuration">
          <SettingsToggle
            label="Enable API"
            checked={data.enableApi ?? true}
            onChange={(v) => update("enableApi", v)}
          />
          <SettingsField label="API Version">
            <input
              type="text"
              value={data.apiVersion || "v1"}
              onChange={(e) => update("apiVersion", e.target.value)}
              style={inputStyle}
            />
          </SettingsField>
        </SettingsSection>
        <div
          className="card empty-card"
          style={{ marginTop: 16 }}
        >
          <div className="empty-icon">
            <KeyRound size={22} />
          </div>
          <h3>API Keys Management</h3>
          <p>
            Manage your merchant API keys from the{" "}
            <strong>API Keys</strong> page in the main navigation.
          </p>
          <button
            className="outline-btn"
            onClick={() =>
              (window.location.href = "/admin/api-keys")
            }
          >
            Go to API Keys <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const { data, loading, saving, toast, update, save } =
    useSettings("appearance");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>
        Loading settings...
      </div>
    );
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div>
          <h2>Appearance Settings</h2>
          <p>Customize the admin panel look and feel.</p>
        </div>
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Theme">
          <SettingsField label="Theme Mode">
            <select
              value={data.theme || "dark"}
              onChange={(e) => update("theme", e.target.value)}
              style={inputStyle}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </SettingsField>
          <SettingsField label="Primary Color">
            <input
              type="color"
              value={data.primaryColor || "#8b5cf6"}
              onChange={(e) =>
                update("primaryColor", e.target.value)
              }
              style={{
                ...inputStyle,
                padding: "4px 13px",
                height: 44,
              }}
            />
          </SettingsField>
        </SettingsSection>
        <SettingsSection title="Layout">
          <SettingsField label="Sidebar Style">
            <select
              value={data.sidebarStyle || "default"}
              onChange={(e) =>
                update("sidebarStyle", e.target.value)
              }
              style={inputStyle}
            >
              <option value="default">Default</option>
              <option value="compact">Compact</option>
            </select>
          </SettingsField>
          <SettingsField label="Dashboard Layout">
            <select
              value={data.dashboardLayout || "grid"}
              onChange={(e) =>
                update("dashboardLayout", e.target.value)
              }
              style={inputStyle}
            >
              <option value="grid">Grid</option>
              <option value="list">List</option>
            </select>
          </SettingsField>
        </SettingsSection>
      </div>
    </div>
  );
}

function AnalyticsSettings() {
  const { data, loading, saving, toast, update, save } =
    useSettings("analytics");
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>
        Loading settings...
      </div>
    );
  return (
    <div>
      <Toast message={toast} />
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div>
          <h2>Analytics Settings</h2>
          <p>Configure analytics and reporting preferences.</p>
        </div>
        <button className="primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Dashboard">
          <SettingsField label="Default Dashboard Range (days)">
            <input
              type="text"
              value={data.defaultDashboardRange || "30"}
              onChange={(e) =>
                update("defaultDashboardRange", e.target.value)
              }
              style={inputStyle}
            />
          </SettingsField>
        </SettingsSection>
        <SettingsSection title="Features">
          <SettingsToggle
            label="Enable Revenue Charts"
            checked={data.enableRevenueCharts ?? true}
            onChange={(v) => update("enableRevenueCharts", v)}
          />
          <SettingsToggle
            label="Enable CSV Export"
            checked={data.enableExportCsv ?? true}
            onChange={(v) => update("enableExportCsv", v)}
          />
          <SettingsToggle
            label="Enable Excel Export"
            checked={data.enableExportExcel ?? false}
            onChange={(v) => update("enableExportExcel", v)}
          />
        </SettingsSection>
      </div>
    </div>
  );
}

function SystemStatusPage() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API_URL}/api/admin/settings/system-info`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((d) => {
        if (d.success) setInfo(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--muted)" }}>
        Loading system info...
      </div>
    );
  const i = info || {};
  return (
    <div>
      <div className="page-intro" style={{ marginBottom: 20 }}>
        <div>
          <div className="resource-title">
            <div className="metric-icon purple">
              <Zap size={19} />
            </div>
            <h2>System Status</h2>
          </div>
          <p>
            Monitor server health, resource usage, and environment
            details.
          </p>
        </div>
      </div>
      <div className="metrics" style={{ marginBottom: 14 }}>
        <Metric
          label="Uptime"
          value={i.uptimeFormatted || "N/A"}
          delta="—"
          icon={Activity}
          tone="purple"
        />
        <Metric
          label="Memory (RSS)"
          value={i.memory?.rss || "N/A"}
          delta="—"
          icon={Zap}
          tone="blue"
        />
        <Metric
          label="MongoDB"
          value={i.mongo?.status || "N/A"}
          delta="—"
          icon={Zap}
          tone="green"
        />
        <Metric
          label="Environment"
          value={i.environment || "N/A"}
          delta="—"
          icon={Zap}
          tone="orange"
        />
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SettingsSection title="Server">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>
                Node Version
              </span>
              <p style={{ fontSize: 13, margin: 0 }}>
                {i.nodeVersion}
              </p>
            </div>
            <div>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>
                Platform
              </span>
              <p style={{ fontSize: 13, margin: 0 }}>
                {i.platform} ({i.arch})
              </p>
            </div>
            <div>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>
                Heap Used
              </span>
              <p style={{ fontSize: 13, margin: 0 }}>
                {i.memory?.heapUsed}
              </p>
            </div>
            <div>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>
                Heap Total
              </span>
              <p style={{ fontSize: 13, margin: 0 }}>
                {i.memory?.heapTotal}
              </p>
            </div>
          </div>
        </SettingsSection>
        <SettingsSection title="MongoDB">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>
                Status
              </span>
              <p
                style={{
                  fontSize: 13,
                  margin: 0,
                  color:
                    i.mongo?.status === "connected"
                      ? "#1db954"
                      : "#e97389",
                }}
              >
                {i.mongo?.status}
              </p>
            </div>
            <div>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>
                Host
              </span>
              <p style={{ fontSize: 13, margin: 0 }}>
                {i.mongo?.host}
              </p>
            </div>
            <div>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>
                Database
              </span>
              <p style={{ fontSize: 13, margin: 0 }}>
                {i.mongo?.name}
              </p>
            </div>
          </div>
        </SettingsSection>
        <SettingsSection title="Storage">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>
                Total
              </span>
              <p style={{ fontSize: 13, margin: 0 }}>
                {i.storage?.total}
              </p>
            </div>
            <div>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>
                Used
              </span>
              <p style={{ fontSize: 13, margin: 0 }}>
                {i.storage?.used}
              </p>
            </div>
            <div>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>
                Free
              </span>
              <p style={{ fontSize: 13, margin: 0 }}>
                {i.storage?.free}
              </p>
            </div>
          </div>
        </SettingsSection>
        <SettingsSection title="CPU">
          <div>
            <span style={{ color: "var(--muted)", fontSize: 11 }}>
              Model
            </span>
            <p style={{ fontSize: 13, margin: 0 }}>{i.cpu?.model}</p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 8,
            }}
          >
            <div>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>
                Cores
              </span>
              <p style={{ fontSize: 13, margin: 0 }}>
                {i.cpu?.cores}
              </p>
            </div>
            <div>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>
                Load Avg
              </span>
              <p style={{ fontSize: 13, margin: 0 }}>
                {i.cpu?.loadAvg?.join(", ")}
              </p>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════ */
/*          Settings Shell (sidebar + routes)     */
/* ══════════════════════════════════════════════ */

export default function SettingsPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab =
    location.pathname.replace("/admin/settings/", "") || "general";
  const activeTab = SETTINGS_TABS.find((t) => t.id === currentTab)
    ? currentTab
    : "general";

  return (
    <div style={{ display: "flex", gap: 0, height: "100%" }}>
      <nav
        style={{
          width: 200,
          minWidth: 200,
          borderRight: "1px solid var(--line)",
          padding: "16px 0",
          overflowY: "auto",
        }}
      >
        {SETTINGS_TABS.map(({ label, id, icon: I }) => (
          <button
            key={id}
            onClick={() => navigate(`/admin/settings/${id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "10px 16px",
              border: "none",
              background:
                activeTab === id
                  ? "rgba(139,92,246,.15)"
                  : "transparent",
              color:
                activeTab === id
                  ? "var(--purple)"
                  : "var(--text)",
              fontSize: 12,
              cursor: "pointer",
              borderLeft:
                activeTab === id
                  ? "3px solid var(--purple)"
                  : "3px solid transparent",
              textAlign: "left",
              transition: "all .15s",
            }}
          >
            <I size={16} />
            {label}
          </button>
        ))}
      </nav>
      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
        <Routes>
          <Route index element={<Navigate to="general" replace />} />
          <Route path="general" element={<GeneralSettings />} />
          <Route path="gateway" element={<GatewaySettings />} />
          <Route path="security" element={<SecuritySettings />} />
          <Route path="sms" element={<SmsSettings />} />
          <Route path="device" element={<DeviceSettings />} />
          <Route path="merchant" element={<MerchantSettings />} />
          <Route
            path="notification"
            element={<NotificationSettings />}
          />
          <Route path="email" element={<EmailSettings />} />
          <Route path="api" element={<ApiSettings />} />
          <Route path="appearance" element={<AppearanceSettings />} />
          <Route path="analytics" element={<AnalyticsSettings />} />
          <Route path="system" element={<SystemStatusPage />} />
          <Route
            path="*"
            element={<Navigate to="general" replace />}
          />
        </Routes>
      </div>
    </div>
  );
}
