import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { refundApi } from "../../services/api";
import type { Refund } from "../../types";
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

export default function Refunds() {
  const [rows, setRows] = useState<Refund[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{
    total: number;
    totalPages: number;
  }>({ total: 0, totalPages: 1 });
  const [filter, setFilter] = useState({ status: "", search: "" });

  const fetchRows = async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(p),
        limit: "20",
      };
      if (filter.status) params.status = filter.status;
      if (filter.search) params.search = filter.search;
      const res = await refundApi.list(params);
      if (res.data?.success) {
        setRows(res.data.data?.refunds || []);
        setPagination(
          res.data.data?.pagination || { total: 0, totalPages: 1 }
        );
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await refundApi.stats();
      if (res.data?.success) setStats(res.data.data);
    } catch {}
  };

  useEffect(() => {
    fetchStats();
    fetchRows(1);
    setPage(1);
  }, [filter.status]);

  const fmt = (v: number) => `৳ ${(v || 0).toLocaleString("en-BD")}`;

  return (
    <div className="resource-page">
      <PageHeader
        title="Refunds"
        description="Manage refund requests — create, approve, or reject."
        icon={RefreshCw}
      />

      {/* Stats */}
      {stats && (
        <div className="metrics" style={{ marginBottom: 16 }}>
          <Metric
            label="Total Refunds"
            value={String(stats.totalRefunds || 0)}
            icon={RefreshCw}
            tone="purple"
          />
          <Metric
            label="Total Refunded"
            value={fmt(stats.totalRefundedAmount || 0)}
            icon={RefreshCw}
            tone="green"
          />
          <Metric
            label="Pending"
            value={String(stats.byStatus?.requested?.count || 0)}
            icon={RefreshCw}
            tone="orange"
          />
          <Metric
            label="Failed / Rejected"
            value={String(stats.byStatus?.failed?.count || 0)}
            icon={RefreshCw}
            tone="red"
          />
        </div>
      )}

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
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          style={{
            background: "#111722",
            border: "1px solid var(--line)",
            color: "var(--text)",
            padding: "8px 10px",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          <option value="">All statuses</option>
          <option value="requested">Requested</option>
          <option value="processing">Processing</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          type="text"
          placeholder="Search by refund ID or reason..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && fetchRows(1)}
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
        <button
          className="outline-btn"
          onClick={() => fetchRows(1)}
          style={{ fontSize: 12 }}
        >
          Search
        </button>
      </div>

      <TableCard colSpan={6}>
        <thead>
          <tr>
            <th>Refund ID</th>
            <th>Transaction</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <LoadingRow colSpan={6} />
          ) : rows.length === 0 ? (
            <EmptyRow colSpan={6} message="No refunds found" />
          ) : (
            rows.map((r) => (
              <tr key={r._id}>
                <td>
                  <strong>{r.refundId}</strong>
                </td>
                <td style={{ fontFamily: "monospace", fontSize: 10 }}>
                  {r.transactionId}
                </td>
                <td>
                  <strong>{fmt(r.amount)}</strong>
                </td>
                <td>
                  <Status>{r.status}</Status>
                </td>
                <td
                  style={{
                    maxWidth: 200,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {r.reason}
                </td>
                <td style={{ fontSize: 11, color: "var(--muted)" }}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </TableCard>

      <Pagination
        page={page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={(p) => {
          setPage(p);
          fetchRows(p);
        }}
      />
    </div>
  );
}