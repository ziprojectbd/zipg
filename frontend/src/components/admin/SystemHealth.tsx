import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { systemHealthApi } from "../../services/api";
import type { SystemHealth as SystemHealthType } from "../../types";
import {
  EmptyRow,
  LoadingRow,
  Metric,
  PageHeader,
  Spinner,
  TableCard,
} from "./ui";

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealthType | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await systemHealthApi.get();
      if (res.data?.success) setHealth(res.data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const dot = (status: string) => {
    const color =
      status === "healthy"
        ? "#1db954"
        : status === "degraded"
          ? "#e0c46a"
          : status === "down"
            ? "#e97389"
            : "#6ab0e0";
    return (
      <span
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          marginRight: 8,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
    );
  };

  const fmtBytes = (n: number) =>
    n >= 1e9
      ? `${(n / 1e9).toFixed(1)} GB`
      : n >= 1e6
        ? `${(n / 1e6).toFixed(1)} MB`
        : `${(n / 1e3).toFixed(0)} KB`;

  const fmtUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return days > 0
      ? `${days}d ${hours}h ${mins}m`
      : hours > 0
        ? `${hours}h ${mins}m`
        : `${mins}m`;
  };

  const s = health?.server;
  const db = health?.database;
  const pay = health?.payments;
  const dev = health?.devices;
  const sock = health?.sockets;

  return (
    <div className="resource-page">
      <PageHeader
        title="System Health"
        description="Monitor server status, database latency, devices, and connected sockets."
        icon={Smartphone}
      />

      {loading ? (
        <Spinner text="Loading health data..." />
      ) : !health ? (
        <TableCard colSpan={5}>
          <tbody>
            <EmptyRow colSpan={5} message="No health data available" />
          </tbody>
        </TableCard>
      ) : (
        <>
          {/* Overview metrics */}
          <div className="metrics" style={{ marginBottom: 16 }}>
            <Metric
              label="Overall Status"
              value={health.overallStatus}
              icon={Smartphone}
              tone={
                health.overallStatus === "healthy"
                  ? "green"
                  : health.overallStatus === "degraded"
                    ? "orange"
                    : "red"
              }
            />
            <Metric
              label="Database Latency"
              value={`${db?.latency ?? 0}ms`}
              icon={Smartphone}
              tone={
                (db?.latency ?? 0) < 100
                  ? "green"
                  : (db?.latency ?? 0) < 500
                    ? "orange"
                    : "red"
              }
            />
            <Metric
              label="Memory Usage"
              value={s?.memory?.percentage != null ? `${s.memory.percentage}%` : "—"}
              icon={Smartphone}
              tone={
                (s?.memory?.percentage ?? 0) < 70
                  ? "green"
                  : (s?.memory?.percentage ?? 0) < 85
                    ? "orange"
                    : "red"
              }
            />
            <Metric
              label="Active Devices"
              value={dev != null ? `${dev.online}/${dev.total}` : "—"}
              icon={Smartphone}
              tone={
                dev && dev.online === dev.total && dev.total > 0
                  ? "green"
                  : "orange"
              }
            />
          </div>

          {/* Server + Database info */}
          <div className="dashboard-grid" style={{ marginBottom: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <div className="card-heading" style={{ marginBottom: 14 }}>
                <div>
                  <span className="card-kicker">Server</span>
                  <h3>
                    {dot(s?.status ?? "info")}{" "}
                    {s?.status ?? "Unknown"}
                  </h3>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>Uptime</span>
                  <p style={{ margin: 0 }}>
                    {s?.uptime != null ? fmtUptime(s.uptime) : "—"}
                  </p>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>Platform</span>
                  <p style={{ margin: 0 }}>
                    {s?.platform ?? "—"} · Node {s?.nodeVersion ?? ""}
                  </p>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>CPU</span>
                  <p style={{ margin: 0 }}>
                    {s?.cpu?.cores ?? "—"} cores
                    {s?.cpu?.loadAverage
                      ? ` (load: ${s.cpu.loadAverage.map((l) => l.toFixed(2)).join(", ")})`
                      : ""}
                  </p>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>Memory</span>
                  <p style={{ margin: 0 }}>
                    {s?.memory?.used ?? "—"} / {s?.memory?.total ?? "—"}{" "}
                    ({s?.memory?.percentage ?? 0}%)
                  </p>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div className="card-heading" style={{ marginBottom: 14 }}>
                <div>
                  <span className="card-kicker">Database</span>
                  <h3>
                    {dot(db?.status ?? "info")}{" "}
                    {db?.status ?? "Unknown"}
                  </h3>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>Latency</span>
                  <p style={{ margin: 0 }}>{db?.latency ?? 0}ms</p>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>Collections</span>
                  <p style={{ margin: 0 }}>{db?.collections ?? 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payments + Devices + Sockets */}
          <div className="dashboard-grid" style={{ marginBottom: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <div className="card-heading" style={{ marginBottom: 14 }}>
                <div>
                  <span className="card-kicker">Payments</span>
                  <h3>
                    {dot(pay?.status ?? "info")}{" "}
                    {pay?.status ?? "Unknown"}
                  </h3>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>Pending</span>
                  <p style={{ margin: 0 }}>{pay?.pendingCount ?? 0}</p>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>Processing</span>
                  <p style={{ margin: 0 }}>{pay?.processingCount ?? 0}</p>
                </div>
                {pay?.oldestPending && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <span style={{ color: "var(--muted)", fontSize: 11 }}>
                      Oldest pending transaction
                    </span>
                    <p style={{ margin: 0, fontSize: 12 }}>
                      {new Date(pay.oldestPending).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div className="card-heading" style={{ marginBottom: 14 }}>
                <div>
                  <span className="card-kicker">Devices</span>
                  <h3>
                    {dot(dev?.status ?? "info")}{" "}
                    {dev?.status ?? "Unknown"}
                  </h3>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>Total</span>
                  <p style={{ margin: 0 }}>{dev?.total ?? 0}</p>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>Online</span>
                  <p style={{ margin: 0, color: "var(--green)" }}>
                    {dev?.online ?? 0}
                  </p>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>Offline</span>
                  <p style={{ margin: 0, color: "#e97389" }}>
                    {dev?.offline ?? 0}
                  </p>
                </div>
                {dev && dev.total > 0 && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <span style={{ color: "var(--muted)", fontSize: 11 }}>
                      Availability
                    </span>
                    <p style={{ margin: 0 }}>
                      {Math.round((dev.online / dev.total) * 100)}%
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div className="card-heading" style={{ marginBottom: 14 }}>
                <div>
                  <span className="card-kicker">Sockets</span>
                  <h3>
                    {dot(sock?.status ?? "info")}{" "}
                    {sock?.status ?? "Unknown"}
                  </h3>
                </div>
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "var(--muted)", fontSize: 11 }}>
                  Active connections
                </span>
                <p style={{ margin: 0 }}>{sock?.connections ?? 0}</p>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <p
            style={{
              fontSize: 11,
              color: "var(--muted)",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            Last checked: {new Date().toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}
