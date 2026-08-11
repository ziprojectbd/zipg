import { useEffect, useState } from "react";
import { CircleDollarSign } from "lucide-react";
import { paymentMethodApi } from "../../services/api";
import type { PaymentMethod } from "../../types";
import { EmptyRow, LoadingRow, PageHeader, Spinner, TableCard } from "./ui";

export default function PaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const res = await paymentMethodApi.list();
      if (res.data?.success) {
        setMethods(res.data.data?.methods || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const toggleActive = async (m: PaymentMethod) => {
    setSaving(m.code);
    try {
      await paymentMethodApi.update(m.code, { isActive: !m.isActive });
      await fetchMethods();
    } catch {
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="resource-page">
      <PageHeader
        title="Payment Methods"
        description="Configure supported payment providers and their settings."
        icon={CircleDollarSign}
      />
      <TableCard colSpan={7}>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Display Name</th>
            <th>Account Number</th>
            <th>Status</th>
            <th>Fee</th>
            <th>Min / Max</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <LoadingRow colSpan={7} />
          ) : methods.length === 0 ? (
            <EmptyRow colSpan={7} message="No payment methods configured" />
          ) : (
            methods.map((m) => (
              <tr key={m._id}>
                <td>
                  <span className={`mini-provider ${m.code}`}>{m.code}</span>
                </td>
                <td>{m.displayName}</td>
                <td style={{ fontFamily: "monospace" }}>{m.accountNumber}</td>
                <td>
                  {m.isActive ? (
                    <span style={{ color: "var(--green)" }}>Active</span>
                  ) : (
                    <span style={{ color: "#e97389" }}>Disabled</span>
                  )}
                </td>
                <td>
                  {m.processingFee}
                  {m.processingFeeType === "percentage" ? "%" : " BDT"}
                </td>
                <td>
                  ৳{m.minAmount.toLocaleString()} – ৳
                  {m.maxAmount.toLocaleString()}
                </td>
                <td>
                  <button
                    className="outline-btn"
                    onClick={() => toggleActive(m)}
                    disabled={saving === m.code}
                    style={{ fontSize: 10, padding: "5px 10px" }}
                  >
                    {saving === m.code
                      ? "Saving..."
                      : m.isActive
                      ? "Disable"
                      : "Enable"}
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