import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { orderApi } from "../../services/api";
import type { OrderInvoice } from "../../types";
import {
  EmptyRow,
  LoadingRow,
  PageHeader,
  Pagination,
  Status,
  TableCard,
} from "./ui";

export default function Orders() {
  const [rows, setRows] = useState<OrderInvoice[]>([]);
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
      const res = await orderApi.list(params);
      if (res.data?.success) {
        setRows(res.data.data?.orders || []);
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
        title="Orders"
        description="View and manage payment requests and invoices."
        icon={FileText}
      />
      <TableCard colSpan={6}>
        <thead>
          <tr>
            <th>Request ID</th>
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
            <EmptyRow colSpan={6} message="No orders found" />
          ) : (
            rows.map((o) => (
              <tr key={o._id}>
                <td>
                  <strong>{o.requestId}</strong>
                  {o.publicInvoiceId && (
                    <small>{o.publicInvoiceId}</small>
                  )}
                </td>
                <td>{o.customerName || "—"}</td>
                <td>
                  <strong>{fmt(o.amount)}</strong>
                </td>
                <td>
                  <Status>{o.status}</Status>
                </td>
                <td>
                  <span className={`mini-provider ${o.provider}`}>
                    {o.provider}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: "var(--muted)" }}>
                  {new Date(o.createdAt).toLocaleDateString()}
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