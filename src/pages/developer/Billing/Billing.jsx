import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Search, Receipt, Download, Share2, BadgeCheck, Clock, Wallet, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
import './Billing.scss';
import { useAuth } from '../../../context/AuthContext';

const BILLINGS_API = 'http://localhost:5000/api/billings/getallbilling';
const PLANS_API = 'http://localhost:5000/api/plans/getallplans';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 'INR 0';
  return `INR ${amount.toLocaleString('en-IN')}`;
};

const toNumber = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(numeric, 0);
};

const getBillingId = (item, index) => {
  return String(
    item?.invoiceNumber
    || item?.receiptNumber
    || item?.billingNumber
    || item?._id
    || item?.id
    || `BILL-${index + 1}`
  ).toUpperCase();
};


// Helper to generate the Payment Receipt ID (like Payments.jsx)
const normalizeDate = (value) => {
  if (!value) return '';
  const raw = String(value);
  if (raw.includes('T')) return raw.split('T')[0];
  return raw;
};

const getReadableReceipt = (payment, index = 0, currentPage = 1, pageSize = 10) => {
  if (!payment) return '';
  const explicitReceipt = payment?.receiptNumber || payment?.invoiceNumber || payment?.paymentNumber;
  if (explicitReceipt && !/^[a-f0-9]{24}$/i.test(String(explicitReceipt))) {
    return String(explicitReceipt).toUpperCase();
  }
  const sourceId = String(payment?._id || payment?.paymentId || '');
  const suffix = sourceId
    ? sourceId.slice(-6).toUpperCase()
    : String((currentPage - 1) * pageSize + index + 1).padStart(6, '0');
  const dateRaw = normalizeDate(payment?.paymentDate || payment?.createdAt || new Date().toISOString());
  const dateKey = dateRaw ? dateRaw.replace(/-/g, '') : '00000000';
  return `REC-${dateKey.slice(2)}-${suffix}`;
};

const getMemberName = (item) => {
  return item?.memberId?.userId?.fullName
    || item?.memberId?.fullName
    || item?.userId?.fullName
    || item?.memberName
    || item?.fullName
    || 'Unknown Member';
};

const getMemberContact = (item) => {
  return item?.memberId?.userId?.number
    || item?.memberId?.number
    || item?.userId?.number
    || item?.memberId?.user?.number
    || item?.phone
    || 'N/A';
};

const getPlanName = (item) => {
  return item?.planId?.planName
    || item?.plan?.planName
    || item?.planSnapshot?.planName
    || item?.planName
    || '';
};

const getPlanId = (item) => {
  const paymentPlanId = item?.paymentId && typeof item.paymentId === 'object' ? item.paymentId?.planId : null;
  return String(
    paymentPlanId
    || item?.memberId?.planId
    || item?.planId?._id
    || item?.planId
    || ''
  ).trim();
};

const getPlanDisplayName = (item, planMap) => {
  const planId = getPlanId(item);
  return getPlanName(item) || planMap?.[planId] || '';
};

const getBillingAmount = (item) => {
  return toNumber(
    item?.grandTotal
    ?? item?.totalBillAmount
    ?? item?.amountPaid
    ?? item?.subTotal
    ?? item?.totalAmount
    ?? 0
  );
};

const getBillingDue = (item) => {
  return toNumber(item?.dueAmount ?? item?.pendingAmount ?? 0);
};

const getBillingStatus = (item) => {
  const raw = String(item?.paymentStatus || item?.status || '').toUpperCase();
  const dueAmount = getBillingDue(item);
  const isPaid = raw ? ['PAID', 'COMPLETED', 'SUCCESS'].includes(raw) : dueAmount <= 0;
  return {
    label: isPaid ? 'PAID' : 'DUE',
    className: isPaid ? 'paid' : 'due',
  };
};

const buildShareText = (item, index) => {
  const billingId = getBillingId(item, index);
  const memberName = getMemberName(item);
  const planName = getPlanName(item);
  const amount = formatMoney(getBillingAmount(item));
  const due = formatMoney(getBillingDue(item));
  const date = formatDate(item?.billingDate || item?.paymentDate || item?.createdAt);

  return [
    `Billing ID: ${billingId}`,
    `Member: ${memberName}`,
    `Plan: ${planName}`,
    `Amount: ${amount}`,
    `Due: ${due}`,
    `Date: ${date}`,
  ].join('\n');
};

