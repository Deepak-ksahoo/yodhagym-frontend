import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../../utils/api';
import { Search, Receipt, Download, Share2, BadgeCheck, Clock, Wallet, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
import './Billing.scss';
import { useAuth } from '../../../context/AuthContext';
import { deleteCloudinaryAssetByToken, uploadFileToCloudinary } from '../../../utils/uploadFileToCloudinary';

const BILLINGS_API = '/api/billings/getallbilling';
const PLANS_API = '/api/plans/getallplans';

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

const sanitizePhoneNumber = (value) => {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

const CLOUDINARY_CLEANUP_STORAGE_KEY = 'yodha_cloudinary_cleanup_v1';
const CLOUDINARY_DELETE_TTL_MS = 24 * 60 * 60 * 1000;

const loadCloudinaryCleanupQueue = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CLOUDINARY_CLEANUP_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveCloudinaryCleanupQueue = (queue) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLOUDINARY_CLEANUP_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage failures.
  }
};

const addCloudinaryCleanupItem = (token, expiresAt) => {
  if (!token) return;
  const queue = loadCloudinaryCleanupQueue();
  queue.push({ token, expiresAt });
  saveCloudinaryCleanupQueue(queue);
};

const removeCloudinaryCleanupItem = (token) => {
  if (!token) return;
  const queue = loadCloudinaryCleanupQueue();
  const nextQueue = queue.filter((item) => item?.token !== token);
  saveCloudinaryCleanupQueue(nextQueue);
};

const cleanupExpiredCloudinaryAssets = async () => {
  const queue = loadCloudinaryCleanupQueue();
  if (!queue.length) return;
  const now = Date.now();
  const expired = queue.filter((item) => item?.token && item?.expiresAt && item.expiresAt <= now);
  const pending = queue.filter((item) => !item?.expiresAt || item.expiresAt > now);

  if (!expired.length) return;

  const results = await Promise.all(
    expired.map((item) => deleteCloudinaryAssetByToken(item.token))
  );
  const failed = expired.filter((_, index) => !results[index]);
  saveCloudinaryCleanupQueue([...pending, ...failed]);
};

const scheduleCloudinaryDelete = (deleteToken, ttlMs = CLOUDINARY_DELETE_TTL_MS) => {
  if (!deleteToken || typeof window === 'undefined') return;
  const expiresAt = Date.now() + ttlMs;
  addCloudinaryCleanupItem(deleteToken, expiresAt);
  setTimeout(async () => {
    const deleted = await deleteCloudinaryAssetByToken(deleteToken);
    if (deleted) {
      removeCloudinaryCleanupItem(deleteToken);
    }
  }, ttlMs);
};

const getPaymentId = (item) => {
  if (item?.paymentId && typeof item.paymentId === 'object') {
    return item.paymentId?._id || item.paymentId?.id || '';
  }
  if (item?.payment && typeof item.payment === 'object') {
    return item.payment?._id || item.payment?.id || '';
  }
  if (item?.paymentId && typeof item.paymentId === 'string') {
    return item.paymentId;
  }
  return '';
};

const toSafeCloudinaryId = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

// --- UPDATED HELPER FUNCTIONS ---
const getBillingAmount = (item) => {
  return toNumber(
    item?.paymentId?.totalBillAmount
    ?? item?.grandTotal
    ?? item?.totalBillAmount
    ?? item?.subTotal
    ?? item?.totalAmount
    ?? item?.amountPaid
    ?? 0
  );
};

const getBillingPaidAmount = (item) => {
  return toNumber(
    item?.paymentId?.amountPaid
    ?? item?.amountPaid
    ?? item?.paidAmount
    ?? item?.subTotal
    ?? item?.grandTotal
    ?? item?.totalBillAmount
    ?? item?.totalAmount
    ?? 0
  );
};

const getBillingDueAmount = (item) => {
  return toNumber(
    item?.paymentId?.dueAmount 
    ?? 0
  );
};

const getBillingStatus = (item) => {
  const raw = String(item?.paymentId?.paymentStatus || item?.paymentStatus || item?.status || '').toUpperCase();
  
  if (raw === 'PARTIAL') {
    return { label: 'PARTIAL', className: 'due' }; // Use 'due' class or create 'partial' in SCSS
  }

  const totalBill = getBillingAmount(item);
  const paidAmount = getBillingPaidAmount(item);
  const isPaid = raw ? ['PAID', 'COMPLETED', 'SUCCESS'].includes(raw) : (paidAmount >= totalBill && totalBill > 0);
  
  return {
    label: isPaid ? 'PAID' : 'DUE',
    className: isPaid ? 'paid' : 'due',
  };
};

