import React from 'react';
import {
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Activity,
  BadgeCheck,
  UserCog,
  Cpu,
  Gauge
} from 'lucide-react';
import './AdminManagement.scss';

const AdminManagement = () => {
  const admin = {
    name: 'Sagar Mohanty',
    role: 'Head Admin',
    email: 'admin@yodhagym.in',
    phone: '+91 90909 90909',
    location: 'Bhubaneswar, Odisha',
    joinedOn: '12 Jan 2024',
    lastLogin: 'Today, 08:42 AM',
    status: 'Active',
    accessLevel: 'Super Admin',
    permissions: ['Members', 'Trainers', 'Plans', 'Billing', 'Attendance', 'Inventory'],
    stats: [
      { label: 'Monthly Revenue', value: '₹2,45,400' },
      { label: 'Active Members', value: '250' },
      { label: 'Trainers', value: '12' }
    ],
    adminOverview: [
      { id: 1, label: 'Total Admins', value: '1', icon: <Gauge size={18} /> },
      { id: 2, label: 'Assigned Branch', value: 'Bhubaneswar HQ', icon: <Activity size={18} /> },
      { id: 3, label: 'Access Scope', value: 'Full Control', icon: <Cpu size={18} /> }
    ],
    recentAdds: [
      { id: 1, name: 'Ritu Singh', date: '09 Apr 2026' },
      { id: 2, name: 'Sourav Das', date: '08 Apr 2026' },
      { id: 3, name: 'Anisha Jena', date: '07 Apr 2026' }
    ]
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h2 className="admin-title">Admin Command Center</h2>
          <p className="admin-subtitle">Single-admin profile view. API hookup later.</p>
        </div>
        <div className="status-pill">
          <ShieldCheck size={16} />
          {admin.status}
        </div>
      </header>

      <section className="admin-grid">
        <div className="admin-card profile">
          <div className="profile-top">
            <div className="avatar-ring">
              <UserCog size={28} />
            </div>
            <div>
              <h3>{admin.name}</h3>
              <p>{admin.role}</p>
              <span className="access-badge">
                <BadgeCheck size={14} />
                {admin.accessLevel}
              </span>
            </div>
          </div>

          <div className="profile-list">
            <div>
              <Mail size={16} />
              <span>{admin.email}</span>
            </div>
            <div>
              <Phone size={16} />
              <span>{admin.phone}</span>
            </div>
            <div>
              <MapPin size={16} />
              <span>{admin.location}</span>
            </div>
            <div>
              <CalendarDays size={16} />
              <span>Joined: {admin.joinedOn}</span>
            </div>
            <div>
              <Activity size={16} />
              <span>Last login: {admin.lastLogin}</span>
            </div>
          </div>

          <div className="profile-actions">
            <button type="button" className="primary">Edit Profile</button>
            <button type="button" className="ghost">Reset Password</button>
          </div>
        </div>

        <div className="admin-card stats">
          <h4>Performance Snapshot</h4>
          <div className="stat-grid">
            {admin.stats.map((item) => (
              <div key={item.label} className="stat-tile">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card permissions">
          <h4>Access Modules</h4>
          <div className="pill-row">
            {admin.permissions.map((perm) => (
              <span key={perm} className="pill">{perm}</span>
            ))}
          </div>
        </div>

        <div className="admin-card ops">
          <h4>Admin Overview</h4>
          <div className="ops-grid">
            {admin.adminOverview.map((item) => (
              <div key={item.id} className="ops-item">
                <div className="ops-icon">{item.icon}</div>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card activity">
          <h4>Recent Member Adds</h4>
          <ul>
            {admin.recentAdds.map((item) => (
              <li key={item.id}>
                <div>
                  <span className="name">{item.name}</span>
                  <small>Added by Admin</small>
                </div>
                <em>{item.date}</em>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default AdminManagement;