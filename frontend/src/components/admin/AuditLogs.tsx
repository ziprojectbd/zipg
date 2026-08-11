import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { activityLogApi } from "../../services/api";
import type { ActivityLog } from "../../types";
import {
  EmptyRow,
  LoadingRow,
  PageHeader,
  Pagination,
  Status,
  TableCard,
} from "./ui";

export default function AuditLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{
    total: number;
    totalPages: number;
  }>({ total: 0, totalPages: 1 });
  const [filter, setFilter] = useState({ action: "", search: "" });

  const fetchLogs = async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(p),
        limit: "20",
      };
      if (filter.action) params.action = filter.action;
      if (filter.search) params.search = filter.search;
      const res = await activityLogApi.list(params);
      if (res.data?.success) {
        setLogs(res.data.data?.logs || []);
        setPagination(
          res.data.data?.pagination || { total: 0, totalPages: 1 }
        );
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    setPage(1);
  }, [filter.action]);

  const severityColor = (s: string) => {
    switch (s) {
      case "critical":
      case "error":
        return { bg: "#3d0a0a", color: "#e06a6a" };
      case "warning":
        return { bg: "#3d2b00", color: "#e0c46a" };
      default:
        return { bg: "#1d3046", color: "#6ab0e0" };
    }
  };

  return (
    <div className="resource-page">
      <PageHeader
        title="Audit Logs"
        description="Immutable record of all system and user activity."
        icon={Shield}
      />

      {/* Filters */}
      <div
        className="card"
        style={{
          padding: "14px 18px",
          marginBottom: 14,
          display: "flex",
          gap: 10,
        }}
      >
        <select
          value={filter.action}
          onChange={(e) => setFilter({ ...filter, action: e.target.value })}
          style={{
            background: "#111722",
            border: "1px solid var(--line)",
            color: "var(--text)",
            padding: "8px 10px",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          <option value="">All actions</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="payment_verified">Payment verified</option>
          <option value="payment_failed">Payment failed</option>
          <option value="refund_requested">Refund requested</option>
          <option value="settings_updated">Settings updated</option>
          <option value="security_event">Security event</option>
        </select>
        <input
          type="text"
          placeholder="Search logs..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && fetchLogs(1)}
          style={{
            background: "#111722",
            border: "1px solid var(--line)",
            color: "var(--text)",
            padding: "8px 10px",
            borderRadius: 6,
            fontSize: 12,
            flex: 1,
          }}
        />
      </div>

      <TableCard colSpan={5}>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Action</th>
            <th>User</th>
            <th>Message</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <LoadingRow colSpan={5} />
          ) : logs.length === 0 ? (
            <EmptyRow colSpan={5} message="No audit logs found" />
          ) : (
            logs.map((log) => {
              const sev = severityColor(log.severity);
              return (
                <tr key={log._id}>
                  <td>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "3px 8px",
                        borderRadius: 4,
                        background: sev.bg,
                        color: sev.color,
                        fontWeight: 600,
                      }}
                    >
                      {log.severity}
                    </span>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: 10 }}>
                    {log.action}
                  </td>
                  <td>{log.userId?.name || "—"}</td>
                  <td
                    style={{
                      maxWidth: 280,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {log.message}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </TableCard>

      <Pagination
        page={page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={(p) => {
          setPage(p);
          fetchLogs(p);
        }}
      />
    </div>
  );
}