import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ROLES } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';

// Developer Pages
import DeveloperDashboard from './pages/developer/Dashboard/DeveloperDashboard';
import AdminManagement from './pages/developer/Admin/AdminManagement';
import TrainerManagement from './pages/developer/Trainer/TrainerManagement';
import CustomerManagement from './pages/developer/Customer/CustomerManagement';
import CustomerDetails from './pages/developer/Customer/CustomerDetails';
import DeveloperNotifications from './pages/developer/Notifications/Notifications';
import DeveloperPlans from './pages/developer/Plans/Plans';
import DeveloperBilling from './pages/developer/Billing/Billing';
import DeveloperProfile from './pages/developer/Profile/Profile';
import DeveloperPayments from './pages/developer/Payments/Payments';
import AdminProfile from './pages/admin/Profile/Profile';

const PlaceholderPage = ({ title, desc }) => (
  <div>
    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', color: 'white', marginBottom: '1rem', borderBottom: '1px solid #262626', paddingBottom: '0.5rem' }}>
      {title}
    </h2>
    <p style={{ color: '#9ca3af' }}>{desc}</p>
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer 
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<DashboardLayout />}>
            <Route element={<ProtectedRoute allowedRoles={[ROLES.DEVELOPER]} />}>
              <Route path="/dev/dashboard" element={<DeveloperDashboard />} />
              <Route path="/dev/admin" element={<AdminManagement />} />
              <Route path="/dev/trainer" element={<TrainerManagement />} />
              <Route path="/dev/customers" element={<CustomerManagement />} />
              <Route path="/dev/customers/details" element={<CustomerDetails />} />
              <Route path="/dev/plans" element={<DeveloperPlans />} />
              <Route path="/dev/billing" element={<DeveloperBilling />} />
              <Route path="/dev/payments" element={<DeveloperPayments />} />
              <Route path="/dev/notifications" element={<DeveloperNotifications />} />
              <Route path="/dev/profile" element={<DeveloperProfile />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
              <Route path="/admin/dashboard" element={<DeveloperDashboard />} />
              <Route path="/admin/trainer" element={<TrainerManagement />} />
              <Route path="/admin/customers" element={<CustomerManagement />} />
              <Route path="/admin/customers/details" element={<CustomerDetails />} />
              <Route path="/admin/plans" element={<DeveloperPlans />} />
              <Route path="/admin/billing" element={<DeveloperBilling />} />
              <Route path="/admin/payments" element={<DeveloperPayments />} />
              <Route path="/admin/notifications" element={<DeveloperNotifications />} />
              <Route path="/admin/profile" element={<AdminProfile />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[ROLES.TRAINER]} />}>
              <Route path="/trainer/dashboard" element={<PlaceholderPage title="Trainer Dashboard" desc="Track your scheduled batches and assigned client progress." />} />
              <Route path="/trainer/assigned" element={<PlaceholderPage title="Assigned Members" desc="A list of members actively training under your guidance." />} />
              <Route path="/trainer/attendance" element={<PlaceholderPage title="Mark Attendance" desc="Mark the daily attendance for members in your current batch." />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[ROLES.MEMBER]} />}>
              <Route path="/member/dashboard" element={<PlaceholderPage title="Member Dashboard" desc="Welcome back, Yodha! Here's a brief look at your daily progress." />} />
              <Route path="/member/profile" element={<PlaceholderPage title="My Profile" desc="Update your body metrics, contact details and password." />} />
              <Route path="/member/plan" element={<PlaceholderPage title="My Plan Details" desc="Check your current subscription validity and renew your gym plan." />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
