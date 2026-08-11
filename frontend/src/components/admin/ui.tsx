import React from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";

/* ──── Status Badge ──── */

export function Status({ children }: { children: string }) {
  const s = String(children).toLowerCase();
  return (
    <span className={`status ${s}`}>
      <i />
      {children}
    </span>
  );
}

/* ──── Metric Card ──── */

type MetricTone = "purple" | "green" | "blue" | "orange" | "red";

export function Metric({
  label,
  value,
  delta,
  icon: I,
  tone,
}: {
  label: string;
  value: string;
  delta?: string;
  icon: React.ComponentType<{ size?: number }>;
  tone: MetricTone;
}) {
  return (
    <div className="metric card">
      <div className="metric-head">
        <span>{label}</span>
        <div className={`metric-icon ${tone}`}>
          <I size={18} />
        </div>
      </div>
      <strong>{value}</strong>
      {delta && (
        <div className="metric-foot">
          <span className="positive">
            <ArrowUpRight size={14} />
            {delta}
          </span>
        </div>
      )}
    </div>
  );
}

/* ──── Page Header ──── */

export function PageHeader({
  title,
  description,
  icon: I,
  action,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <div className="resource-title">
          <div className="metric-icon purple">
            <I size={19} />
          </div>
          <h2>{title}</h2>
        </div>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

/* ──── Empty State ──── */

export function EmptyState({
  icon: I,
  title,
  message,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  message: string;
}) {
  return (
    <div className="card empty-card">
      <div className="empty-icon">
        <I size={22} />
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

/* ──── Spinner ──── */

export function Spinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
      <div className="spinner" style={{ margin: "0 auto 8px" }} />
      {text}
    </div>
  );
}

/* ──── Pagination ──── */

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0",
        fontSize: 13,
        color: "var(--muted)",
      }}
    >
      <span>
        {total} result{total !== 1 ? "s" : ""} — page {page} of {totalPages}
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          className="outline-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          style={{ padding: "6px 10px", fontSize: 12 }}
        >
          <ChevronLeft size={14} />
        </button>
        <button
          className="outline-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          style={{ padding: "6px 10px", fontSize: 12 }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ──── Alert Banner ──── */

export function AlertBanner({
  message,
  type = "warning",
}: {
  message: string;
  type?: "warning" | "error" | "info";
}) {
  const colors = {
    warning: { bg: "#3d2b00", border: "#92700a", text: "#e0c46a" },
    error: { bg: "#3d0a0a", border: "#922020", text: "#e06a6a" },
    info: { bg: "#0a1a3d", border: "#205092", text: "#6ab0e0" },
  };
  const c = colors[type];
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        padding: "10px 14px",
        borderRadius: 9,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 14,
      }}
    >
      <AlertTriangle size={15} />
      {message}
    </div>
  );
}

/* ──── Table Card (wraps a table in the standard card) ──── */

export function TableCard({
  children,
  colSpan,
  loading,
  emptyMessage = "No data found",
}: {
  children: React.ReactNode;
  colSpan: number;
  loading?: boolean;
  emptyMessage?: string;
  isEmpty?: boolean;
}) {
  return (
    <div className="card" style={{ padding: "20px 20px 7px" }}>
      <div className="table-wrap" style={{ margin: "0 -20px -7px" }}>
        <table>
          {children}
        </table>
      </div>
    </div>
  );
}

/* ──── Empty Table Row ──── */

export function EmptyRow({
  colSpan,
  icon: I = Inbox,
  message = "No data found",
}: {
  colSpan: number;
  icon?: React.ComponentType<{ size?: number }>;
  message?: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}
      >
        <span style={{ opacity: 0.4, marginBottom: 6, display: "block" }}>
          <I size={20} />
        </span>
        {message}
      </td>
    </tr>
  );
}

/* ──── Loading Table Row ──── */

export function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}
      >
        Loading...
      </td>
    </tr>
  );
}
