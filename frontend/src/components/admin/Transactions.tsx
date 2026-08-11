import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { adminTransactionApi } from "../../services/api";
import type { Transaction } from "../../types";
import {
  EmptyRow,
  LoadingRow,
  PageHeader,
  Pagination,
  Spinner,
  Status,
  TableCard,
} from "./ui";

export default function Transactions() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{
    total: number;
    totalPages: number;
  }>({ total: 0, totalPages: 1 });
  const [filter, setFilter] = useState({
    status: "",
    provider: "",
    search: "",
  });

  const fetchRows = async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: String(p), limit: "20" };
      if (filter.status) params.status = filter.status;
      if (filter.provider) params.provider = filter.provider;
      if (filter.search) params.search = filter.search;
      const res = await adminTransactionApi.list(params);
      if (res.data?.success) {
        setRows(res.data.data?.payments || []);
        setPagination(res.data.data?.pagination || { total: 0, totalPages: 1 });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1);
    setPage(1);
  }, [filter.status, filter.provider]);

  const fmt = (v: number) => `৳ ${(v || 0).toLocaleString("en-BD")}`;

  return (
    <div className="resource-page">
      <PageHeader
        title="Transactions"
        description="All payment transactions across the gateway."
        icon={CreditCard}
      />

      {/* Filters */}
      <div
        className="card"
        style={{
          padding: "14px 18px",
          marginBottom: 14,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
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
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filter.provider}
          onChange={(e) => setFilter({ ...filter, provider: e.target.value })}
          style={{
            background: "#111722",
            border: "1px solid var(--line)",
            color: "var(--text)",
            padding: "8px 10px",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          <option value="">All providers</option>
          <option value="bkash">bKash</option>
          <option value="nagad">Nagad</option>
          <option value="rocket">Rocket</option>
        </select>
        <input
          type="text"
          placeholder="Search by ID or name..."
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
            minWidth: 150,
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
            <th>Transaction ID</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Provider</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <LoadingRow colSpan={6} />
          ) : rows.length === 0 ? (
            <EmptyRow
              colSpan={6}
              message="No transactions found"
            />
          ) : (
            rows.map((p) => (
              <tr key={p._id}>
                <td>
                  <strong>{p.transactionId}</strong>
                </td>
                <td>{p.customerName}</td>
                <td>
                  <strong>{fmt(p.amount)}</strong>
                </td>
                <td>
                  <Status>{p.status}</Status>
                </td>
                <td>
                  <span className={`mini-provider ${p.provider}`}>
                    {p.provider}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: "var(--muted)" }}>
                  {new Date(p.createdAt).toLocaleDateString()}
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