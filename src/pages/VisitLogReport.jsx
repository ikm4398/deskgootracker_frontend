import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { ThemeContext } from "../context/ThemeContext";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaFilter,
  FaDownload,
  FaTimes,
  FaSearch,
  FaCalendar,
  FaCheck,
  FaTimes as FaTimesIcon,
  FaList,
} from "react-icons/fa";
import BikramSambat from "bikram-sambat-js";
// You can use a chart library like recharts or chart.js if available, else fallback to modern cards and table

const CARD_COLORS = [
  ["#32b8f4", "#e3eaf2"],
  ["#f4bfa4", "#fbeee6"],
  ["#a4f4c2", "#e6fbf0"],
];

// Nepali date constants
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

// Get current Nepali year
const getCurrentBSYear = () => {
  const todayAD = new Date().toISOString().slice(0, 10);
  const todayBS = new BikramSambat(todayAD, "AD").toBS();
  return Number(todayBS.split("-")[0]);
};

// Get current Nepali month
const getCurrentBSMonth = () => {
  const todayAD = new Date().toISOString().slice(0, 10);
  const todayBS = new BikramSambat(todayAD, "AD").toBS();
  return Number(todayBS.split("-")[1]);
};

// Generate BS years from 2082 to current year
const getBSYears = () => {
  const current = getCurrentBSYear();
  const years = [];
  for (let y = 2082; y <= current; y++) years.push(y);
  return years;
};

const NEPALI_YEARS = getBSYears();

