import { useEffect, useState } from "react";

// Helper functions to format event data
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

  // Read API URL from env variable
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const fetchEvents = () => {
    fetch(`${API_URL}/latest-events`)
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch(() => setEvents([]));
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={styles.bg}>
      <div style={styles.container}>
        <h1 style={styles.heading}>GitHub Events Feed</h1>
        {events.length === 0 ? (
          <div style={styles.empty}>No events found.</div>
        ) : (
          <div>
            {events.map((event) => (
              <div key={event._id} style={styles.card} className="event-card">
                {formatEvent(event)}
              </div>
            ))}
          </div>
        )}
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
    background: "linear-gradient(120deg, #f8fafc 0%, #e3f2fd 100%)",
    padding: "0",
    margin: "0",
  },
  container: {
    maxWidth: 600,
    margin: "40px auto",
    padding: "32px 24px",
    background: "#fff",
    borderRadius: "20px",
    boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
    fontFamily: "system-ui, sans-serif",
  },
  heading: {
    textAlign: "center",
    fontWeight: 800,
    fontSize: "2.2rem",
    marginBottom: "30px",
    color: "#1976d2",
    letterSpacing: "-1px",
  },
  card: {
    background: "#f4f8fb",
    borderRadius: "12px",
    marginBottom: "18px",
    padding: "18px 16px",
    boxShadow: "0 2px 8px rgba(25, 118, 210, 0.07)",
    fontSize: "1.09rem",
    lineHeight: 1.7,
    transition: "box-shadow 0.2s",
    borderLeft: "4px solid #1976d2",
  },
  empty: {
    textAlign: "center",
    color: "#888",
    fontSize: "1.1rem",
    marginTop: "40px",
  },
};
