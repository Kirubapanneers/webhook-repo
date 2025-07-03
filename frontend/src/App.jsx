import { useEffect, useState } from "react";

// Helper functions
function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const day = date.getUTCDate();
  const month = date.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const year = date.getUTCFullYear();
  let hours = date.getUTCHours();
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day}${getDaySuffix(day)} ${month} ${year} - ${hours}:${minutes} ${ampm} UTC`;
}
function getDaySuffix(day) {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}
function formatEvent(event) {
  if (event.action === "push") {
    return (
      <span>
        <span className="author">{event.author}</span> <span className="action">pushed</span> to <span className="branch">{event.to_branch}</span> on <span className="timestamp">{formatTimestamp(event.timestamp)}</span>
      </span>
    );
  } else if (event.action === "pull_request") {
    return (
      <span>
        <span className="author">{event.author}</span> <span className="action">submitted a pull request</span> from <span className="branch">{event.from_branch}</span> to <span className="branch">{event.to_branch}</span> on <span className="timestamp">{formatTimestamp(event.timestamp)}</span>
      </span>
    );
  } else if (event.action === "merge") {
    return (
      <span>
        <span className="author">{event.author}</span> <span className="action">merged branch</span> <span className="branch">{event.from_branch}</span> to <span className="branch">{event.to_branch}</span> on <span className="timestamp">{formatTimestamp(event.timestamp)}</span>
      </span>
    );
  } else {
    return <span>Unknown event</span>;
  }
}

export default function App() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("checking");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Fetch events and update status
  const fetchEvents = async (manual = false) => {
    setLoading(!manual);
    setError("");
    try {
      const res = await fetch(`${API_URL}/latest-events`);
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      setEvents(data);
      setStatus("live");
      setLastUpdated(new Date());
    } catch (err) {
      setStatus("offline");
      setError("Could not fetch events. Backend may be offline.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(() => fetchEvents(), 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, []);

  return (
    <div style={styles.bg}>
      <div style={styles.centerWrapper}>
        <div style={styles.container}>
          <div style={styles.headerRow}>
            <h1 style={styles.heading}>GitHub Webhook Live Tracker</h1>
            <span style={{ ...styles.status, background: status === "live" ? "#4caf50" : "#e53935" }}>
              {status === "live" ? "● Live" : status === "offline" ? "● Offline" : "● Checking..."}
            </span>
          </div>
          <div style={styles.subHeaderRow}>
            <span style={styles.lastUpdated}>
              {lastUpdated ? `Last updated: ${formatTimestamp(lastUpdated)}` : ""}
            </span>
            <button style={styles.refreshBtn} onClick={() => fetchEvents(true)} disabled={loading}>
              {loading ? "Loading..." : "⟳ Refresh"}
            </button>
          </div>
          {error && <div style={styles.error}>{error}</div>}
          {events.length === 0 && !loading && !error ? (
            <div style={styles.empty}>No events found.</div>
          ) : (
            <div style={styles.cardsWrapper}>
              {events.map((event) => (
                <div key={event._id} style={styles.card} className="event-card">
                  {formatEvent(event)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>
        {`
        .event-card {
          animation: fadeIn 0.6s;
        }
        .author {
          color: #0070f3;
          font-weight: 600;
        }
        .action {
          color: #222;
          font-weight: 500;
        }
        .branch {
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 6px;
          padding: 2px 8px;
          margin: 0 2px;
          font-weight: 500;
          font-size: 0.96em;
        }
        .timestamp {
          color: #666;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px);}
          to { opacity: 1; transform: translateY(0);}
        }
        `}
      </style>
    </div>
  );
}

const styles = {
  bg: {
    minHeight: "100vh",
    minWidth: "100vw",
    background: "linear-gradient(120deg, #b2dfdb 0%, #e3f2fd 100%)",
    padding: "0",
    margin: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  centerWrapper: {
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    maxWidth: 650,
    width: "100%",
    margin: "40px auto",
    padding: "36px 30px",
    background: "#fff",
    borderRadius: "22px",
    boxShadow: "0 8px 40px rgba(25, 118, 210, 0.13)",
    fontFamily: "system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  subHeaderRow: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  heading: {
    fontWeight: 800,
    fontSize: "2.1rem",
    color: "#1976d2",
    letterSpacing: "-1px",
    margin: 0,
  },
  status: {
    color: "#fff",
    fontWeight: 700,
    padding: "6px 16px",
    borderRadius: "12px",
    fontSize: "1.05rem",
    marginLeft: 18,
    minWidth: 80,
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(25, 118, 210, 0.10)",
  },
  lastUpdated: {
    color: "#666",
    fontSize: "0.99rem",
    fontWeight: 400,
    marginLeft: 2,
  },
  refreshBtn: {
    background: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "7px 18px",
    fontWeight: 600,
    fontSize: "1.01rem",
    cursor: "pointer",
    marginLeft: 12,
    transition: "background 0.2s",
  },
  cardsWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
  },
  card: {
    background: "#b3e5fc",
    borderRadius: "12px",
    marginBottom: "18px",
    padding: "18px 16px",
    boxShadow: "0 2px 12px rgba(25, 118, 210, 0.10)",
    fontSize: "1.09rem",
    lineHeight: 1.7,
    transition: "box-shadow 0.2s",
    borderLeft: "6px solid #1976d2",
    width: "100%",
    maxWidth: "480px",
    textAlign: "center",
  },
  empty: {
    textAlign: "center",
    color: "#888",
    fontSize: "1.1rem",
    marginTop: "40px",
  },
  error: {
    color: "#e53935",
    background: "#ffebee",
    borderRadius: "8px",
    padding: "10px 18px",
    marginBottom: "20px",
    fontWeight: 500,
    textAlign: "center",
    width: "100%",
    maxWidth: "420px",
  },
};
