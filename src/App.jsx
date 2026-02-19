import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import ProtectedRoute from "./components/Common/ProtectedRoute";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";
import LiveLocation from "./pages/LiveLocation";
import Layout from "./components/Layout/Layout";
import AttendanceReport from "./pages/AttendanceReport";
import VisitLogReport from "./pages/VisitLogReport";
import UserVisitLogDetails from "./pages/UserVisitLogDetails";
import LocationHistory from "./pages/LocationHistory";
import ReferralReport from "./pages/ReferralReport";
import ReferralReportDetail from "./pages/ReferralReportDetail";
import POCReport from "./pages/POCReport";
import POCReferralReport from "./pages/POCReferralReport";
import "./App.css";
import AllUsersVisitLogDetails from "./pages/AllUsersVisitLogDetails";

function App() {
  return (
    <Router>
      <Routes>
        {/* Initial route is login */}
        <Route path="/auth" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/livelocation" element={<LiveLocation />} />
          <Route path="/coming-soon" element={<ComingSoon />} />
          <Route path="/attendance-report" element={<AttendanceReport />} />
          <Route path="/visitlog-report" element={<VisitLogReport />} />
          <Route
            path="/visitlog-report/user"
            element={<UserVisitLogDetails />}
          />
          <Route
            path="/visitlog-report/all-users"
            element={<AllUsersVisitLogDetails />}
          />
          <Route path="/locationhistory" element={<LocationHistory />} />
          <Route path="/referral-report" element={<ReferralReport />} />
          <Route
            path="/referral-report-detail"
            element={<ReferralReportDetail />}
          />
          <Route path="/poc-report" element={<POCReport />} />
          <Route
            path="/poc-referral-report/:id"
            element={<POCReferralReport />}
          />
        </Route>
        {/* 404 Not Found route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
