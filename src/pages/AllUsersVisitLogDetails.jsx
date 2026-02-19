import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { ThemeContext } from "../context/ThemeContext";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaFilter,
  FaDownload,
  FaTimes,
  FaSearch,
  FaMapMarkerAlt,
} from "react-icons/fa";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";
import BikramSambat from "bikram-sambat-js";

// ============ HELPER FUNCTIONS (Outside Component) ============

// Format date for display (e.g., "Feb 19, 2026")
const formatDateForDisplay = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

// Get display text for selected range (matches VisitLogReport.jsx)
const getDisplayText = (
  selectedDateRange,
  from,
  to,
  selectedNepaliYear,
  selectedNepaliMonth,
  NEPALI_MONTHS,
) => {
  try {
    switch (selectedDateRange) {
      case "Today":
        return `Today (${formatDateForDisplay(from)})`;
      case "Yesterday":
        return `Yesterday (${formatDateForDisplay(from)})`;
      case "This Week":
        return `This Week (${formatDateForDisplay(from)} - ${formatDateForDisplay(to)})`;
      case "Previous Week":
        return `Previous Week (${formatDateForDisplay(from)} - ${formatDateForDisplay(to)})`;
      case "Monthly":
        const monthName =
          NEPALI_MONTHS?.find((m) => m?.value === selectedNepaliMonth)?.label ||
          "Unknown";
        return `Monthly (${monthName} ${selectedNepaliYear} BS)`;
      case "Custom":
        return `Custom (${from} - ${to})`;
      default:
        return `${formatDateForDisplay(from)} - ${formatDateForDisplay(to)}`;
    }
  } catch (err) {
    console.error("getDisplayText error:", err);
    return `${from} - ${to}`; // Fallback
  }
};

// Get current Nepali year
const getCurrentBSYear = () => {
  const todayAD = new Date().toISOString().slice(0, 10);
  const todayBS = new BikramSambat(todayAD, "AD").toBS();
  return Number(todayBS.split("-")[0]);
};

// Generate BS years from 2082 to current year
const getBSYears = () => {
  const current = getCurrentBSYear();
  const years = [];
  for (let y = 2082; y <= current; y++) years.push(y);
  return years;
};

// ============ NEPALI DATE CONSTANTS (Outside Component) ============
const NEPALI_MONTHS = [
  { label: "Baishakh", value: 1 },
  { label: "Jestha", value: 2 },
  { label: "Ashadh", value: 3 },
  { label: "Shrawan", value: 4 },
  { label: "Bhadra", value: 5 },
  { label: "Ashwin", value: 6 },
  { label: "Kartik", value: 7 },
  { label: "Mangsir", value: 8 },
  { label: "Poush", value: 9 },
  { label: "Magh", value: 10 },
  { label: "Falgun", value: 11 },
  { label: "Chaitra", value: 12 },
];