const VisitLogReport = () => {
  const { theme } = useContext(ThemeContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [userModal, setUserModal] = useState({ open: false, user: null });
  const [userLogLoading, setUserLogLoading] = useState(false);
  const [userLogData, setUserLogData] = useState(null);
  const [userLogError, setUserLogError] = useState("");
  const [selectedNepaliYear, setSelectedNepaliYear] =
    useState(getCurrentBSYear());
  const [selectedNepaliMonth, setSelectedNepaliMonth] =
    useState(getCurrentBSMonth());
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearch, setUserSearch] = useState("");

  // Date range dropdown state
  const [selectedDateRange, setSelectedDateRange] = useState("Today");
  const [showMonthlyPopup, setShowMonthlyPopup] = useState(false);
  const [showCustomPopup, setShowCustomPopup] = useState(false);
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [monthlyYear, setMonthlyYear] = useState(getCurrentBSYear());
  const [monthlyMonth, setMonthlyMonth] = useState(getCurrentBSMonth());

  // Read from/to from query params or default to today
  const getDateParam = (key) => {
    const params = new URLSearchParams(location.search);
    return params.get(key) || new Date().toISOString().slice(0, 10);
  };
  const [from, setFrom] = useState(getDateParam("from"));
  const [to, setTo] = useState(getDateParam("to"));
  // Ensure these are defined after from and to:
  const [userLogFrom, setUserLogFrom] = useState(from);
  const [userLogTo, setUserLogTo] = useState(to);

  const getDateRange = (option) => {
    const today = new Date();
    let from, to;
    switch (option) {
      case "Today":
        from = to = today.toISOString().slice(0, 10);
        break;
      case "Yesterday":
        (() => {
          const yest = new Date(today);
          yest.setDate(today.getDate() - 1);
          from = to = yest.toISOString().slice(0, 10);
        })();
        break;
      case "This Week":
        (() => {
          const day = today.getDay(); // 0 (Sun) - 6 (Sat)
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - day);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          from = weekStart.toISOString().slice(0, 10);
          to = weekEnd.toISOString().slice(0, 10);
        })();
        break;
      case "Previous Week":
        (() => {
          const day = today.getDay();
          const lastWeekEnd = new Date(today);
          lastWeekEnd.setDate(today.getDate() - day - 1);
          const lastWeekStart = new Date(lastWeekEnd);
          lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
          from = lastWeekStart.toISOString().slice(0, 10);
          to = lastWeekEnd.toISOString().slice(0, 10);
        })();
        break;
      case "Monthly":
        // This will be handled by the monthly popup
        return null;
      case "Custom":
        // This will be handled by the custom popup
        return null;
      default:
        // Keep existing values
        break;
    }
    return { from, to };
  };

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    // Always show popup for Monthly and Custom, regardless of previous selection
    if (range === "Monthly") {
      setSelectedDateRange(range);
      setShowMonthlyPopup(true);
      return;
    }

    if (range === "Custom") {
      setSelectedDateRange(range);
      setShowCustomPopup(true);
      return;
    }

    // For other options, only update if different
    if (selectedDateRange !== range) {
      setSelectedDateRange(range);
      const dateRange = getDateRange(range);
      if (dateRange) {
        setFrom(dateRange.from);
        setTo(dateRange.to);
      }
    }
  };

  // Handle monthly popup apply
  const handleMonthlyApply = () => {
    // Convert Nepali year and month to AD dates
    const fromBS = `${monthlyYear}-${String(monthlyMonth).padStart(2, "0")}-01`;
    let nextMonth = monthlyMonth + 1;
    let nextYear = monthlyYear;
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

    // Convert BS to AD for API
    const fromAD = new BikramSambat(fromBS, "BS").toAD();
    const toAD = new BikramSambat(toBS, "BS").toAD();

    setFrom(fromAD);
    setTo(toAD);
    setShowMonthlyPopup(false);
  };

  // Handle custom popup apply
  const handleCustomApply = () => {
    if (!customFromDate || !customToDate) {
      alert("Please select both from and to dates");
      return;
    }

    // Convert BS to AD
    const fromAD = new BikramSambat(customFromDate, "BS").toAD();
    const toAD = new BikramSambat(customToDate, "BS").toAD();

    setFrom(fromAD);
    setTo(toAD);
    setShowCustomPopup(false);
  };

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get display text for selected range
  const getDisplayText = () => {
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
        return `Monthly (${NEPALI_MONTHS.find((m) => m.value === monthlyMonth)?.label} ${monthlyYear} BS)`;
      case "Custom":
        return `Custom (${customFromDate} - ${customToDate} BS)`;
      default:
        return `${formatDateForDisplay(from)} - ${formatDateForDisplay(to)}`;
    }
  };

  // Fetch users for filter
  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      // Handle different response structures
      const usersData = res.data?.users || res.data || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
    }
  };

  // Update URL when filter is applied
  const applyFilter = () => {
    if (!selectedUser) {
      alert("Please select a user first.");
      return;
    }

    // Convert Nepali year and month to AD dates
    const fromBS = `${selectedNepaliYear}-${String(selectedNepaliMonth).padStart(2, "0")}-01`;
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

    // Convert BS to AD for API
    const fromAD = new BikramSambat(fromBS, "BS").toAD();
    const toAD = new BikramSambat(toBS, "BS").toAD();

    setShowFilter(false);
    navigate("/visitlog-report/user", {
      state: {
        userId: selectedUser._id,
        from: fromAD,
        to: toAD,
        users: users,
        selectedUser: selectedUser,
        selectedNepaliYear: selectedNepaliYear,
        selectedNepaliMonth: selectedNepaliMonth,
      },
    });
  };

  // Download CSV
  const handleDownload = async () => {
    try {
      const res = await api.get(
        `/visitLogs/all/export-average?from=${from}&to=${to}`,
        { responseType: "blob" },
      );
      console.log(res);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      // The server will send a proper filename, but fallback just in case
      link.setAttribute("download", `visit-log-report-${from}-to-${to}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert("Failed to download report.");
    }
  };

  // Open modal on user row click
  const handleUserRowClick = (user) => {
    setUserModal({ open: true, user });
    setUserLogFrom(from);
    setUserLogTo(to);
    setUserLogData(null);
    setUserLogError("");
    setUserLogLoading(false);
  };

  // Fetch users when filter is opened
  useEffect(() => {
    if (showFilter && users.length === 0) {
      fetchUsers();
    }
  }, [showFilter, users.length]);

  // Initialize date range on component mount
  useEffect(() => {
    const dateRange = getDateRange(selectedDateRange);
    if (dateRange) {
      setFrom(dateRange.from);
      setTo(dateRange.to);
    }
  }, [selectedDateRange]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/visitLogs/all?from=${from}&to=${to}`);
        setData(res.data);
      } catch (error) {
        setError(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to fetch visit logs",
        );
      }
      setLoading(false);
    };
    fetchData();
  }, [from, to]);

  return (
    <div
      style={{
        padding: 24,
        background: theme === "dark" ? "#181c20" : "#f7faff",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <select
              value={selectedDateRange}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              style={{
                background: theme === "dark" ? "#23272b" : "#fff",
                border: "2px solid #32b8f4",
                borderRadius: 12,
                padding: "12px 20px",
                fontSize: 18,
                fontWeight: 600,
                color: theme === "dark" ? "#fff" : "#23272b",
                cursor: "pointer",
                minWidth: 200,
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2332b8f4' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 12px center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "16px",
              }}
            >
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="Previous Week">Previous Week</option>
              <option value="Monthly">Monthly</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          <div
            onClick={() => {
              if (selectedDateRange === "Monthly") {
                setShowMonthlyPopup(true);
              } else if (selectedDateRange === "Custom") {
                setShowCustomPopup(true);
              }
            }}
            style={{
              background: theme === "dark" ? "#2d3540" : "#eaf2ff",
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #32b8f4",
              color: theme === "dark" ? "#32b8f4" : "#1976d2",
              fontWeight: 600,
              fontSize: 14,
              cursor:
                selectedDateRange === "Monthly" ||
                selectedDateRange === "Custom"
                  ? "pointer"
                  : "default",
              transition: "all 0.2s ease-in-out",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              if (
                selectedDateRange === "Monthly" ||
                selectedDateRange === "Custom"
              ) {
                e.target.style.borderColor =
                  theme === "dark" ? "#a4c2f4" : "#1565c0";
                e.target.style.background =
                  theme === "dark" ? "#3d4550" : "#e3f2fd";
              }
            }}
            onMouseLeave={(e) => {
              if (
                selectedDateRange === "Monthly" ||
                selectedDateRange === "Custom"
              ) {
                e.target.style.borderColor = "#32b8f4";
                e.target.style.background =
                  theme === "dark" ? "#2d3540" : "#eaf2ff";
              }
            }}
          >
            {getDisplayText()}
          </div>

          <button
            onClick={() => {
              navigate("/visitlog-report/all-users", {
                state: {
                  from,
                  to,
                  users: data.users || [],
                  // ✅ KEY FIX: Use monthlyYear/monthlyMonth for "Monthly", otherwise use selectedNepaliYear/Month
                  selectedNepaliYear:
                    selectedDateRange === "Monthly"
                      ? monthlyYear
                      : selectedNepaliYear,
                  selectedNepaliMonth:
                    selectedDateRange === "Monthly"
                      ? monthlyMonth
                      : selectedNepaliMonth,
                  selectedDateRange,
                },
              });
            }}
            style={{
              background: theme === "dark" ? "#23272b" : "#fff",
              border: "1.5px solid #a4f4c2",
              borderRadius: 8,
              padding: "8px 18px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 600,
              color: theme === "dark" ? "#a4f4c2" : "#388e3c",
              fontSize: 16,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(44,62,80,0.06)",
            }}
          >
            <FaList />
            All Users Log
          </button>
        </div>
        {/* Replace the existing button section with this */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleDownload}
            style={{
              background: theme === "dark" ? "#23272b" : "#fff",
              border: "1.5px solid #32b8f4",
              borderRadius: 8,
              padding: "8px 18px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 600,
              color: theme === "dark" ? "#32b8f4" : "#32b8f4",
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
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: theme === "dark" ? "#23272b" : "#fff",
              borderRadius: 16,
              boxShadow: "0 4px 24px rgba(44,62,80,0.18)",
              padding: "2.2rem 1.7rem 1.5rem 1.7rem",
              minWidth: 320,
              maxWidth: "98vw",
              color: theme === "dark" ? "#fff" : "#23272b",
              position: "relative",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18 }}>
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
                  style={{ fontWeight: 500, marginBottom: 6, display: "block" }}
                >
                  Select User
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <FaSearch
                    style={{
                      color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                      fontSize: 16,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search user..."
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
                <div
                  style={{
                    maxHeight: 160,
                    overflowY: "auto",
                    border: "1.5px solid #e0e0e0",
                    borderRadius: 8,
                    background: theme === "dark" ? "#181c20" : "#f7faff",
                  }}
                >
                  {Array.isArray(users) &&
                    users
                      .filter(
                        (u) =>
                          u &&
                          u.username &&
                          u.username
                            .toLowerCase()
                            .includes(userSearch.toLowerCase()),
                      )
                      .map((u) => (
                        <div
                          key={u._id}
                          onClick={() => setSelectedUser(u)}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            background:
                              selectedUser?._id === u._id
                                ? theme === "dark"
                                  ? "#2d3540"
                                  : "#eaf2ff"
                                : "transparent",
                            color:
                              selectedUser?._id === u._id
                                ? theme === "dark"
                                  ? "#a4c2f4"
                                  : "#1976d2"
                                : undefined,
                            fontWeight: selectedUser?._id === u._id ? 700 : 500,
                            borderRadius: 6,
                            marginBottom: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <img
                            src={u.profileImage}
                            alt={u.username}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: "1px solid #e0e0e0",
                            }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&size=24&background=random`;
                            }}
                          />
                          {u.username}
                        </div>
                      ))}
                </div>
              </div>
              <div>
                <label
                  style={{ fontWeight: 500, marginBottom: 6, display: "block" }}
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
                  style={{ fontWeight: 500, marginBottom: 6, display: "block" }}
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
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
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
                onClick={applyFilter}
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
      {/* Top Cards */}
      {data && (
        <div
          className="visitlog-cards-row"
          style={{
            display: "flex",
            gap: 24,
            marginBottom: 32,
            flexWrap: "wrap",
          }}
        >
          <div
            className="visitlog-card"
            style={{
              flex: 1,
              minWidth: 220,
              background: theme === "dark" ? "#202a36" : CARD_COLORS[0][1],
              borderRadius: 16,
              boxShadow: "0 2px 12px rgba(44,62,80,0.08)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transition:
                "transform 0.25s cubic-bezier(.4,2,.6,1), box-shadow 0.25s, background 0.18s, color 0.18s",
              color: theme === "dark" ? "#e3eaf2" : "#1a237e",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: theme === "dark" ? "#a4c2f4" : "#3b5998",
                marginBottom: 8,
              }}
            >
              Visits
            </div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>
              {data?.totalVisits ?? 0}
            </div>
            <div
              style={{
                fontSize: 15,
                color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                marginTop: 4,
              }}
            >
              Total Visits
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>
              {data?.totalAverageVisits?.toFixed(2) ?? 0}{" "}
              <span style={{ fontWeight: 400, fontSize: 14 }}>Total Avg</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>
              {data?.averageVisit?.toFixed(2) ?? 0}{" "}
              <span style={{ fontWeight: 400, fontSize: 14 }}>Avg</span>
            </div>
          </div>
          <div
            className="visitlog-card"
            style={{
              flex: 1,
              minWidth: 220,
              background: theme === "dark" ? "#2a2320" : CARD_COLORS[1][1],
              borderRadius: 16,
              boxShadow: "0 2px 12px rgba(44,62,80,0.08)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transition:
                "transform 0.25s cubic-bezier(.4,2,.6,1), box-shadow 0.25s, background 0.18s, color 0.18s",
              color: theme === "dark" ? "#ffe0c2" : "#7b3f00",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: theme === "dark" ? "#f4bfa4" : "#d2691e",
                marginBottom: 8,
              }}
            >
              New Visits
            </div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>
              {data?.totalNewVisit ?? 0}
            </div>
            <div
              style={{
                fontSize: 15,
                color: theme === "dark" ? "#f4bfa4" : "#d2691e",
                marginTop: 4,
              }}
            >
              Total New
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>
              {data?.averageNewVisit?.toFixed(2) ?? 0}{" "}
              <span style={{ fontWeight: 400, fontSize: 14 }}>Avg</span>
            </div>
          </div>
          <div
            className="visitlog-card"
            style={{
              flex: 1,
              minWidth: 220,
              background: theme === "dark" ? "#1e2623" : CARD_COLORS[2][1],
              borderRadius: 16,
              boxShadow: "0 2px 12px rgba(44,62,80,0.08)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transition:
                "transform 0.25s cubic-bezier(.4,2,.6,1), box-shadow 0.25s, background 0.18s, color 0.18s",
              color: theme === "dark" ? "#d2fbe6" : "#14532d",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: theme === "dark" ? "#a4f4c2" : "#388e3c",
                marginBottom: 8,
              }}
            >
              Follow Up Visits
            </div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>
              {data?.totalFollowUpVisit ?? 0}
            </div>
            <div
              style={{
                fontSize: 15,
                color: theme === "dark" ? "#a4f4c2" : "#388e3c",
                marginTop: 4,
              }}
            >
              Total Follow Up
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>
              {data?.averageFollowUpVisit?.toFixed(2) ?? 0}{" "}
              <span style={{ fontWeight: 400, fontSize: 14 }}>Avg</span>
            </div>
          </div>
        </div>
      )}
      {/* User Table */}
      {data && (
        <div
          style={{
            background: theme === "dark" ? "#23272b" : "#fafdff",
            borderRadius: 18,
            boxShadow: "0 2px 12px rgba(44,62,80,0.08)",
            padding: 0,
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: 16,
              minWidth: 600,
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
                <th style={{ padding: "16px 8px", borderTopLeftRadius: 18 }}>
                  User
                </th>
                <th>Total Visits</th>
                <th>Avg Visit</th>
                <th>New Visits</th>
                <th style={{ borderTopRightRadius: 18 }}>Follow Up</th>
              </tr>
            </thead>
            <tbody>
              {data?.users?.map((user, idx, arr) => (
                <tr
                  key={user._id}
                  className="visitlog-row"
                  style={{
                    background: theme === "dark" ? "#23272b" : "#fafdff",
                    borderBottom:
                      idx < arr.length - 1
                        ? `1.5px solid ${theme === "dark" ? "#232b33" : "#e3eaf2"}`
                        : "none",
                    transition:
                      "background 0.18s, color 0.18s, box-shadow 0.18s",
                    cursor: "pointer",
                  }}
                  onClick={() => handleUserRowClick(user)}
                >
                  <td
                    style={{
                      padding: "14px 8px",
                      fontWeight: 600,
                      color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                      borderBottomLeftRadius: idx === arr.length - 1 ? 18 : 0,
                    }}
                  >
                    {user.username}
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 500 }}>
                    {user.totalVisits ?? 0}
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 500 }}>
                    {user.averageVisit ?? 0}
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 500 }}>
                    {user.totalNewVisit ?? 0}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      fontWeight: 500,
                      borderBottomRightRadius: idx === arr.length - 1 ? 18 : 0,
                    }}
                  >
                    {user.totalFollowUpVisit ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* User Visit Log Modal */}
      {userModal.open && (
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
              maxWidth: 600,
              width: "98vw",
              color: theme === "dark" ? "#fff" : "#23272b",
              position: "relative",
              padding: "2.2rem 1.7rem 1.5rem 1.7rem",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <button
              onClick={() => setUserModal({ open: false, user: null })}
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
                fontSize: 22,
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              {userModal.user?.username}
            </div>
            {/* Date filter */}
            <div
              style={{
                display: "flex",
                gap: 18,
                marginBottom: 18,
                justifyContent: "center",
              }}
            >
              <div>
                <label
                  style={{ fontWeight: 500, marginBottom: 6, display: "block" }}
                >
                  From
                </label>
                <input
                  type="date"
                  value={userLogFrom}
                  onChange={(e) => setUserLogFrom(e.target.value)}
                  style={{
                    borderRadius: 8,
                    border: "1.5px solid #a4c2f4",
                    padding: "8px 14px",
                    background: theme === "dark" ? "#181c20" : "#f7faff",
                    color: theme === "dark" ? "#fff" : "#23272b",
                  }}
                />
              </div>
              <div>
                <label
                  style={{ fontWeight: 500, marginBottom: 6, display: "block" }}
                >
                  To
                </label>
                <input
                  type="date"
                  value={userLogTo}
                  onChange={(e) => setUserLogTo(e.target.value)}
                  style={{
                    borderRadius: 8,
                    border: "1.5px solid #a4c2f4",
                    padding: "8px 14px",
                    background: theme === "dark" ? "#181c20" : "#f7faff",
                    color: theme === "dark" ? "#fff" : "#23272b",
                  }}
                />
              </div>
              <button
                onClick={() => {
                  setUserModal({ open: false, user: null });
                  navigate("/visitlog-report/user", {
                    state: {
                      userId: userModal.user._id,
                      from: userLogFrom,
                      to: userLogTo,
                      users: data.users,
                    },
                  });
                }}
                style={{
                  borderRadius: 8,
                  padding: "8px 22px",
                  fontSize: 16,
                  background: theme === "dark" ? "#a4c2f4" : "#1976d2",
                  color: theme === "dark" ? "#23272b" : "#fff",
                  border: "none",
                  fontWeight: 600,
                  alignSelf: "end",
                  marginTop: 22,
                  marginLeft: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <FaFilter /> Apply
              </button>
            </div>
            {/* Loading, error, or data */}
            {userLogLoading && (
              <div
                style={{
                  margin: "40px 0",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 120,
                }}
              >
                <div
                  className="spinner"
                  style={{
                    width: 36,
                    height: 36,
                    border: `4px solid ${theme === "dark" ? "#a4c2f4" : "#1976d2"}`,
                    borderTop: "4px solid transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    marginBottom: 12,
                  }}
                />
                <div
                  style={{
                    color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                    fontSize: 16,
                  }}
                >
                  Loading...
                </div>
              </div>
            )}
            {userLogError && (
              <div
                style={{
                  color: "#e53935",
                  fontWeight: 500,
                  margin: "18px 0",
                  textAlign: "center",
                }}
              >
                {userLogError}
              </div>
            )}
            {userLogData && (
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 18,
                    marginBottom: 10,
                    textAlign: "center",
                  }}
                >
                  Total Visits: {userLogData.visitLogCounter ?? 0}
                </div>
                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {userLogData.visitLogs && userLogData.visitLogs.length > 0 ? (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 15,
                        marginTop: 8,
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background:
                              theme === "dark" ? "#232b33" : "#e3eaf2",
                            color: theme === "dark" ? "#a4c2f4" : "#1a237e",
                            fontWeight: 700,
                          }}
                        >
                          <th style={{ padding: "8px 6px" }}>POC Name</th>
                          <th>Type</th>
                          <th>Date</th>
                          <th>Address</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userLogData.visitLogs.map((log, i) => (
                          <tr
                            key={log.logId || i}
                            style={{
                              borderBottom: `1px solid ${theme === "dark" ? "#232b33" : "#e3eaf2"}`,
                            }}
                          >
                            <td style={{ padding: "8px 6px", fontWeight: 600 }}>
                              {log.pocName}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {log.visitType}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {log.visitDate?.slice(0, 10)}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {log.pocAddress}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {log.remarks}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div
                      style={{
                        color: theme === "dark" ? "#a4c2f4" : "#1976d2",
                        textAlign: "center",
                        margin: "18px 0",
                      }}
                    >
                      No visit logs found for this user in the selected range.
                    </div>
                  )}
                </div>
              </div>
            )}
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      )}
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
      {error && (
        <div
          style={{
            marginTop: 40,
            textAlign: "center",
            color: "#e53935",
            fontSize: 18,
          }}
        >
          {error}
        </div>
      )}

      {/* Monthly Popup */}
      {showMonthlyPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.18)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: theme === "dark" ? "#23272b" : "#fff",
              borderRadius: 16,
              boxShadow: "0 4px 24px rgba(44,62,80,0.18)",
              padding: "2.2rem 1.7rem 1.5rem 1.7rem",
              minWidth: 320,
              maxWidth: "98vw",
              color: theme === "dark" ? "#fff" : "#23272b",
              position: "relative",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18 }}>
              Select Month
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
                  style={{ fontWeight: 500, marginBottom: 6, display: "block" }}
                >
                  Year (BS)
                </label>
                <select
                  value={monthlyYear}
                  onChange={(e) => setMonthlyYear(Number(e.target.value))}
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
                  style={{ fontWeight: 500, marginBottom: 6, display: "block" }}
                >
                  Month (BS)
                </label>
                <select
                  value={monthlyMonth}
                  onChange={(e) => setMonthlyMonth(Number(e.target.value))}
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
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <button
                onClick={() => setShowMonthlyPopup(false)}
                style={{
                  borderRadius: 8,
                  padding: "8px 22px",
                  fontSize: 16,
                  background: "#eee",
                  color: "#222",
                  border: "none",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleMonthlyApply}
                style={{
                  borderRadius: 8,
                  padding: "8px 22px",
                  fontSize: 16,
                  background: theme === "dark" ? "#a4c2f4" : "#1976d2",
                  color: theme === "dark" ? "#23272b" : "#fff",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Date Popup */}
      {showCustomPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.18)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: theme === "dark" ? "#23272b" : "#fff",
              borderRadius: 16,
              boxShadow: "0 4px 24px rgba(44,62,80,0.18)",
              padding: "2.2rem 1.7rem 1.5rem 1.7rem",
              minWidth: 320,
              maxWidth: "98vw",
              color: theme === "dark" ? "#fff" : "#23272b",
              position: "relative",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18 }}>
              Select Custom Date Range (BS)
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
                  style={{ fontWeight: 500, marginBottom: 6, display: "block" }}
                >
                  From Date (YYYY-MM-DD)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 2082-01-01"
                  value={customFromDate}
                  onChange={(e) => setCustomFromDate(e.target.value)}
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
              <div>
                <label
                  style={{ fontWeight: 500, marginBottom: 6, display: "block" }}
                >
                  To Date (YYYY-MM-DD)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 2082-01-31"
                  value={customToDate}
                  onChange={(e) => setCustomToDate(e.target.value)}
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
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <button
                onClick={() => setShowCustomPopup(false)}
                style={{
                  borderRadius: 8,
                  padding: "8px 22px",
                  fontSize: 16,
                  background: "#eee",
                  color: "#222",
                  border: "none",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCustomApply}
                style={{
                  borderRadius: 8,
                  padding: "8px 22px",
                  fontSize: 16,
                  background: theme === "dark" ? "#a4c2f4" : "#1976d2",
                  color: theme === "dark" ? "#23272b" : "#fff",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card and row hover styles + responsive styles */}
      <style>{`
        .visitlog-card:hover {
          transform: translateY(-8px) scale(1.03);
          box-shadow: 0 8px 32px rgba(44,62,80,0.18);
          background: ${theme === "dark" ? "#2d3540" : "#eaf2ff"} !important;
          color: ${theme === "dark" ? "#fff" : "#1a237e"} !important;
        }
        .visitlog-row:hover {
          background: ${theme === "dark" ? "#2d3540" : "#eaf2ff"} !important;
          color: ${theme === "dark" ? "#fff" : "#23272b"} !important;
          box-shadow: 0 2px 12px rgba(44,62,80,0.10);
        }
        .visitlog-row td:first-child {
          border-bottom-left-radius: 18px;
        }
        .visitlog-row td:last-child {
          border-bottom-right-radius: 18px;
        }
        /* Responsive styles */
        @media (max-width: 900px) {
          .visitlog-cards-row {
            flex-direction: column;
            gap: 18px;
          }
          .visitlog-card {
            min-width: 0 !important;
            width: 100% !important;
          }
        }
        @media (max-width: 600px) {
          .visitlog-cards-row {
            gap: 12px;
          }
          .visitlog-card {
            padding: 14px !important;
            font-size: 15px !important;
          }
          table {
            font-size: 14px !important;
            min-width: 400px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default VisitLogReport;