const Billing = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [billings, setBillings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [planMap, setPlanMap] = useState({});
  const [meta, setMeta] = useState({
    totalRecords: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
    hasNextPage: false,
  });

  const fetchBillings = useCallback(async (page = 1) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
      if (!authToken) throw new Error('Missing auth token. Please login again.');

      const queryParams = {
        page,
        limit: meta.pageSize,
      };

      const activeSearch = searchTerm.trim();
      if (activeSearch) {
        queryParams.search = activeSearch;
        queryParams.searchFields = 'invoiceNumber,receiptNumber,paymentId,member.fullName,member.number,plan.planName,paymentStatus,status';
      }

      const response = await axios.get(BILLINGS_API, {
        params: queryParams,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Unable to fetch billing data.');
      }

      const payload = response?.data?.data || response?.data;
      const records = payload?.billings || payload?.records || payload?.items || payload?.data || (Array.isArray(payload) ? payload : []);
      const safeRecords = Array.isArray(records) ? records : [];

      const totalRecordsRaw = payload?.totalRecords ?? payload?.total ?? response?.data?.totalRecords ?? response?.data?.total;
      const totalPagesRaw = payload?.totalPages ?? response?.data?.totalPages;
      const currentPage = Number(payload?.currentPage ?? response?.data?.currentPage ?? page);
      const hasApiTotalPages = Number.isFinite(Number(totalPagesRaw)) && Number(totalPagesRaw) > 0;
      const hasNextPage = hasApiTotalPages ? currentPage < Number(totalPagesRaw) : safeRecords.length >= meta.pageSize;
      const totalPages = hasApiTotalPages
        ? Number(totalPagesRaw)
        : Math.max(1, currentPage + (hasNextPage ? 1 : 0));
      const totalRecords = Number.isFinite(Number(totalRecordsRaw))
        ? Number(totalRecordsRaw)
        : (currentPage - 1) * meta.pageSize + safeRecords.length + (hasNextPage ? 1 : 0);

      setBillings(safeRecords);
      setMeta((prev) => ({
        ...prev,
        totalRecords,
        totalPages,
        currentPage,
        hasNextPage,
      }));
    } catch (error) {
      setBillings([]);
      const message = error?.response?.data?.message || error?.message || 'Failed to load billing data.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [meta.pageSize, searchTerm, token]);

  useEffect(() => {
    fetchBillings(meta.currentPage);
  }, [fetchBillings, meta.currentPage]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
        if (!authToken) return;

        const response = await axios.get(PLANS_API, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        const data = response?.data;
        const list = data?.plans || data?.data || (Array.isArray(data) ? data : []);
        const nextMap = {};
        (Array.isArray(list) ? list : []).forEach((planItem) => {
          if (planItem?._id) {
            nextMap[String(planItem._id)] = planItem?.planName || 'Plan';
          }
        });
        setPlanMap(nextMap);
      } catch {
        setPlanMap({});
      }
    };

    fetchPlans();
  }, [token]);

  const visibleTotalPages = Math.max(meta.totalPages, meta.currentPage + (meta.hasNextPage ? 1 : 0));
  const canGoPrev = meta.currentPage > 1;
  const canGoNext = meta.hasNextPage || meta.currentPage < visibleTotalPages;

  const goToPage = (pageNumber) => {
    const maxAllowedPage = Math.max(meta.totalPages, meta.currentPage + (meta.hasNextPage ? 1 : 0));
    if (pageNumber >= 1 && pageNumber <= maxAllowedPage) {
      setMeta((prev) => {
        if (prev.currentPage === pageNumber) return prev;
        return {
          ...prev,
          currentPage: pageNumber,
        };
      });
    }
  };

  const visibleBillings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return billings;

    return billings.filter((item) => {
      const billingId = getBillingId(item, 0);
      const memberName = getMemberName(item);
      const planId = getPlanId(item);
      const planName = getPlanDisplayName(item, planMap);
      const contact = getMemberContact(item);
      const paymentMethod = String(item?.paymentMethod || '').toLowerCase();
      const status = String(item?.paymentStatus || item?.status || '').toLowerCase();
      return [billingId, memberName, planName, contact, paymentMethod, status].join(' ').toLowerCase().includes(query);
    });
  }, [billings, planMap, searchTerm]);

  const stats = useMemo(() => {
    const totalRecords = billings.length;
    const paidRecords = billings.filter((item) => getBillingStatus(item).className === 'paid').length;
    const pendingRecords = Math.max(totalRecords - paidRecords, 0);
    const totalAmount = billings.reduce((sum, item) => sum + getBillingAmount(item), 0);

    return [
      { label: 'Total Bills', value: String(totalRecords), icon: <Receipt size={18} /> },
      { label: 'Collected', value: formatMoney(totalAmount), icon: <Wallet size={18} /> },
      { label: 'Pending', value: String(pendingRecords), icon: <Clock size={18} /> },
    ];
  }, [billings]);

  const handleDownload = (item, index) => {
    const billingId = getBillingId(item, index);
    const fileContent = `${buildShareText(item, index)}\n`;
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${billingId}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Billing record downloaded.');
  };

  const handleShare = async (item, index) => {
    const shareText = buildShareText(item, index);
    if (navigator.share) {
      try {
        await navigator.share({
          title: getBillingId(item, index),
          text: shareText,
        });
        return;
      } catch {
        // User cancelled share.
        return;
      }
    }

    await navigator.clipboard.writeText(shareText);
    toast.success('Billing details copied to clipboard.');
  };

  return (
    <div className="billing-page">
      <header className="billing-header">
        <div>
          <h2 className="billing-title">Billing Control</h2>
          <p className="billing-subtitle">All billing records, payment status, and quick actions in one place.</p>
        </div>
      </header>

      <section className="billing-stats">
        {stats.map((item) => (
          <div key={item.label} className="stat-card">
            <div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <div className="stat-icon">{item.icon}</div>
          </div>
        ))}
      </section>

      <div className="billing-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search billing id, member, plan, status..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="toolbar-meta">
          <Receipt size={16} />
          {meta.totalRecords > 0 ? `${(meta.currentPage - 1) * meta.pageSize + 1}-${Math.min(meta.currentPage * meta.pageSize, meta.totalRecords)} of ${meta.hasNextPage ? `${meta.totalRecords}+` : meta.totalRecords}` : '0 bills'}
        </div>
      </div>

      <div className="table-shell">
        {loading ? (
          <div className="loader-box">
            <Loader2 className="spinner" size={36} />
            <p>Loading billing records...</p>
          </div>
        ) : errorMessage ? (
          <div className="empty-state">
            <strong>Unable to load billing data.</strong>
            <p>{errorMessage}</p>
          </div>
        ) : (
          <table className="billing-table">
            <thead>
              <tr>
                <th>Billing ID</th>
                <th>Member</th>
                <th>Plan</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleBillings.length > 0 ? (
                visibleBillings.map((item, index) => {
                  const billingId = getBillingId(item, index);
                  // Find payment object if present (embedded or as paymentId)
                  let paymentObj = null;
                  if (item.paymentId && typeof item.paymentId === 'object') {
                    paymentObj = item.paymentId;
                  } else if (item.payment) {
                    paymentObj = item.payment;
                  }
                  // Fallback: if paymentId is string, try to use minimal info
                  if (!paymentObj && item.paymentId && typeof item.paymentId === 'string') {
                    paymentObj = { _id: item.paymentId, createdAt: item.paymentDate || item.createdAt };
                  }
                  const receiptId = getReadableReceipt(paymentObj, index, meta.currentPage, meta.pageSize);
                  const status = getBillingStatus(item);
                  const amount = getBillingAmount(item);
                  const dueAmount = getBillingDue(item);
                  const paymentMethod = String(item?.paymentMethod || 'N/A').toUpperCase();
                  const planId = getPlanId(item);
                  const planName = getPlanDisplayName(item, planMap);
                  return (
                    <tr key={String(item?._id || item?.id || billingId)}>
                      <td>
                        <div className="stacked-cell billing-id-cell">
                          <strong>{billingId}</strong>
                          <small>
                            {receiptId ? receiptId : paymentMethod}
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className="stacked-cell">
                          <strong title={getMemberName(item)}>{getMemberName(item)}</strong>
                          <small title={getMemberContact(item)}>{getMemberContact(item)}</small>
                        </div>
                      </td>
                      <td>
                        {planName ? (
                          <div className="stacked-cell plan-cell">
                            <strong>{planName}</strong>
                          </div>
                        ) : (
                          <span className="plan-empty">—</span>
                        )}
                      </td>
                      <td>
                        <div className="stacked-cell">
                          <strong>{formatDate(item?.billingDate || item?.paymentDate || item?.createdAt)}</strong>
                          {dueAmount > 0 ? <small>Due: {formatMoney(dueAmount)}</small> : <small>&nbsp;</small>}
                        </div>
                      </td>
                      <td>
                        <div className="stacked-cell amount-cell">
                          <strong>{formatMoney(amount)}</strong>
                          {dueAmount > 0 ? <small>Balance: {formatMoney(dueAmount)}</small> : <small>&nbsp;</small>}
                        </div>
                      </td>
                      <td>
                        <span className={`status-tag ${status.className}`}>
                          {status.className === 'paid' ? <BadgeCheck size={14} /> : <Clock size={14} />}
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <div className="billing-row-actions">
                          <button type="button" className="action-btn download" title="Download" onClick={() => handleDownload(item, index)}>
                            <Download size={16} />
                          </button>
                          <button type="button" className="action-btn share" title="Share" onClick={() => handleShare(item, index)}>
                            <Share2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="empty-note">No billing records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {!loading && visibleBillings.length > 0 && visibleTotalPages > 1 && (
        <div className="pagination">
          <button className="nav-btn" disabled={!canGoPrev} onClick={() => goToPage(meta.currentPage - 1)}>
            <ChevronLeft size={18} />
          </button>

          {[...Array(visibleTotalPages)].map((_, index) => (
            <button
              key={index + 1}
              className={`page-num ${meta.currentPage === index + 1 ? 'active' : ''}`}
              onClick={() => goToPage(index + 1)}
            >
              {index + 1}
            </button>
          ))}

          <button className="nav-btn" disabled={!canGoNext} onClick={() => goToPage(meta.currentPage + 1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Billing;