const buildShareText = (item, index) => {
  const billingId = getBillingId(item, index);
  const memberName = getMemberName(item);
  const planName = getPlanName(item);
  const totalPayable = formatMoney(getBillingAmount(item));
  const paidAmount = formatMoney(getBillingPaidAmount(item));
  const date = formatDate(item?.billingDate || item?.paymentDate || item?.createdAt);

  return [
    `Billing ID: ${billingId}`,
    `Member: ${memberName}`,
    `Plan: ${planName}`,
    `Total Payable: ${totalPayable}`,
    `Paid Amount: ${paidAmount}`,
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

      const response = await api.get(BILLINGS_API, {
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
    cleanupExpiredCloudinaryAssets();
  }, []);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
        if (!authToken) return;

        const response = await api.get(PLANS_API, {
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
      // UPDATED SEARCH LOGIC
      const paymentMethod = String(item?.paymentId?.paymentMethod || item?.paymentMethod || '').toLowerCase();
      const status = String(item?.paymentId?.paymentStatus || item?.paymentStatus || item?.status || '').toLowerCase();
      return [billingId, memberName, planName, contact, paymentMethod, status].join(' ').toLowerCase().includes(query);
    });
  }, [billings, planMap, searchTerm]);

  const stats = useMemo(() => {
    const totalRecords = billings.length;
    const paidRecords = billings.filter((item) => getBillingStatus(item).className === 'paid').length;
    const totalAmount = billings.reduce((sum, item) => sum + getBillingAmount(item), 0);

    return [
      { label: 'Total Bills', value: String(totalRecords), icon: <Receipt size={18} /> },
      { label: 'Collected', value: formatMoney(totalAmount), icon: <Wallet size={18} /> },
      { label: 'Completed', value: String(paidRecords), icon: <BadgeCheck size={18} /> },
    ];
  }, [billings]);

  const fetchReceiptBlob = async (item) => {
    const paymentId = getPaymentId(item);
    if (!paymentId) {
      toast.error('Linked Payment ID not found for this billing record.');
      return null;
    }

    const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
    if (!authToken) {
      toast.error('Missing auth token. Please login again.');
      return null;
    }

    try {
      const response = await api.post(
        '/api/payment/receipt',
        { paymentId: String(paymentId) },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          responseType: 'blob',
        }
      );

      const contentType = response?.headers?.['content-type'] || 'application/pdf';
      if (response.data instanceof Blob) {
        return response.data.type ? response.data : new Blob([response.data], { type: contentType });
      }
      return new Blob([response.data], { type: contentType });
    } catch (error) {
      console.error('Billing receipt error:', error);
      toast.error(error?.response?.data?.message || 'Failed to download receipt from server.');
      return null;
    }
  };

  const handleDownload = async (item, index) => {
    try {
      toast.info('Downloading receipt...');
      const receiptBlob = await fetchReceiptBlob(item);
      if (!receiptBlob) return;

      const url = URL.createObjectURL(receiptBlob);
      const link = document.createElement('a');
      link.href = url;

      const billingId = getBillingId(item, index);
      link.download = `receipt-${billingId.toLowerCase()}.pdf`;

      link.click();
      URL.revokeObjectURL(url);
      toast.success('Receipt downloaded successfully.');
    } catch (error) {
      console.error('Billing download error:', error);
      toast.error('Failed to download receipt from server.');
    }
  };

  const handleShare = async (item, index) => {
    const shareText = buildShareText(item, index);
    const rawNumber = getMemberContact(item);
    const phoneNumber = sanitizePhoneNumber(rawNumber);

    if (!phoneNumber) {
      toast.error('Member phone number not available.');
      return;
    }

    await cleanupExpiredCloudinaryAssets();

    toast.info('Preparing receipt link...');
    const receiptBlob = await fetchReceiptBlob(item);
    if (!receiptBlob) return;

    const billingId = getBillingId(item, index);
    const safeBillingId = toSafeCloudinaryId(billingId) || `bill-${Date.now()}`;
    const receiptFileName = `receipt-${safeBillingId}.pdf`;
    const receiptFile = new File([receiptBlob], receiptFileName, {
      type: receiptBlob.type || 'application/pdf',
    });

    const uploadResult = await uploadFileToCloudinary(receiptFile, {
      folder: 'billing/receipts',
      publicId: `${safeBillingId}-${Date.now()}`,
      tags: 'billing,receipt',
      resourceType: 'auto',
      returnDeleteToken: false,
    });

    if (!uploadResult?.url) {
      toast.error(uploadResult?.error || 'Failed to upload receipt to Cloudinary.');
      return;
    }

    if (uploadResult.deleteToken) {
      scheduleCloudinaryDelete(uploadResult.deleteToken);
    }

    const message = `${shareText}\nReceipt: ${uploadResult.url}`;
    const shareUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    const opened = window.open(shareUrl, '_blank');
    if (opened) {
      opened.opener = null;
      return;
    }
    window.location.href = shareUrl;
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
                <th>Total / Paid</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleBillings.length > 0 ? (
                visibleBillings.map((item, index) => {
                  const billingId = getBillingId(item, index);
                  let paymentObj = null;
                  if (item.paymentId && typeof item.paymentId === 'object') {
                    paymentObj = item.paymentId;
                  } else if (item.payment) {
                    paymentObj = item.payment;
                  }
                  if (!paymentObj && item.paymentId && typeof item.paymentId === 'string') {
                    paymentObj = { _id: item.paymentId, createdAt: item.paymentDate || item.createdAt };
                  }
                  
                  const receiptId = getReadableReceipt(paymentObj, index, meta.currentPage, meta.pageSize);
                  const status = getBillingStatus(item);
                  const amount = getBillingAmount(item);
                  const paidAmount = getBillingPaidAmount(item);
                  const dueAmount = getBillingDueAmount(item);
                  const paymentMethod = String(item?.paymentId?.paymentMethod || item?.paymentMethod || 'N/A').toUpperCase();
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
                        </div>
                      </td>
                      <td>
                        <div className="stacked-cell amount-cell">
                          <strong>{formatMoney(amount)}</strong>
                          <small>Paid: {formatMoney(paidAmount)}</small>
                          {dueAmount > 0 && <small className="due-text" style={{ color: '#e11d48', fontWeight: '500' }}>Due: {formatMoney(dueAmount)}</small>}
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