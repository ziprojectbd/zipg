import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { paymentApi } from "../../services/api";
import type { Transaction } from "../../types";
import {
  EmptyRow,
  LoadingRow,
  PageHeader,
  Pagination,
  Status,
  TableCard,
} from "./ui";

export default function Payments() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{
    total: number;
    totalPages: number;
  }>({ total: 0, totalPages: 1 });

  const fetchRows = async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(p),
        limit: "20",
      };
      const res = await paymentApi.list(params);
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
  }, []);

  const fmt = (v: number) => `৳ ${(v || 0).toLocaleString("en-BD")}`;

  return (
    <div className="resource-page">
      <PageHeader
        title="Payments"
        description="Verify, retry, or cancel individual payments."
        icon={Globe}
      />
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
            <EmptyRow colSpan={6} message="No payments found" />
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