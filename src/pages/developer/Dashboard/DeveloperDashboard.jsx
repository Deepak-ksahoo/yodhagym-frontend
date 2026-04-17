import React from 'react';
import { Users, Fingerprint, IndianRupee, Search, CalendarCheck } from 'lucide-react';
import './DeveloperDashboard.scss';

const DeveloperDashboard = () => {
  // Mock Data
  const biometricEntries = [
    { id: 1, name: 'Deepak Sahoo', time: '07:15 AM', status: 'IN', plan: 'Gold' },
    { id: 2, name: 'Aditya Kumar', time: '08:30 AM', status: 'IN', plan: 'Monthly' },
    { id: 3, name: 'Dinesh Rout', time: '09:00 AM', status: 'OUT', plan: 'Yearly' },
    { id: 4, name: 'Monalisa', time: '09:45 AM', status: 'IN', plan: 'Gold' },
    { id: 5, name: 'Debasrita', time: '10:15 AM', status: 'IN', plan: 'Silver' },
    { id: 6, name: 'Rahul Nayak', time: '10:30 AM', status: 'IN', plan: 'Gold' },
    { id: 7, name: 'Sagar Mohanty', time: '11:00 AM', status: 'OUT', plan: 'Monthly' },
  ];

  return (
    <div className="dev-dashboard">
      <header className="page-header">
        <div className="title-section">
          <h2 className="page-title">Developer Console</h2>
          <div className="power-badge">SUPER ACCESS ENABLED</div>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card members">
          <div className="card-info">
            <span>Total Members</span>
            <h3>250</h3>
          </div>
          <Users className="card-icon" />
        </div>

        <div className="stat-card attendance">
          <div className="card-info">
            <span>Today's Attendance</span>
            <h3>85</h3>
          </div>
          <CalendarCheck className="card-icon" />
        </div>

        <div className="stat-card revenue">
          <div className="card-info">
            <span>Monthly Collection</span>
            <h3>₹2,45,400</h3>
          </div>
          <IndianRupee className="card-icon" />
        </div>
      </div>

      <section className="biometric-box">
        <div className="box-header">
          <div className="header-left">
            <Fingerprint size={20} color="#ff3131" />
            <h3>Today's Attendance</h3>
          </div>
          <div className="search-bar">
            <Search size={16} />
            <input type="text" placeholder="Search record..." />
          </div>
        </div>

        {/* Scroll isi div ke andar hoga */}
        <div className="table-scroll-area">
          <table className="biometric-table">
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Plan</th>
                <th>Punch Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {biometricEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="member-name">{entry.name}</td>
                  <td><span className={`plan-tag ${entry.plan.toLowerCase()}`}>{entry.plan}</span></td>
                  <td>{entry.time}</td>
                  <td>
                    <span className={`status-tag ${entry.status === 'IN' ? 'in' : 'out'}`}>
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default DeveloperDashboard;