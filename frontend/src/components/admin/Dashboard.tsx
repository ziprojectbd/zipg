import React, { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Plus,
  X,
} from "lucide-react";
import { dashboardApi } from "../../services/api";
import { Metric, PageHeader } from "./ui";

type Icon = React.ComponentType<{ size?: number }>;

const fmt = (v: number) => `৳ ${(v || 0).toLocaleString("en-BD")}`;

function getUser() {
  try {
    const raw = localStorage.getItem("zi-pay-user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .overview()
      .then((res) => {
        if (res.data?.success) setOverview(res.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const m = overview?.metrics;
  const metrics: Array<{
    label: string;
    value: string;
    delta: string;
    icon: Icon;
    tone: "purple" | "green" | "blue" | "orange" | "red";
  }> = [
    {
      label: "Today's Revenue",
      value: m ? fmt(m.todayRevenue) : "—",
      delta: "vs yesterday",
      icon: CircleDollarSign,
      tone: "purple",
    },
    {
      label: "Successful payments",
      value: m ? String(m.successCount) : "—",
      delta: "all time",
      icon: CheckCircle2,
      tone: "green",
    },
    {
      label: "Average payment",
      value: m ? fmt(m.averagePayment) : "—",
      delta: "per transaction",
      icon: ArrowUpRight,
      tone: "blue",
    },
    {
      label: "Total transactions",
      value: m ? String(m.totalTransactions) : "—",
      delta: "all time",
      icon: Activity,
      tone: "orange",
    },
  ];

  return (
    <>
      <div className="page-intro">
        <div>
          <h2>Good morning, {getUser()?.name?.split(" ")[0] || "Admin"}</h2>
          <p>Here is what's happening with your payments today.</p>
        </div>
        <button className="primary-btn">
          <Plus size={17} /> Create payment request
        </button>
      </div>

      <div className="metrics">
        {metrics.map((mt) => (
          <Metric key={mt.label} {...mt} />
        ))}
      </div>

      <div className="metrics" style={{ marginTop: 14 }}>
        <Metric
          label="Pending payments"
          value={m ? String(m.pendingCount) : "—"}
          delta="need matching"
          icon={Clock}
          tone="orange"
        />
        <Metric
          label="Failed payments"
          value={m ? String(m.failedCount) : "—"}
          delta="action required"
          icon={X}
          tone="red"
        />
        <Metric
          label="Week Revenue"
          value={m ? fmt(m.weekRevenue) : "—"}
          delta="last 7 days"
          icon={CircleDollarSign}
          tone="purple"
        />
        <Metric
          label="Month Revenue"
          value={m ? fmt(m.monthRevenue) : "—"}
          delta="this month"
          icon={CircleDollarSign}
          tone="green"
        />
      </div>

      <div className="dashboard-grid">
        <div className="card chart-card">
          <div className="card-heading">
            <div>
              <span className="card-kicker">Revenue overview</span>
              <h2>{m ? fmt(m.totalRevenue) : "—"}</h2>
            </div>
            <select defaultValue="30">
              <option value="30">Last 30 days</option>
              <option value="7">Last 7 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          <div className="chart">
            <div className="y-labels">
              <span>৳ 80k</span>
              <span>৳ 60k</span>
              <span>৳ 40k</span>
              <span>৳ 20k</span>
              <span>৳ 0</span>
            </div>
            <svg
              viewBox="0 0 600 130"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="fill"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop
                    offset="0"
                    stopColor="#8b5cf6"
                    stopOpacity=".28"
                  />
                  <stop
                    offset="1"
                    stopColor="#8b5cf6"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              <path
                d="M 0,112 30,108 60,114 90,96 120,103 150,91 180,95 210,68 240,80 270,58 300,64 330,45 360,55 390,34 420,40 450,22 480,29 510,14 540,26 570,7 600,18 L 600,130 L 0,130 Z"
                fill="url(#fill)"
              />
              <polyline
                points="0,112 30,108 60,114 90,96 120,103 150,91 180,95 210,68 240,80 270,58 300,64 330,45 360,55 390,34 420,40 450,22 480,29 510,14 540,26 570,7 600,18"
                fill="none"
                stroke="#9b7bff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="x-labels">
              <span>01 Sep</span>
              <span>07 Sep</span>
              <span>14 Sep</span>
              <span>21 Sep</span>
              <span>30 Sep</span>
            </div>
          </div>
        </div>
        <div className="card provider-card">
          <div className="card-heading">
            <div>
              <span className="card-kicker">Payment methods</span>
              <h3>Provider performance</h3>
            </div>
          </div>
          {overview?.providerBreakdown?.map((p: any) => (
            <React.Fragment key={p.name}>
              <div className="provider-row">
                <div className="provider-name">
                  <span
                    className={`provider-logo ${p.name?.toLowerCase()}`}
                  >
                    {p.name?.[0]}
                  </span>
                  <div>
                    <strong>{p.name}</strong>
                    <small>{p.count} transactions</small>
                  </div>
                </div>
                <strong>৳ {p.revenue?.toLocaleString?.("en-BD")}</strong>
                <span className="provider-percent">
                  {p.percentage}%
                </span>
              </div>
              <div className="progress">
                <i
                  style={{
                    width: `${p.percentage}%`,
                    background:
                      p.name === "bKash"
                        ? "#e84d8a"
                        : p.name === "Nagad"
                        ? "#f47e35"
                        : "#8049b8",
                  }}
                />
              </div>
            </React.Fragment>
          ))}
          {loading && (
            <div style={{ color: "var(--muted)", fontSize: 12 }}>
              Loading...
            </div>
          )}
        </div>
      </div>
    </>
  );
}