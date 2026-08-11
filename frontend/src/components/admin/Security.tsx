import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { securityApi } from "../../services/api";
import type { AdminSession, SecurityOverview } from "../../types";
import {
  EmptyRow,
  LoadingRow,
  Metric,
  PageHeader,
  Pagination,
  Spinner,
  Status,
  TableCard,
} from "./ui";

export default function Security() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await securityApi.overview();
      if (res.data?.success) setOverview(res.data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    setSessionLoading(true);
    try {
      const res = await securityApi.sessions();
      if (res.data?.success) {
        setSessions(res.data.data?.sessions || []);
      }
    } catch {
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchSessions();
  }, []);

  const revokeSession = async (id: string) => {
    if (!confirm("Revoke this session? The user will be logged out.")) return;
    setRevoking(id);
    try {
      await securityApi.revokeSession(id);
      await fetchSessions();
      await fetchOverview();
    } catch {
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="resource-page">
      <PageHeader
        title="Security"
        description="Monitor active sessions, revoke access, and view login activity."
        icon={ShieldCheck}
      />

      {/* Overview metrics */}
      {overview && (
        <div className="metrics" style={{ marginBottom: 16 }}>
          <Metric
            label="Active Sessions"
            value={String(overview.activeSessions)}
            icon={ShieldCheck}
            tone="green"
          />
          <Metric
            label="Failed Logins (24h)"
            value={String(overview.failedLogins)}
            icon={ShieldCheck}
            tone="red"
          />
          <Metric
            label="Total Users"
            value={String(overview.totalUsers)}
            icon={ShieldCheck}
            tone="purple"
          />
          <Metric
            label="Users w/ Active Sessions"
            value={String(overview.usersWithActiveSessions)}
            icon={ShieldCheck}
            tone="blue"
          />
        </div>
      )}

      {/* Sessions table */}
      <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>
        Active Sessions
      </h3>
      <TableCard colSpan={5}>
        <thead>
          <tr>
            <th>User</th>
            <th>IP Address</th>
            <th>User Agent</th>
            <th>Last Activity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessionLoading ? (
            <LoadingRow colSpan={5} />
          ) : sessions.length === 0 ? (
            <EmptyRow colSpan={5} message="No active sessions" />
          ) : (
            sessions.map((s) => (
              <tr key={s._id}>
                <td>
                  <strong>
                    {s.userId?.name || "Unknown"}
                  </strong>
                  <small>{s.userId?.email}</small>
                </td>
                <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                  {s.ipAddress}
                </td>
                <td
                  style={{
                    maxWidth: 220,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontSize: 10,
                    color: "var(--muted)",
                  }}
                >
                  {s.userAgent}
                </td>
                <td style={{ fontSize: 11, color: "var(--muted)" }}>
                  {new Date(s.lastActivityAt).toLocaleString()}
                </td>
                <td>
                  <button
                    className="outline-btn"
                    onClick={() => revokeSession(s._id)}
                    disabled={revoking === s._id}
                    style={{
                      fontSize: 10,
                      padding: "5px 10px",
                      color: "#e97389",
                      borderColor: "#e97389",
                    }}
                  >
                    {revoking === s._id ? "Revoking..." : "Revoke"}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </TableCard>
    </div>
  );
}