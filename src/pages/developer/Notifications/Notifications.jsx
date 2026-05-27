import React, { useEffect, useState } from 'react';
import { Search, Send, Phone } from 'lucide-react';
import api from '../../../utils/api';
import { toast } from 'react-toastify';
import './Notifications.scss';

const NOTIFICATIONS_API = '/api/notifications/getallnotifications';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN');
};

const sanitizePhoneNumber = (value) => {
  if (!value) return '';
  let digits = String(value).replace(/\D/g, '');
  digits = digits.replace(/^0+/, '');
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
};

const buildWhatsAppMessage = (notification) => {
  const name = notification.user?.name || 'Member';
  const endDate = notification.planEndDate ? formatDate(notification.planEndDate) : 'soon';
  return `Hi ${name}, your plan is ending soon (end date: ${endDate}). Please renew to continue your training at Yodha Gym.`;
};

const statusColor = (status) => {
  if (!status) return '';
  if (status.toLowerCase().includes('end')) return 'notify-status-end';
  if (status.toLowerCase().includes('left')) return 'notify-status-warning';
  if (status.toLowerCase().includes('plan')) return 'notify-status-plan';
  return 'notify-status';
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('yodha_token');
        const res = await api.get(NOTIFICATIONS_API, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.success) {
          setNotifications(res.data.notifications || []);
        }
      } catch (err) {
        toast.error('Server connection failed');
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);


  // Sort: Plan Ended > Coming to End > others
  const statusOrder = (status = '') => {
    const s = status.toLowerCase();
    if (s.includes('plan ended')) return 0;
    if (s.includes('coming to end')) return 1;
    return 2;
  };

  const filtered = notifications
    .filter((n) => {
      const q = search.toLowerCase();
      return (
        n.user?.name?.toLowerCase().includes(q) ||
        n.user?.number?.includes(q) ||
        n.plan?.planName?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => statusOrder(a.status) - statusOrder(b.status));

  const handleRemind = (notification) => {
    const rawNumber = notification.user?.number;
    const phone = sanitizePhoneNumber(rawNumber);
    if (!phone) {
      toast.error('Valid phone number not found');
      return;
    }
    const message = buildWhatsAppMessage(notification);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="notify-page">
      <div className="top-bar">
        <div>
          <h2>Notification Center</h2>
          <p>Manage member alerts & plan expiries</p>
        </div>
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-shell">
        {loading ? (
          <div className="loader">Loading...</div>
        ) : (
          <table className="notify-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Contact</th>
                <th>Plan</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n, i) => (
                <tr key={i}>
                  <td>
                    <div className="notify-member">
                      <div className="notify-avatar">{n.user?.name?.charAt(0)}</div>
                      <span>{n.user?.name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="notify-contact">
                      <span className="notify-phone"><Phone size={13} /> {n.user?.number}</span>
                    </div>
                  </td>
                  <td><span className="notify-plan">{n.plan?.planName}</span></td>
                  <td>{formatDate(n.planStartDate)} - {formatDate(n.planEndDate)}</td>
                  <td>
                    <span className={`notify-status ${statusColor(n.status)}`}>
                      {(() => {
                        const s = (n.status || '').toLowerCase();
                        if (s.includes('plan ended')) return 'Ended';
                        if (s.includes('coming to end')) return 'Ending Soon';
                        if (n.status && n.status.length > 22) return n.status.slice(0, 19) + '...';
                        return n.status || '-';
                      })()}
                    </span>
                  </td>
                  <td>
                    {n.setReminderOption && (
                      <button
                        className="remind-btn"
                        onClick={() => handleRemind(n)}
                      >
                        <Send size={15} /> Remind
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Notifications;