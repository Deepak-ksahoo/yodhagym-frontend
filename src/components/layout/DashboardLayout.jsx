import React, { useEffect, useState } from "react";
import {
  Outlet,
  NavLink,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth, ROLES } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  UserCog,
  CreditCard,
  UsersRound,
  CalendarCheck,
  User,
  Activity,
  Dumbbell,
  Bell,
  Package,
  Receipt,
  UserCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import "./DashboardLayout.scss";

const LOGO_ICON = <Dumbbell className="logo-icon" />;

const SIDEBAR_LINKS = {
  [ROLES.DEVELOPER]: [
    { path: "/dev/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/dev/admin", label: "Admin", icon: UserCog },
    { path: "/dev/trainer", label: "Trainer", icon: UsersRound },
    { path: "/dev/customers", label: "Customers", icon: Users },
    { path: "/dev/plans", label: "Plans", icon: Package },
    { path: "/dev/billing", label: "Billing", icon: Receipt },
    { path: "/dev/payments", label: "Payments", icon: CreditCard },
    { path: "/dev/notifications", label: "Notifications", icon: Bell },
    { path: "/dev/profile", label: "My Profile", icon: UserCircle },
  ],
  [ROLES.ADMIN]: [
    { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/trainer", label: "Trainer", icon: UsersRound },
    { path: "/admin/customers", label: "Customers", icon: Users },
    { path: "/admin/plans", label: "Plans", icon: Package },
    { path: "/admin/billing", label: "Billing", icon: Receipt },
    { path: "/admin/payments", label: "Payments", icon: CreditCard },
    { path: "/admin/notifications", label: "Notifications", icon: Bell },
    { path: "/admin/profile", label: "My Profile", icon: UserCircle },
  ],
  [ROLES.TRAINER]: [
    { path: "/trainer/dashboard", label: "Overview", icon: LayoutDashboard },
    { path: "/trainer/assigned", label: "Assigned Members", icon: UsersRound },
    { path: "/trainer/attendance", label: "Attendance", icon: CalendarCheck },
  ],
  [ROLES.MEMBER]: [
    { path: "/member/dashboard", label: "Overview", icon: LayoutDashboard },
    { path: "/member/profile", label: "My Profile", icon: User },
    { path: "/member/plan", label: "My Plan", icon: Activity },
  ],
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) return <Navigate to="/" replace />;

  const normalizedRole =
    typeof user?.role === "string"
      ? user.role.trim().toLowerCase()
      : user?.role;
  const links = SIDEBAR_LINKS[normalizedRole] || [];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleNavClick = () => {
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="layout-container">
      <div
        className={`mobile-overlay ${isSidebarOpen ? "open" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header" onClick={() => navigate("/")}>
          <div className="logo-box">{LOGO_ICON}</div>
          <h2>
            Yodha<span>Gym</span>
          </h2>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <div className="nav-icon-box">
                  <Icon className="nav-icon" />
                </div>
                <span>{link.label}</span>
                {/* Stylish indicator for active link */}
                <div className="active-indicator" />
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="mobile-logout-btn"
          >
            <LogOut size={16} aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </nav>

        {/* User Quick Info at Bottom of Sidebar */}
      </aside>

      <div className="main-wrapper">
        <header className="top-header">
          <div className="header-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-label={
                isSidebarOpen ? "Close navigation" : "Open navigation"
              }
              aria-expanded={isSidebarOpen}
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="welcome-text">
              Welcome back, <span>{user.fullName?.split(" ")[0]}!</span>
            </div>
          </div>

          <div className="header-actions">
            {/* Role Badge - Modern Version */}
            <div className={`role-badge ${normalizedRole}`}>
              {normalizedRole === "user" ? "CUSTOMER" : normalizedRole}
            </div>

            <div className="user-profile">
              <div className="user-profile-name">
                {user.fullName || user.email || user.number || "Yodha Member"}
              </div>
              <div className="avatar-wrapper">
                {user.profilePic ? (
                  <img src={user.profilePic} alt="Profile" />
                ) : (
                  <div className="initials">
                    {user.fullName?.charAt(0) || "Y"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
