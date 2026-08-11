import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { reconciliationApi } from "../../services/api";
import type {
  ReconciliationSummary,
  ReconciliationMismatch,
} from "../../types";
import {
  EmptyRow,
  LoadingRow,
  Metric,
  PageHeader,
  Pagination,
  Status,
  TableCard,
} from "./ui";

export default function Reconciliation() {
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [mismatches, setMismatches] = useState<ReconciliationMismatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [mismatchLoading, setMismatchLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{
    total: number;
    totalPages: number;
  }>({ total: 0, totalPages: 1 });
  const [mismatchType, setMismatchType] = useState<
    "all" | "status_mismatch" | "orphaned"
  >("all");

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await reconciliationApi.summary();
      if (res.data?.success) setSummary(res.data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fetchMismatches = async (p = page) => {
    setMismatchLoading(true);
    try {
      const res = await reconciliationApi.mismatches({
        page: String(p),
        limit: "20",
        type: mismatchType,
      });
      if (res.data?.success) {
        setMismatches(res.data.data?.mismatches || []);
        setPagination(
          res.data.data?.pagination || { total: 0, totalPages: 1 }
        );
      }
    } catch {
    } finally {
      setMismatchLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchMismatches(1);
    setPage(1);
  }, [mismatchType]);

  const fmt = (v: number) => `৳ ${(v || 0).toLocaleString("en-BD")}`;

  return (
    <div className="resource-page">
      <PageHeader
        title="Reconciliation"
        description="Match transactions against payment requests — detect mismatches and orphaned records."
        icon={Activity}
      />

      {/* Summary metrics */}
      {summary && (
        <div className="metrics" style={{ marginBottom: 16 }}>
          <Metric
            label="Total Transactions"
            value={String(summary.totalTransactions)}
            icon={Activity}
            tone="purple"
          />
          <Metric
            label="Paid Amount"
            value={fmt(summary.paidAmount)}
            icon={Activity}
            tone="green"
          />
          <Metric
            label="Pending Amount"
            value={fmt(summary.pendingAmount)}
            icon={Activity}
            tone="orange"
          />
          <Metric
            label="Mismatches"
            value={String(summary.mismatchedCount)}
            icon={Activity}
            tone={summary.mismatchedCount > 0 ? "red" : "green"}
          />
        </div>
      )}

      {summary && (
        <div className="metrics" style={{ marginBottom: 16 }}>
          <Metric
            label="Orphaned"
            value={String(summary.orphanedCount)}
            icon={Activity}
            tone={summary.orphanedCount > 0 ? "red" : "green"}
          />
          <Metric
            label="Paid"
            value={String(summary.totalPaid)}
            icon={Activity}
            tone="green"
          />
          <Metric
            label="Failed"
            value={String(summary.totalFailed)}
            icon={Activity}
            tone="red"
          />
          <Metric
            label="Expired"
            value={String(summary.totalExpired)}
            icon={Activity}
            tone="orange"
          />
        </div>
      )}

      {/* Mismatch type filter */}
      <div
        className="card"
        style={{
          padding: "14px 18px",
          marginBottom: 14,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          Show mismatches:
        </span>
        {(
          [
            { value: "all", label: "All" },
            { value: "status_mismatch", label: "Status Mismatches" },
            { value: "orphaned", label: "Orphaned" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.value}
            className={mismatchType === opt.value ? "primary-btn" : "outline-btn"}
            onClick={() => setMismatchType(opt.value)}
            style={{ fontSize: 11, padding: "6px 12px" }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Mismatch table */}
      <TableCard colSpan={5}>
        <thead>
          <tr>
            <th>Type</th>
            <th>Transaction ID</th>
            <th>Transaction Status</th>
            <th>Payment Request Status</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {mismatchLoading ? (
            <LoadingRow colSpan={5} />
          ) : mismatches.length === 0 ? (
            <EmptyRow colSpan={5} message="No mismatches found — everything is in sync!" />
          ) : (
            mismatches.map((m: any, i: number) => (
              <tr key={i}>
                <td>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "4px 8px",
                      borderRadius: 4,
                      background:
                        m.type === "orphaned"
                          ? "#3d2b00"
                          : "#3d0a0a",
                      color:
                        m.type === "orphaned" ? "#e0c46a" : "#e06a6a",
                    }}
                  >
                    {m.type === "orphaned" ? "Orphaned" : "Status Mismatch"}
                  </span>
                </td>
                <td>
                  <strong>{m.transaction?.transactionId}</strong>
                </td>
                <td>
                  <Status>{m.transaction?.status}</Status>
                </td>
                <td>
                  {m.paymentRequest ? (
                    <Status>{m.paymentRequest.status}</Status>
                  ) : (
                    <span style={{ color: "var(--muted)", fontSize: 10 }}>
                      — (deleted)
                    </span>
                  )}
                </td>
                <td>
                  <strong>৳ {m.transaction?.amount?.toLocaleString("en-BD")}</strong>
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
          fetchMismatches(p);
        }}
      />
    </div>
  );
}