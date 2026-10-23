import { useEffect, useMemo, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
const STUDENT_NAME = import.meta.env.VITE_STUDENT_NAME || "ENIYASRI P";
const ROLL_NUMBER = import.meta.env.VITE_ROLL_NUMBER || "24EIR027";

function formatDate(value) {
  if (!value) return "Waiting for event...";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export default function App() {
  const [data, setData] = useState(null);
  const [apiReachable, setApiReachable] = useState(false);
  const [error, setError] = useState("");
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    let active = true;
    let timer;
    async function refresh() {
      try {
        const res = await fetch(`${API_BASE}/api/telemetry`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (!active) return;
        setData(result);
        setApiReachable(true);
        setError("");
        setLastChecked(new Date());
      } catch (err) {
        if (!active) return;
        setApiReachable(false);
        setError(err?.message || "Cannot reach backend");
      } finally {
        if (active) timer = setTimeout(refresh, 2500);
      }
    }
    refresh();
    return () => { active = false; clearTimeout(timer); };
  }, []);

  const telemetry = data?.telemetry;
  const asciiValues = telemetry?.asciiValues || [];
  const convertedString =
    telemetry?.convertedString ||
    (asciiValues.length > 0 ? String.fromCharCode(...asciiValues) : "—");
  const isConnected = (apiReachable && data?.connectionStatus === "connected") || (data?.receivedCount > 0);

  return (
    <div className="page">
      {/* Top Nav */}
      <nav className="navbar">
        <div className="nav-brand">
          <span className="nav-icon">📡</span>
          <span>Azure IoT Hub Telemetry</span>
        </div>
        <div className={`nav-badge ${isConnected ? "badge-live" : "badge-off"}`}>
          <span className="blink-dot" />
          {isConnected ? "LIVE" : "OFFLINE"}
        </div>
      </nav>

      <div className="main-layout">
        {/* Left Sidebar */}
        <aside className="sidebar">
          <div className="profile-box">
            <div className="profile-avatar">EP</div>
            <div className="profile-name">{STUDENT_NAME}</div>
            <div className="profile-roll">{ROLL_NUMBER}</div>
            <div className="profile-dept">Dept. of Electronics &amp; Instrumentation</div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-title">ASSIGNMENT</div>
            <div className="sidebar-item">Azure IoT Hub Integration</div>
            <div className="sidebar-item">ASCII Telemetry Decoder</div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-title">STATS</div>
            <div className="stat-row">
              <span>Events</span>
              <span className="stat-val">{data?.receivedCount ?? 0}</span>
            </div>
            <div className="stat-row">
              <span>Azure</span>
              <span className={`stat-val ${isConnected ? "val-green" : "val-red"}`}>
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="stat-row">
              <span>Bytes</span>
              <span className="stat-val">{asciiValues.length}</span>
            </div>
          </div>

          {lastChecked && (
            <div className="sidebar-section">
              <div className="sidebar-title">LAST REFRESH</div>
              <div className="sidebar-item small">{lastChecked.toLocaleTimeString()}</div>
            </div>
          )}
        </aside>

        {/* Right Content */}
        <main className="content">
          {error && (
            <div className="error-bar">
              ⚠ Backend unreachable at <code>{API_BASE}</code>. Make sure the backend server is running.
            </div>
          )}

          {/* Row 1: ASCII and Decoded */}
          <div className="row-two">
            {/* ASCII Panel */}
            <div className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <span className="card-icon ascii-icon">10</span>
                  <div>
                    <div className="card-title">Received ASCII Values</div>
                    <div className="card-sub">Raw byte stream from Azure IoT Hub</div>
                  </div>
                </div>
                <span className="tag">RAW PAYLOAD</span>
              </div>
              <div className="ascii-grid">
                {asciiValues.length > 0 ? (
                  asciiValues.map((v, i) => (
                    <div key={i} className="byte-cell">
                      <div className="byte-val">{v}</div>
                      <div className="byte-char">{String.fromCharCode(v)}</div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">No ASCII data received yet. Waiting for IoT events...</div>
                )}
              </div>
            </div>

            {/* Converted String Panel */}
            <div className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <span className="card-icon str-icon">Aa</span>
                  <div>
                    <div className="card-title">Converted String</div>
                    <div className="card-sub">ASCII → UTF-8 decoded output</div>
                  </div>
                </div>
                <span className="tag tag-green">DECODED</span>
              </div>
              <div className="decode-box">
                <div className="decode-output">{convertedString}</div>
                <div className="decode-meta">
                  <span>{asciiValues.length} bytes</span>
                  <span>→</span>
                  <span>{convertedString.length} chars</span>
                </div>
              </div>
              <div className="formula-row">
                String.fromCharCode({asciiValues.slice(0, 4).join(", ")}{asciiValues.length > 4 ? ", ..." : ""})
              </div>
            </div>
          </div>

          {/* Row 2: Timestamp */}
          <div className="card ts-card">
            <div className="ts-grid">
              <div className="ts-item">
                <div className="ts-label">📅 LAST EVENT TIMESTAMP</div>
                <div className="ts-value">{formatDate(telemetry?.timestamp)}</div>
              </div>
              <div className="ts-item">
                <div className="ts-label">⚡ AUTO-REFRESH RATE</div>
                <div className="ts-value">Every 2.5 seconds</div>
              </div>
              <div className="ts-item">
                <div className="ts-label">🔌 CONNECTION STATUS</div>
                <div className={`ts-value ${isConnected ? "val-green" : "val-red"}`}>
                  {isConnected ? "Azure Event Hub — Connected" : "Disconnected"}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
