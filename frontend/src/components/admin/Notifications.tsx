import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { notificationApi } from "../../services/api";
import type { ActivityLog as ActivityLogType } from "../../types";
import {
  EmptyRow,
  LoadingRow,
  PageHeader,
  Pagination,
  Spinner,
  Status,
  TableCard,
} from "./ui";

interface Prefs {
  emailNotifications: boolean;
  paymentAlerts: boolean;
  securityAlerts: boolean;
  dailySummary: boolean;
}

export default function Notifications() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [logs, setLogs] = useState<ActivityLogType[]>([]);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{
    total: number;
    totalPages: number;
  }>({ total: 0, totalPages: 1 });

  const fetchPrefs = async () => {
    setLoadingPrefs(true);
    try {
      const res = await notificationApi.preferences();
      if (res.data?.success) setPrefs(res.data.data);
    } catch {
    } finally {
      setLoadingPrefs(false);
    }
  };

  const fetchLogs = async (p = page) => {
    setLoadingLogs(true);
    try {
      const res = await notificationApi.log({ page: String(p), limit: "15" });
      if (res.data?.success) {
        setLogs(res.data.data?.logs || []);
        setPagination(
          res.data.data?.pagination || { total: 0, totalPages: 1 }
        );
      }
    } catch {
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchPrefs();
    fetchLogs(1);
  }, []);

  const togglePref = async (key: keyof Prefs) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try {
      await notificationApi.updatePreferences({ [key]: updated[key] });
    } catch {
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    display: "block" as const,
    width: "100%",
    padding: "12px 13px",
    border: "1px solid var(--line)",
    borderRadius: 9,
    background: "#0d1119",
    color: "var(--text)" as const,
    fontSize: 13,
  };

  return (
    <div className="resource-page">
      <PageHeader
        title="Notifications"
        description="Configure notification preferences and view notification logs."
        icon={Bell}
      />

      <div className="dashboard-grid" style={{ marginBottom: 16 }}>
        {/* Preferences */}
        <div className="card" style={{ padding: 20 }}>
          <div className="card-heading" style={{ marginBottom: 16 }}>
            <div>
              <span className="card-kicker">Preferences</span>
              <h3>Notification settings</h3>
            </div>
          </div>
          {loadingPrefs ? (
            <Spinner text="Loading preferences..." />
          ) : prefs ? (
            <div style={{ display: "grid", gap: 14 }}>
              {(
                [
                  { key: "emailNotifications", label: "Email notifications" },
                  { key: "paymentAlerts", label: "Payment alerts" },
                  { key: "securityAlerts", label: "Security alerts" },
                  { key: "dailySummary", label: "Daily summary email" },
                ] as const
              ).map(({ key, label }) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#cbd0dc",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!prefs[key]}
                    onChange={() => togglePref(key)}
                    disabled={saving}
                    style={{ width: 16, height: 16 }}
                  />
                  {label}
                </label>
              ))}
            </div>
          ) : null}
        </div>

        {/* Recent notifications */}
        <div className="card" style={{ padding: 20 }}>
          <div className="card-heading" style={{ marginBottom: 16 }}>
            <div>
              <span className="card-kicker">Recent</span>
              <h3>Notification log</h3>
            </div>
          </div>
          {loadingLogs ? (
            <Spinner text="Loading logs..." />
          ) : logs.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 12 }}>
              No notifications yet
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {logs.slice(0, 8).map((log) => (
                <div
                  key={log._id}
                  style={{
                    padding: "10px 12px",
                    background: "#111722",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <Status>{log.severity}</Status>
                    <span style={{ color: "var(--muted)" }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: "#adb5c4" }}>{log.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}