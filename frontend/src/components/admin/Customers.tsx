import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { customerApi } from "../../services/api";
import type { Customer } from "../../types";
import {
  EmptyRow,
  LoadingRow,
  PageHeader,
  Pagination,
  TableCard,
} from "./ui";

export default function Customers() {
  const [rows, setRows] = useState<Customer[]>([]);
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
      const res = await customerApi.list(params);
      if (res.data?.success) {
        setRows(res.data.data?.customers || []);
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
        title="Customers"
        description="Aggregated customer overview by phone number."
        icon={Users}
      />
      <TableCard colSpan={6}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Orders</th>
            <th>Paid</th>
            <th>Total Spent</th>
            <th>Last Order</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <LoadingRow colSpan={6} />
          ) : rows.length === 0 ? (
            <EmptyRow colSpan={6} message="No customers found" />
          ) : (
            rows.map((c) => (
              <tr key={c.phone}>
                <td>
                  <strong>{c.name}</strong>
                </td>
                <td style={{ fontFamily: "monospace" }}>{c.phone}</td>
                <td>{c.orderCount}</td>
                <td>
                  <span style={{ color: "var(--green)" }}>
                    {c.paidCount}
                  </span>
                </td>
                <td>
                  <strong>{fmt(c.totalSpent)}</strong>
                </td>
                <td style={{ fontSize: 11, color: "var(--muted)" }}>
                  {c.lastOrderAt
                    ? new Date(c.lastOrderAt).toLocaleDateString()
                    : "—"}
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