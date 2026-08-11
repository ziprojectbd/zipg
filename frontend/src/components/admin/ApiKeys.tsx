import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { apiKeyApi } from "../../services/api";
import type { ApiKey } from "../../types";
import {
  EmptyRow,
  LoadingRow,
  PageHeader,
  TableCard,
} from "./ui";

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await apiKeyApi.list();
      if (res.data?.success) {
        setKeys(res.data.data?.keys || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const revoke = async (id: string) => {
    if (!confirm("Revoke this API key? The key will stop working immediately.")) return;
    setLoadingAction(id);
    try {
      await apiKeyApi.revoke(id);
      await fetchKeys();
    } catch {
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="resource-page">
      <PageHeader
        title="API Keys"
        description="Manage merchant API keys for programmatic access."
        icon={KeyRound}
        action={
          <button className="primary-btn">
            Generate key
          </button>
        }
      />

      <TableCard colSpan={5}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Key</th>
            <th>Merchant</th>
            <th>Status</th>
            <th>Last Used</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <LoadingRow colSpan={5} />
          ) : keys.length === 0 ? (
            <EmptyRow colSpan={5} message="No API keys generated yet" />
          ) : (
            keys.map((k) => (
              <tr key={k._id}>
                <td>
                  <strong>{k.name}</strong>
                </td>
                <td style={{ fontFamily: "monospace", fontSize: 10 }}>
                  {k.key?.substring(0, 16)}...
                </td>
                <td>{k.merchantName}</td>
                <td>
                  {k.isActive ? (
                    <span style={{ color: "var(--green)" }}>Active</span>
                  ) : (
                    <span style={{ color: "#e97389" }}>Revoked</span>
                  )}
                </td>
                <td style={{ fontSize: 11, color: "var(--muted)" }}>
                  {k.lastUsedAt
                    ? new Date(k.lastUsedAt).toLocaleString()
                    : "Never"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </TableCard>
    </div>
  );
}