const AllUsersVisitLogDetails = () => {
  const { theme } = useContext(ThemeContext);
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};
  const users = state.users || [];
  const [from, setFrom] = useState(
    state.from || new Date().toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(
    state.to || new Date().toISOString().slice(0, 10),
  );
  const [selectedNepaliYear, setSelectedNepaliYear] = useState(
    state.selectedNepaliYear || getCurrentBSYear(),
  );
  const [selectedNepaliMonth, setSelectedNepaliMonth] = useState(
    state.selectedNepaliMonth || getCurrentBSMonth() || 1,
  );
  const [allVisitLogs, setAllVisitLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 27.7172, lng: 85.324 });
  const [mapType, setMapType] = useState("roadmap");
  const [selectedDateRange, setSelectedDateRange] = useState(
    state.selectedDateRange || "Today",
  );

  const NEPALI_YEARS = getBSYears();

  // Load Google Maps JS API
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyDOq5UlrICMQ9rATXRmfMGXkXZPCJEoxgM",
  });

  const mapContainerStyle = {
    width: "100%",
    height: "500px",
    borderRadius: 12,
  };

  useEffect(() => {
    if (!from || !to || users.length === 0) {
      setError(
        "Missing date range or users. Please return to the report page.",
      );
      setLoading(false);
      return;
    }
    fetchAllVisitLogs();
  }, [from, to, users]);

  const fetchAllVisitLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const promises = users.map(async (user) => {
        try {
          const res = await api.get(
            `/visitLogs?visitLogId=${user._id}&from=${from}&to=${to}`,
          );
          const userLogs = res.data.visitLogs || [];
          return (userLogs.visitLogs || []).map((log) => ({
            ...log,
            username: user.username,
            userId: user._id,
            profileImage: user.profileImage,
          }));
        } catch (err) {
          console.error(`Failed to fetch logs for user ${user.username}:`, err);
          return [];
        }
      });

      const results = await Promise.all(promises);
      const allLogs = results.flat();
      allLogs.sort(
        (a, b) =>
          new Date(b.visitDate || b.mobileTime) -
          new Date(a.visitDate || a.mobileTime),
      );
      setAllVisitLogs(allLogs);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to fetch all visit logs",
      );
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    try {
      const res = await api.get(
        `/visitLogs/all-users/download?from=${from}&to=${to}`,
        { responseType: "blob" },
      );
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `all-users-visitlog-report-${from}-to-${to}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.log(err);
      alert("Failed to download report.");
    }
  };

  const handleApplyFilter = () => {
    const fromBS = `${selectedNepaliYear}-${String(
      selectedNepaliMonth,
    ).padStart(2, "0")}-01`;
    let nextMonth = selectedNepaliMonth + 1;
    let nextYear = selectedNepaliYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const firstOfNext = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
    const lastDayAD = new BikramSambat(firstOfNext, "BS").toAD();
    const lastDay = new Date(lastDayAD);
    lastDay.setDate(lastDay.getDate() - 1);
    const toBS = new BikramSambat(
      lastDay.toISOString().slice(0, 10),
      "AD",
    ).toBS();
    const fromAD = new BikramSambat(fromBS, "BS").toAD();
    const toAD = new BikramSambat(toBS, "BS").toAD();
    setFrom(fromAD);
    setTo(toAD);
    setShowFilter(false);
  };

  const handleRowClick = (log) => {
    let lat = 27.7172,
      lng = 85.324;
    if (log.latitude && log.longitude) {
      lat = parseFloat(log.latitude);
      lng = parseFloat(log.longitude);
    } else if (log.lat && log.lng) {
      lat = parseFloat(log.lat);
      lng = parseFloat(log.lng);
    } else if (log.location) {
      lat = parseFloat(log.location.latitude || log.location.lat);
      lng = parseFloat(log.location.longitude || log.location.lng);
    }
    setMapCenter({ lat, lng });
    setSelectedLog(log);
    setShowMapPopup(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const filteredLogs = allVisitLogs.filter((log) => {
    const matchesUserSearch = log.username
      .toLowerCase()
      .includes(userSearch.toLowerCase());
    const matchesPOCSearch =
      log.pocName?.toLowerCase().includes(search.toLowerCase()) ||
      log.pocAddress?.toLowerCase().includes(search.toLowerCase());
    return matchesUserSearch && matchesPOCSearch;
  });

  if (error) {
    return (
      <div
        style={{
          padding: 32,
          color: "#e53935",
          fontWeight: 600,
          fontSize: 18,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        background: theme === "dark" ? "#181c20" : "#f7faff",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: theme === "dark" ? "#a4c2f4" : "#1976d2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {users.length}
          </div>
          <div>
            <h2
              style={{
                fontWeight: 700,
                fontSize: 22,
                color: theme === "dark" ? "#fff" : "#23272b",
                margin: 0,
              }}
            >
              All Users Visit Log
            </h2>
            <p
              style={{
                margin: "4px 0 0 0",
                color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {getDisplayText(
                selectedDateRange,
                from,
                to,
                selectedNepaliYear,
                selectedNepaliMonth,
                NEPALI_MONTHS,
              )}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleDownload}
            style={{
              background: theme === "dark" ? "#23272b" : "#fff",
              border: "1.5px solid #a4c2f4",
              borderRadius: 8,
              padding: "8px 18px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 600,
              color: theme === "dark" ? "#a4c2f4" : "#1976d2",
              fontSize: 16,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(44,62,80,0.06)",
            }}
          >
            <FaDownload style={{ fontSize: 18 }} /> Download
          </button>
          <button
            onClick={() => setShowFilter(true)}
            style={{
              background: theme === "dark" ? "#23272b" : "#fff",
              border: "1.5px solid #a4c2f4",
              borderRadius: 8,
              padding: "8px 18px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 600,
              color: theme === "dark" ? "#a4c2f4" : "#1976d2",
              fontSize: 16,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(44,62,80,0.06)",
            }}
          >
            <FaFilter style={{ fontSize: 18 }} /> Filter
          </button>
        </div>
      </div>

      {/* Filter Popup */}
      {showFilter && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.18)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: theme === "dark" ? "#23272b" : "#fff",
              borderRadius: 18,
              boxShadow: "0 8px 32px rgba(44,62,80,0.18)",
              minWidth: 340,
              maxWidth: 400,
              width: "98vw",
              color: theme === "dark" ? "#fff" : "#23272b",
              position: "relative",
              padding: "2.2rem 1.7rem 1.5rem 1.7rem",
            }}
          >
            <button
              onClick={() => setShowFilter(false)}
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                background: "none",
                border: "none",
                fontSize: 22,
                color: "#888",
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              <FaTimes />
            </button>
            <div
              style={{
                fontWeight: 700,
                fontSize: 20,
                marginBottom: 18,
              }}
            >
              Filter Visit Logs
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
                marginBottom: 18,
              }}
            >
              <div>
                <label
                  style={{
                    fontWeight: 500,
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  Nepali Year (BS)
                </label>
                <select
                  value={selectedNepaliYear}
                  onChange={(e) =>
                    setSelectedNepaliYear(Number(e.target.value))
                  }
                  style={{
                    borderRadius: 8,
                    border: "1.5px solid #a4c2f4",
                    padding: "8px 14px",
                    background: theme === "dark" ? "#181c20" : "#f7faff",
                    color: theme === "dark" ? "#fff" : "#23272b",
                    width: "100%",
                  }}
                >
                  {NEPALI_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontWeight: 500,
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  Nepali Month (BS)
                </label>
                <select
                  value={selectedNepaliMonth}
                  onChange={(e) =>
                    setSelectedNepaliMonth(Number(e.target.value))
                  }
                  style={{
                    borderRadius: 8,
                    border: "1.5px solid #a4c2f4",
                    padding: "8px 14px",
                    background: theme === "dark" ? "#181c20" : "#f7faff",
                    color: theme === "dark" ? "#fff" : "#23272b",
                    width: "100%",
                  }}
                >
                  {NEPALI_MONTHS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                onClick={() => setShowFilter(false)}
                style={{
                  borderRadius: 8,
                  padding: "8px 22px",
                  fontSize: 16,
                  background: "#eee",
                  color: "#222",
                  border: "none",
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyFilter}
                style={{
                  borderRadius: 8,
                  padding: "8px 22px",
                  fontSize: 16,
                  background: theme === "dark" ? "#a4c2f4" : "#1976d2",
                  color: theme === "dark" ? "#23272b" : "#fff",
                  border: "none",
                  fontWeight: 600,
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div style={{ marginBottom: 18, display: "flex", gap: 12 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <FaSearch
            style={{
              color: theme === "dark" ? "#a4c2f4" : "#1976d2",
              fontSize: 16,
            }}
          />
          <input
            type="text"
            placeholder="Search by username..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            style={{
              borderRadius: 8,
              border: "1.5px solid #a4c2f4",
              padding: "8px 14px",
              background: theme === "dark" ? "#181c20" : "#f7faff",
              color: theme === "dark" ? "#fff" : "#23272b",
              width: "100%",
            }}
          />
        </div>
        <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 8 }}>
          <FaSearch
            style={{
              color: theme === "dark" ? "#a4c2f4" : "#1976d2",
              fontSize: 16,
            }}
          />
          <input
            type="text"
            placeholder="Search by POC name or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              borderRadius: 8,
              border: "1.5px solid #a4c2f4",
              padding: "8px 14px",
              background: theme === "dark" ? "#181c20" : "#f7faff",
              color: theme === "dark" ? "#fff" : "#23272b",
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Loading & Error */}
      {loading && (
        <div
          style={{
            marginTop: 60,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 200,
          }}
        >
          <div
            className="spinner"
            style={{
              width: 48,
              height: 48,
              border: `4px solid ${theme === "dark" ? "#a4c2f4" : "#1976d2"}`,
              borderTop: "4px solid transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: 18,
            }}
          />
          <div
            style={{
              color: theme === "dark" ? "#a4c2f4" : "#1976d2",
              fontSize: 18,
            }}
          >
            Loading...
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Visit Log Table */}
      {!loading && !error && (
        <div
          style={{
            background: theme === "dark" ? "#181c20" : "#fff",
            borderRadius: 18,
            boxShadow: "0 2px 12px rgba(44,62,80,0.08)",
            padding: 0,
            overflowX: "auto",
            marginTop: 18,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 18,
              margin: "18px 0 0 0",
              textAlign: "center",
              color: theme === "dark" ? "#fff" : "#23272b",
            }}
          >
            Total Visits: {filteredLogs.length}
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: 14,
              marginTop: 8,
              background: theme === "dark" ? "#181c20" : "#fff",
            }}
          >
            <thead>
              <tr
                style={{
                  background: theme === "dark" ? "#232b33" : "#e3eaf2",
                  color: theme === "dark" ? "#a4c2f4" : "#1a237e",
                  fontWeight: 700,
                }}
              >
                <th
                  style={{
                    padding: "8px 6px",
                    textAlign: "center",
                    borderRight: `1.5px solid ${
                      theme === "dark" ? "#313843" : "#cfd8dc"
                    }`,
                  }}
                >
                  SN
                </th>
                <th
                  style={{
                    padding: "8px 6px",
                    textAlign: "center",
                    borderRight: `1.5px solid ${
                      theme === "dark" ? "#313843" : "#cfd8dc"
                    }`,
                  }}
                >
                  Username
                </th>
                <th
                  style={{
                    padding: "8px 6px",
                    textAlign: "center",
                    borderRight: `1.5px solid ${
                      theme === "dark" ? "#313843" : "#cfd8dc"
                    }`,
                  }}
                >
                  POC Name
                </th>
                <th
                  style={{
                    textAlign: "center",
                    borderRight: `1.5px solid ${
                      theme === "dark" ? "#313843" : "#cfd8dc"
                    }`,
                  }}
                >
                  Type
                </th>
                <th
                  style={{
                    textAlign: "center",
                    borderRight: `1.5px solid ${
                      theme === "dark" ? "#313843" : "#cfd8dc"
                    }`,
                  }}
                >
                  Visit Count
                </th>
                <th
                  style={{
                    textAlign: "center",
                    borderRight: `1.5px solid ${
                      theme === "dark" ? "#313843" : "#cfd8dc"
                    }`,
                  }}
                >
                  Date
                </th>
                <th
                  style={{
                    textAlign: "center",
                    borderRight: `1.5px solid ${
                      theme === "dark" ? "#313843" : "#cfd8dc"
                    }`,
                  }}
                >
                  Category
                </th>
                <th
                  style={{
                    textAlign: "center",
                    borderRight: `1.5px solid ${
                      theme === "dark" ? "#313843" : "#cfd8dc"
                    }`,
                  }}
                >
                  Number
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderRight: `1.5px solid ${
                      theme === "dark" ? "#313843" : "#cfd8dc"
                    }`,
                  }}
                >
                  Address
                </th>
                <th
                  style={{
                    textAlign: "center",
                    borderRight: `1.5px solid ${
                      theme === "dark" ? "#313843" : "#cfd8dc"
                    }`,
                  }}
                >
                  Remarks
                </th>
                <th style={{ textAlign: "center" }}>Location</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, i) => (
                  <tr
                    key={log.logId || `${log.userId}-${i}`}
                    onClick={() => handleRowClick(log)}
                    style={{
                      borderBottom: `1px solid ${
                        theme === "dark" ? "#232b33" : "#e3eaf2"
                      }`,
                      background:
                        theme === "dark"
                          ? i % 2 === 0
                            ? "#232b33"
                            : "#181c20"
                          : i % 2 === 0
                            ? "#f7faff"
                            : "#e3eaf2",
                      color: theme === "dark" ? "#fff" : "#23272b",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        theme === "dark" ? "#2d3540" : "#eaf2ff";
                      e.currentTarget.style.transform = "scale(1.002)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        theme === "dark"
                          ? i % 2 === 0
                            ? "#232b33"
                            : "#181c20"
                          : i % 2 === 0
                            ? "#f7faff"
                            : "#e3eaf2";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <td
                      style={{
                        textAlign: "center",
                        fontWeight: 600,
                        borderRight: `1.5px solid ${
                          theme === "dark" ? "#313843" : "#cfd8dc"
                        }`,
                      }}
                    >
                      {i + 1}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        fontWeight: 600,
                        borderRight: `1.5px solid ${
                          theme === "dark" ? "#313843" : "#cfd8dc"
                        }`,
                        color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                      }}
                    >
                      {log.username}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        fontWeight: 600,
                        borderRight: `1.5px solid ${
                          theme === "dark" ? "#313843" : "#cfd8dc"
                        }`,
                      }}
                    >
                      {log.pocName}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        borderRight: `1.5px solid ${
                          theme === "dark" ? "#313843" : "#cfd8dc"
                        }`,
                      }}
                    >
                      {log.visitType}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        borderRight: `1.5px solid ${
                          theme === "dark" ? "#313843" : "#cfd8dc"
                        }`,
                      }}
                    >
                      {log.pocVisitCounter}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        borderRight: `1.5px solid ${
                          theme === "dark" ? "#313843" : "#cfd8dc"
                        }`,
                      }}
                    >
                      {formatDate(log.visitDate || log.mobileTime)}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        borderRight: `1.5px solid ${
                          theme === "dark" ? "#313843" : "#cfd8dc"
                        }`,
                      }}
                    >
                      {log.pocCategory || "N/A"}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        borderRight: `1.5px solid ${
                          theme === "dark" ? "#313843" : "#cfd8dc"
                        }`,
                      }}
                    >
                      {log.pocNumber || "N/A"}
                    </td>
                    <td
                      style={{
                        textAlign: "left",
                        borderRight: `1.5px solid ${
                          theme === "dark" ? "#313843" : "#cfd8dc"
                        }`,
                      }}
                    >
                      {log.pocAddress}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        borderRight: `1.5px solid ${
                          theme === "dark" ? "#313843" : "#cfd8dc"
                        }`,
                      }}
                    >
                      {log.remarks}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <FaMapMarkerAlt
                        style={{
                          color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                          fontSize: 18,
                          cursor: "pointer",
                        }}
                        title="View on Map"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={11}
                    style={{
                      textAlign: "center",
                      color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                      padding: 18,
                    }}
                  >
                    No visit logs found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Google Maps Popup Modal */}
      {showMapPopup && selectedLog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: theme === "dark" ? "#23272b" : "#fff",
              borderRadius: 18,
              boxShadow: "0 8px 32px rgba(44,62,80,0.25)",
              width: "90vw",
              maxWidth: 800,
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px 16px 24px",
                borderBottom: `1px solid ${
                  theme === "dark" ? "#313843" : "#e0e0e0"
                }`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    color: theme === "dark" ? "#fff" : "#23272b",
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  Visit Location Details
                </h3>
                <p
                  style={{
                    margin: "4px 0 0 0",
                    color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                    fontSize: 14,
                  }}
                >
                  {selectedLog.username} - {selectedLog.pocName}
                </p>
              </div>
              <button
                onClick={() => setShowMapPopup(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  color: theme === "dark" ? "#888" : "#666",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "50%",
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.background =
                    theme === "dark" ? "#313843" : "#f0f0f0")
                }
                onMouseLeave={(e) =>
                  (e.target.style.background = "transparent")
                }
              >
                <FaTimes />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: "20px 24px", flex: 1, overflow: "auto" }}>
              {/* Visit Details */}
              <div
                style={{
                  marginBottom: 20,
                  padding: "16px",
                  background: theme === "dark" ? "#181c20" : "#f8f9fa",
                  borderRadius: 12,
                  border: `1px solid ${
                    theme === "dark" ? "#313843" : "#e0e0e0"
                  }`,
                }}
              >
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  Visit Information
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "16px",
                    fontSize: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <strong
                      style={{
                        color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Username
                    </strong>
                    <span
                      style={{
                        color: theme === "dark" ? "#fff" : "#23272b",
                        fontSize: 15,
                        fontWeight: 500,
                      }}
                    >
                      {selectedLog.username}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <strong
                      style={{
                        color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      POC Name
                    </strong>
                    <span
                      style={{
                        color: theme === "dark" ? "#fff" : "#23272b",
                        fontSize: 15,
                        fontWeight: 500,
                      }}
                    >
                      {selectedLog.pocName}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <strong
                      style={{
                        color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Visit Type
                    </strong>
                    <span
                      style={{
                        color: theme === "dark" ? "#fff" : "#23272b",
                        fontSize: 15,
                        fontWeight: 500,
                      }}
                    >
                      {selectedLog.visitType}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <strong
                      style={{
                        color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Mobile Time
                    </strong>
                    <span
                      style={{
                        color: theme === "dark" ? "#fff" : "#23272b",
                        fontSize: 15,
                        fontWeight: 500,
                      }}
                    >
                      {selectedLog.mobileTime || "N/A"}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <strong
                      style={{
                        color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Category
                    </strong>
                    <span
                      style={{
                        color: theme === "dark" ? "#fff" : "#23272b",
                        fontSize: 15,
                        fontWeight: 500,
                      }}
                    >
                      {selectedLog.pocCategory || "N/A"}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <strong
                      style={{
                        color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Number
                    </strong>
                    <span
                      style={{
                        color: theme === "dark" ? "#fff" : "#23272b",
                        fontSize: 15,
                        fontWeight: 500,
                      }}
                    >
                      {selectedLog.pocNumber || "N/A"}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <strong
                    style={{
                      color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Address
                  </strong>
                  <span
                    style={{
                      color: theme === "dark" ? "#fff" : "#23272b",
                      fontSize: 15,
                      fontWeight: 500,
                    }}
                  >
                    {selectedLog.pocAddress}
                  </span>
                </div>
                {selectedLog.remarks && (
                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <strong
                      style={{
                        color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Remarks
                    </strong>
                    <span
                      style={{
                        color: theme === "dark" ? "#fff" : "#23272b",
                        fontSize: 15,
                        fontWeight: 500,
                      }}
                    >
                      {selectedLog.remarks}
                    </span>
                  </div>
                )}
              </div>

              {/* Google Map */}
              <div
                style={{
                  marginBottom: 20,
                  border: `1px solid ${
                    theme === "dark" ? "#313843" : "#e0e0e0"
                  }`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    background: theme === "dark" ? "#181c20" : "#f8f9fa",
                    borderBottom: `1px solid ${
                      theme === "dark" ? "#313843" : "#e0e0e0"
                    }`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                      fontSize: 16,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <FaMapMarkerAlt />
                    Location on Map
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <label
                      style={{
                        fontSize: 12,
                        color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                        fontWeight: 500,
                      }}
                    >
                      Map Type:
                    </label>
                    <select
                      value={mapType}
                      onChange={(e) => setMapType(e.target.value)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: `1px solid ${
                          theme === "dark" ? "#313843" : "#e0e0e0"
                        }`,
                        background: theme === "dark" ? "#23272b" : "#fff",
                        color: theme === "dark" ? "#fff" : "#23272b",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      <option value="roadmap">Default</option>
                      <option value="satellite">Satellite</option>
                      <option value="terrain">Terrain</option>
                    </select>
                  </div>
                </div>
                <div style={{ padding: "16px" }}>
                  {isLoaded ? (
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={mapCenter}
                      zoom={15}
                      mapTypeId={mapType}
                      options={{
                        styles:
                          theme === "dark"
                            ? [
                                {
                                  elementType: "geometry",
                                  stylers: [{ color: "#242f3e" }],
                                },
                                {
                                  elementType: "labels.text.stroke",
                                  stylers: [{ color: "#242f3e" }],
                                },
                                {
                                  elementType: "labels.text.fill",
                                  stylers: [{ color: "#746855" }],
                                },
                              ]
                            : [],
                        disableDefaultUI: true,
                        zoomControl: false,
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                      }}
                    >
                      <Marker
                        position={mapCenter}
                        icon={{
                          url:
                            "data:image/svg+xml;charset=UTF-8," +
                            encodeURIComponent(`
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M16 0C10.477 0 6 4.477 6 10c0 7 10 22 10 22s10-15 10-22c0-5.523-4.477-10-10-10zm0 16c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z" fill="#e74c3c"/>
                            </svg>
                          `),
                          scaledSize: { width: 32, height: 32 },
                          anchor: { x: 16, y: 32 },
                        }}
                      />
                    </GoogleMap>
                  ) : (
                    <div
                      style={{
                        height: 500,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: theme === "dark" ? "#181c20" : "#f8f9fa",
                        color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                        fontSize: 16,
                      }}
                    >
                      Loading map...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: `1px solid ${
                  theme === "dark" ? "#313843" : "#e0e0e0"
                }`,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowMapPopup(false)}
                style={{
                  background: theme === "dark" ? "#a4c2f4" : "#1976d2",
                  color: theme === "dark" ? "#23272b" : "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.background =
                    theme === "dark" ? "#8ba8d4" : "#1565c0")
                }
                onMouseLeave={(e) =>
                  (e.target.style.background =
                    theme === "dark" ? "#a4c2f4" : "#1976d2")
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllUsersVisitLogDetails;
