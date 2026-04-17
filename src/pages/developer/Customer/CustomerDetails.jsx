// For identity proof modal
import { useState } from 'react';
import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  UserRound,
  CalendarDays,
  ShieldCheck,
  CreditCard,
  BadgeCheck,
  Clock3,
  Eye,
  History,
  Download,
  Send,
  X,
} from 'lucide-react';
import './CustomerDetails.scss';
import { useAuth } from '../../../context/AuthContext';

const API_URL = '/api/members/getallmembers';
const CLEAR_DUE_API = '/api/payments/clearduepayment';
const PLANS_API = '/api/plans/getallplans';

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatCurrency = (value) => `INR ${Number(value || 0).toLocaleString('en-IN')}`;

const getDateValue = (value) => new Date(value || 0).getTime();

const getCycleKey = (entry) => {
  const planId = String(entry?.planId || entry?.plan?._id || '');
  const startDate = String(entry?.planStartDate || '').slice(0, 10);
  const endDate = String(entry?.planEndDate || '').slice(0, 10);
  if (planId || startDate || endDate) return `${planId}__${startDate}__${endDate}`;

  const snapshotName = String(
    entry?.planSnapshot?.planName ||
    entry?.planName ||
    entry?.plan?.planName ||
    ''
  ).toLowerCase();
  return `name__${snapshotName}`;
};

const toAmount = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(numeric, 0);
};

const resolveFinancials = (payment, billing, fallback = {}) => {
  const admissionFee = toAmount(payment?.admissionFee ?? billing?.admissionFee ?? fallback?.admissionFee ?? 0);
  const planFee = toAmount(payment?.planFee ?? billing?.planFee ?? fallback?.planFee ?? fallback?.planPrice ?? 0);
  const tax = toAmount(payment?.tax ?? billing?.tax ?? fallback?.tax ?? 0);
  const paid = toAmount(payment?.amountPaid ?? billing?.amountPaid ?? billing?.subTotal ?? fallback?.amountPaid ?? 0);
  const explicitDueRaw = payment?.dueAmount ?? billing?.dueAmount ?? fallback?.dueAmount;
  const explicitDue = explicitDueRaw !== undefined && explicitDueRaw !== null ? toAmount(explicitDueRaw) : null;
  const explicitTotal = toAmount(payment?.totalBillAmount ?? billing?.grandTotal ?? fallback?.totalAmount ?? 0);

  const guessedTotalFromFee = admissionFee + planFee + tax;
  const guessedTotalFromTxn = paid + (explicitDue ?? 0);
  const totalBill = Math.max(explicitTotal, guessedTotalFromFee, guessedTotalFromTxn);
  const due = explicitDue !== null ? explicitDue : Math.max(totalBill - paid, 0);

  return {
    admissionFee,
    planFee,
    tax,
    paid,
    due,
    totalBill,
  };
};

const getPaymentStatus = (payment) => {
  const raw = String(payment?.paymentStatus || '').toUpperCase();
  const dueAmount = Number(payment?.dueAmount ?? 0);
  const isPaid = raw ? ['PAID', 'COMPLETED', 'SUCCESS'].includes(raw) : dueAmount <= 0;
  return {
    label: isPaid ? 'PAID' : 'DUE',
    className: isPaid ? 'paid' : 'due',
  };
};

const getPlanValidity = (startDate, endDate) => {
  if (!endDate) return { label: 'N/A', className: 'unknown', hint: 'No end date' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate) : null;
  const end = new Date(endDate);
  start?.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { label: 'CLOSED', className: 'closed', hint: 'Plan ended' };
  if (start && today < start) {
    return {
      label: 'UPCOMING',
      className: 'upcoming',
      hint: `Starts in ${Math.ceil((start - today) / (1000 * 60 * 60 * 24))} day(s)`,
    };
  }
  if (daysLeft <= 5) return { label: 'CLOSING SOON', className: 'soon', hint: `${daysLeft} day(s) left` };
  return { label: 'ACTIVE', className: 'active', hint: `${daysLeft} day(s) left` };
};

const CustomerDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [member, setMember] = useState(location.state?.member || null);
  const [loading, setLoading] = useState(!location.state?.member);
  const [error, setError] = useState('');
  const [planMap, setPlanMap] = useState({});
  const [openBillingModal, setOpenBillingModal] = useState(null);
  const [openPlanHistoryModal, setOpenPlanHistoryModal] = useState(false);
  const [openClearDueModal, setOpenClearDueModal] = useState(false);
  const [clearDueSubmitting, setClearDueSubmitting] = useState(false);
  const [clearDueForm, setClearDueForm] = useState(() => ({
    clearAmount: '0',
    paymentMethod: 'CASH',
    paymentDate: new Date().toISOString().slice(0, 10),
  }));

  useEffect(() => {
    const stateMember = location.state?.member;
    if (stateMember) {
      setMember(stateMember);
      const id = stateMember?._id || stateMember?.id;
      if (id) sessionStorage.setItem('yodha_selected_member_id', id);
      setLoading(false);
      return;
    }

    const fetchMember = async () => {
      setLoading(true);
      setError('');
      try {
        const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
        if (!authToken) throw new Error('Missing auth token. Please login again.');

        const response = await api.get(`${API_URL}?page=1&limit=250`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        const payload = response?.data?.data;
        const members = payload?.members || payload?.records || payload?.items || [];
        const selectedMemberId = sessionStorage.getItem('yodha_selected_member_id');
        const found = selectedMemberId
          ? members.find((item) => String(item?._id || item?.id) === String(selectedMemberId))
          : null;

        if (!found) {
          setError('Member details not found.');
          setMember(null);
        } else {
          setMember(found);
        }
      } catch (err) {
        setError(err?.response?.data?.message || err.message || 'Failed to fetch member details.');
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [location.state, token]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
        if (!authToken) return;

        const response = await api.get(PLANS_API, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        const list = response?.data?.plans || response?.data?.data || (Array.isArray(response?.data) ? response.data : []);
        const map = {};
        (Array.isArray(list) ? list : []).forEach((item) => {
          if (item?._id) {
            map[String(item._id)] = item?.planName || 'N/A';
          }
        });
        setPlanMap(map);
      } catch {
        // Plan map is best-effort for historical display.
      }
    };

    fetchPlans();
  }, [token]);

  const payments = useMemo(() => {
    if (!Array.isArray(member?.payments)) return [];
    return [...member.payments].sort(
      (a, b) => getDateValue(b?.paymentDate || b?.createdAt) - getDateValue(a?.paymentDate || a?.createdAt)
    );
  }, [member]);

  const billings = useMemo(() => {
    if (!Array.isArray(member?.billings)) return [];
    return [...member.billings].sort(
      (a, b) => getDateValue(b?.billingDate || b?.createdAt) - getDateValue(a?.billingDate || a?.createdAt)
    );
  }, [member]);

  const latestPayment = payments[0] || null;
  const latestBilling = billings[0] || null;
  const duePayment = payments.find((item) => toAmount(item?.dueAmount ?? item?.pendingAmount ?? 0) > 0) || null;

  const user = member?.userId || {};
  // Identity proof modal state
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  // Get identityProof array
  const identityProofArr = Array.isArray(user?.identityProof)
    ? user.identityProof
    : Array.isArray(member?.identityProof)
      ? member.identityProof
      : [];
  const plan = member?.planId || {};
  const planValidity = getPlanValidity(member?.planStartDate, member?.planEndDate);
  const latestFinancial = resolveFinancials(latestPayment, latestBilling, {
    admissionFee: member?.admissionFee,
    planFee: member?.planFee ?? plan?.price,
    totalAmount: member?.totalAmount,
  });
  const currentDueAmount = toAmount(duePayment?.dueAmount ?? latestFinancial?.due);
  const totalPaidTillDate = payments.reduce((sum, payment) => sum + toAmount(payment?.amountPaid), 0);

  const resolvePlanDetailsFromPayment = (payment, linkedBillings = []) => {
    const firstBilling = linkedBillings[0] || null;
    const historicalPlanId = String(payment?.planId || firstBilling?.planId || '');
    const sameAsCurrent = historicalPlanId && String(plan?._id || '') === historicalPlanId;

    const name =
      payment?.planSnapshot?.planName ||
      payment?.planName ||
      firstBilling?.planSnapshot?.planName ||
      firstBilling?.planName ||
      (historicalPlanId ? planMap[historicalPlanId] : null) ||
      (sameAsCurrent ? plan?.planName : null) ||
      'Plan from payment record';

    const startDate =
      payment?.planStartDate ||
      firstBilling?.planStartDate ||
      (sameAsCurrent ? member?.planStartDate : null) ||
      null;

    const endDate =
      payment?.planEndDate ||
      firstBilling?.planEndDate ||
      (sameAsCurrent ? member?.planEndDate : null) ||
      null;

    return {
      name,
      startDate,
      endDate,
      id: historicalPlanId || 'N/A',
    };
  };

  const allPaymentEntries = useMemo(() => {
    return payments
      .map((payment) => {
        const cycleKey = getCycleKey(payment);
        const relatedPayments = payments
          .filter((item) => getCycleKey(item) === cycleKey)
          .sort((a, b) => getDateValue(b?.paymentDate || b?.createdAt) - getDateValue(a?.paymentDate || a?.createdAt));

        const relatedPaymentIds = new Set(
          relatedPayments
            .map((item) => String(item?._id || ''))
            .filter(Boolean)
        );

        const linkedBillings = billings
          .filter((billing) => {
            const billingPaymentId = String(billing?.paymentId || '');
            if (billingPaymentId && relatedPaymentIds.has(billingPaymentId)) return true;
            return getCycleKey(billing) === cycleKey;
          })
          .sort((a, b) => getDateValue(b?.billingDate || b?.createdAt) - getDateValue(a?.billingDate || a?.createdAt));

        const selectedPaymentId = String(payment?._id || '');
        const paymentBillings = billings
          .filter((billing) => String(billing?.paymentId || '') === selectedPaymentId)
          .sort((a, b) => getDateValue(b?.billingDate || b?.createdAt) - getDateValue(a?.billingDate || a?.createdAt));

        const rowPlan = resolvePlanDetailsFromPayment(payment, linkedBillings);
        const financials = resolveFinancials(payment, linkedBillings[0], {
          admissionFee: member?.admissionFee,
          planFee: member?.planFee ?? plan?.price,
          totalAmount: member?.totalAmount,
        });
        const paymentStatus = getPaymentStatus(payment);
        const status = financials.due > 0
          ? { label: 'DUE', className: 'due' }
          : (paymentStatus?.label === 'DUE' ? { label: 'DUE', className: 'due' } : { label: 'PAID', className: 'paid' });

        return {
          key: payment?._id || `payment-${payment?.paymentDate || payment?.createdAt}`,
          cycleKey,
          payment,
          relatedPayments,
          rowPlan,
          linkedBillings,
          paymentBillings,
          admissionFee: financials.admissionFee,
          planFee: financials.planFee,
          tax: financials.tax,
          totalBill: financials.totalBill,
          paidAmount: financials.paid,
          dueAmount: financials.due,
          status,
        };
      });
  }, [payments, billings, member?.totalAmount, planMap]);

  const paymentHistory = useMemo(() => allPaymentEntries.slice(0, 10), [allPaymentEntries]);

  const planHistory = useMemo(() => {
    const grouped = new Map();

    allPaymentEntries.forEach((entry) => {
      const key = `${entry?.cycleKey || ''}__${entry?.rowPlan?.name || 'N/A'}`;
      const existing = grouped.get(key) || {
        planName: entry?.rowPlan?.name || 'N/A',
        startDate: entry?.rowPlan?.startDate || null,
        endDate: entry?.rowPlan?.endDate || null,
        totalAdmissionFee: 0,
        totalPlanFee: 0,
        totalTax: 0,
        totalPaid: 0,
        totalBill: 0,
        paymentsCount: 0,
        billingCount: 0,
        invoiceSet: new Set(),
        transactionPaidSum: 0,
        maxPaidSeen: 0,
        latestDue: null,
        latestDueAt: null,
        lastPaymentDate: null,
      };

      existing.totalAdmissionFee = Math.max(existing.totalAdmissionFee, Number(entry?.admissionFee || 0));
      existing.totalPlanFee = Math.max(existing.totalPlanFee, Number(entry?.planFee || 0));
      existing.totalTax = Math.max(existing.totalTax, Number(entry?.tax || 0));
      existing.totalBill = Math.max(existing.totalBill, Number(entry?.totalBill || 0));
      existing.transactionPaidSum += Number(entry?.paidAmount || 0);
      existing.maxPaidSeen = Math.max(existing.maxPaidSeen, Number(entry?.paidAmount || 0));
      existing.paymentsCount += 1;

      (entry?.linkedBillings || []).forEach((billing) => {
        const invoice = String(billing?.invoiceNumber || billing?._id || '').trim();
        if (invoice) {
          existing.invoiceSet.add(invoice);
        }
      });

      const currentTime = getDateValue(entry?.payment?.paymentDate || entry?.payment?.createdAt);
      const existingTime = getDateValue(existing.lastPaymentDate);
      if (currentTime > existingTime) {
        existing.lastPaymentDate = entry?.payment?.paymentDate || entry?.payment?.createdAt;
      }

      const dueAtCurrentTime = getDateValue(entry?.payment?.paymentDate || entry?.payment?.createdAt);
      const previousDueTime = getDateValue(existing.latestDueAt);
      if (dueAtCurrentTime >= previousDueTime) {
        existing.latestDue = Number(entry?.dueAmount || 0);
        existing.latestDueAt = entry?.payment?.paymentDate || entry?.payment?.createdAt;
      }

      grouped.set(key, existing);
    });

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        billingCount: item.invoiceSet.size,
        totalPaid: (() => {
          const fromLatestDue = item.latestDue !== null
            ? Math.max(Number(item.totalBill || 0) - Number(item.latestDue || 0), 0)
            : 0;
          const fromTransactions = Math.min(Number(item.transactionPaidSum || 0), Number(item.totalBill || 0));
          return Math.max(fromLatestDue, Number(item.maxPaidSeen || 0), fromTransactions);
        })(),
        dueAmount: (() => {
          if (item.latestDue !== null) return Math.max(Number(item.latestDue || 0), 0);
          return Math.max(Number(item.totalBill || 0) - Math.min(Number(item.transactionPaidSum || 0), Number(item.totalBill || 0)), 0);
        })(),
      }))
      .sort((a, b) => getDateValue(b.lastPaymentDate) - getDateValue(a.lastPaymentDate));
  }, [allPaymentEntries]);

  const hasDue = currentDueAmount > 0;
  const actionLabel = hasDue ? 'Clear Due Amount' : 'New Payment';
  const actionHint = hasDue
    ? `Pending amount ${formatCurrency(currentDueAmount)} needs to be cleared.`
    : 'No pending dues. You can add a new payment entry.';

  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/dev';
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(`${basePath}/customers`);
  };

  const handlePrimaryAction = () => {
    if (hasDue) {
      setClearDueForm({
        clearAmount: String(currentDueAmount),
        paymentMethod: 'CASH',
        paymentDate: new Date().toISOString().slice(0, 10),
      });
      setOpenClearDueModal(true);
      return;
    }

    navigate(`${basePath}/payments`, {
      state: {
        member,
        source: 'customer-details',
        mode: 'new-payment',
      },
    });
  };

  const handleClearDueFormChange = (event) => {
    const { name, value } = event.target;
    setClearDueForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleConfirmClearDue = async () => {
    const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
    if (!authToken) {
      toast.error('Missing auth token. Please login again.');
      return;
    }

    const paymentId = duePayment?._id || latestPayment?._id;
    if (!paymentId) {
      toast.error('Unable to find pending payment reference.');
      return;
    }

    const clearAmount = toAmount(clearDueForm?.clearAmount);
    if (clearAmount <= 0) {
      toast.error('Invalid clear amount.');
      return;
    }

    const paymentDate = clearDueForm?.paymentDate;
    if (!paymentDate) {
      toast.error('Payment date is required.');
      return;
    }

    const payload = {
      paymentId,
      clearAmount,
      paymentMethod: String(clearDueForm?.paymentMethod || 'CASH').toUpperCase(),
      paymentDate: new Date(`${paymentDate}T00:00:00.000Z`).toISOString(),
    };

    try {
      setClearDueSubmitting(true);
      const response = await api.patch(CLEAR_DUE_API, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Failed to clear due amount.');
      }

      toast.success('Due amount cleared successfully.');
      setOpenClearDueModal(false);
      navigate(`${basePath}/customers`, { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to clear due amount.');
    } finally {
      setClearDueSubmitting(false);
    }
  };

  const handleOpenBillingModal = (entry) => {
    const selectedPaymentId = String(entry?.payment?._id || '');
    const paymentBillings = billings
      .filter((billing) => String(billing?.paymentId || '') === selectedPaymentId)
      .sort((a, b) => getDateValue(b?.billingDate || b?.createdAt) - getDateValue(a?.billingDate || a?.createdAt));

    const paymentFinancial = resolveFinancials(entry?.payment, paymentBillings[0], {
      admissionFee: entry?.admissionFee ?? member?.admissionFee,
      planFee: entry?.planFee,
      tax: entry?.tax,
      totalAmount: entry?.totalBill,
    });

    setOpenBillingModal({
      ...entry,
      paymentBillings,
      paymentTotalBill: paymentFinancial.totalBill,
      paymentDueAmount: paymentFinancial.due,
      paymentTax: paymentFinancial.tax,
      paymentAdmissionFee: paymentFinancial.admissionFee,
      paymentPlanFee: paymentFinancial.planFee,
      paymentPaidAmount: paymentFinancial.paid,
    });
  };

  const handleDownloadBilling = (billing, rowPlan) => {
    if (!billing) return;

    const payload = {
      invoiceNumber: billing?.invoiceNumber || 'N/A',
      memberName: user?.fullName || 'N/A',
      planName: rowPlan?.name || 'N/A',
      planStartDate: formatDate(rowPlan?.startDate),
      planEndDate: formatDate(rowPlan?.endDate),
      billingDate: formatDate(billing?.billingDate || billing?.createdAt),
      subTotal: billing?.subTotal || 0,
      grandTotal: billing?.grandTotal || 0,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${billing?.invoiceNumber || 'invoice'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSendBilling = (billing, rowPlan) => {
    if (!billing || !user?.email) return;
    const subject = encodeURIComponent(`Invoice ${billing?.invoiceNumber || ''}`);
    const body = encodeURIComponent(
      `Hello ${user?.fullName || 'Member'},\n\n` +
      `Invoice: ${billing?.invoiceNumber || 'N/A'}\n` +
      `Plan: ${rowPlan?.name || 'N/A'}\n` +
      `Plan Start: ${formatDate(rowPlan?.startDate)}\n` +
      `Plan End: ${formatDate(rowPlan?.endDate)}\n` +
      `Billing Date: ${formatDate(billing?.billingDate || billing?.createdAt)}\n` +
      `Grand Total: ${formatCurrency(billing?.grandTotal)}\n\n` +
      `Regards,\nYodha Gym`
    );
    window.open(`mailto:${user.email}?subject=${subject}&body=${body}`, '_blank');
  };

  if (loading) {
    return <div className="customer-details-loading">Loading member details...</div>;
  }

  if (!member) {
    return (
      <div className="customer-details-error">
        <h3>{error || 'Member not found.'}</h3>
        <button type="button" onClick={handleBack}>Back to Customers</button>
      </div>
    );
  }

  return (
    <div className="customer-details-page">
      <div className="details-head">
        <button type="button" className="back-btn" onClick={handleBack}>
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="headline headline-wrap">
          <div className="headline-meta">
            <h2>{user?.fullName || 'Member Details'}</h2>
            <span className="headline-subtext">
              {user?.email || user?.number || 'Yodha Member Profile'}
            </span>
          </div>
          {identityProofArr.length > 0 && (
            <button
              className="view-identity-btn"
              onClick={() => setShowIdentityModal(true)}
            >
              View Identity
            </button>
          )}
        </div>
      </div>

      {/* Identity Proof Modal */}
      {showIdentityModal && (
        <div className="identity-modal-overlay" onClick={() => setShowIdentityModal(false)}>
          <div className="identity-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="identity-modal-head">
              <h3>Identity Proof</h3>
              <button
                type="button"
                className="identity-modal-close"
                onClick={() => setShowIdentityModal(false)}
                aria-label="Close identity proof"
              >
                &times;
              </button>
            </div>
            <div className="identity-modal-grid">
              {identityProofArr.map((img, idx) => (
                <div key={idx} className="identity-proof-item">
                  <img
                    src={img}
                    alt={`Aadhar ${idx + 1}`}
                  />
                  <div className="identity-proof-caption">Aadhar {idx + 1}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className="action-rail">
        <div className="action-message">
          <h4>{actionLabel}</h4>
          <p>{actionHint}</p>
        </div>
        <button type="button" className={`primary-cta ${hasDue ? 'due' : 'fresh'}`} onClick={handlePrimaryAction}>
          <CreditCard size={16} />
          {actionLabel}
        </button>
      </section>

      <section className="details-grid">
        <article className="details-card personal">
          <h3><UserRound size={16} /> Personal Info</h3>
          <div className="details-lines">
            <p><span>Name</span><strong>{user?.fullName || 'N/A'}</strong></p>
            <p><span>Phone</span><strong>{user?.number || 'N/A'}</strong></p>
            <p><span>Email</span><strong>{user?.email || 'N/A'}</strong></p>
            <p><span>Gender</span><strong>{member?.gender || 'N/A'}</strong></p>
            <p><span>DOB</span><strong>{formatDate(user?.dob)}</strong></p>
            <p><span>Address</span><strong>{user?.address || 'N/A'}</strong></p>
            <p><span>Emergency</span><strong>{member?.emergencyContact || 'N/A'}</strong></p>
            <p><span>Joined</span><strong>{formatDate(member?.joiningDate || member?.createdAt)}</strong></p>
            <p><span>Height / Weight</span><strong>{member?.height || 'N/A'} cm / {member?.weight || 'N/A'} kg</strong></p>
          </div>
        </article>

        <article className="details-card plan">
          <div className="card-head">
            <h3><BadgeCheck size={16} /> Plan Details</h3>
            <button
              type="button"
              className="plan-history-btn"
              onClick={() => setOpenPlanHistoryModal(true)}
              title="View Plan History"
              aria-label="Open plan history"
            >
              <History size={15} />
            </button>
          </div>
          <div className="details-lines">
            <p><span>Plan Name</span><strong>{plan?.planName || 'N/A'}</strong></p>
            <p><span>Tag</span><strong>{plan?.tag || 'N/A'}</strong></p>
            <p><span>Plan Fee</span><strong>{formatCurrency(latestFinancial?.planFee ?? member?.planFee ?? plan?.price)}</strong></p>
            <p><span>Tax</span><strong>{formatCurrency(latestFinancial?.tax)}</strong></p>
            <p><span>Paid</span><strong>{formatCurrency(latestFinancial?.paid)}</strong></p>
            <p><span>Due</span><strong>{formatCurrency(latestFinancial?.due)}</strong></p>
            <p><span>Admission Fee</span><strong>{formatCurrency(latestFinancial?.admissionFee ?? member?.admissionFee)}</strong></p>
            <p><span>Total Bill</span><strong>{formatCurrency(latestFinancial?.totalBill || member?.totalAmount)}</strong></p>
            <p><span>Start Date</span><strong>{formatDate(member?.planStartDate)}</strong></p>
            <p><span>End Date</span><strong>{formatDate(member?.planEndDate)}</strong></p>
          </div>
          <div className="validity-box">
            <span className={`validity-tag ${planValidity.className}`}>{planValidity.label}</span>
            <small>{planValidity.hint}</small>
          </div>
        </article>
      </section>

      <section className="finance-highlights">
        <article className="mini-card">
          <p>Current Due</p>
          <h4>{formatCurrency(currentDueAmount)}</h4>
        </article>
        <article className="mini-card">
          <p>Total Paid Till Date</p>
          <h4>{formatCurrency(totalPaidTillDate)}</h4>
        </article>
        <article className="mini-card">
          <p>Latest Invoice</p>
          <h4>{latestBilling?.invoiceNumber || 'N/A'}</h4>
        </article>
      </section>

      <section className="timeline-card">
        <h3><CalendarDays size={16} /> Payment Track (Last 10)</h3>
        {paymentHistory.length > 0 ? (
          <div className="finance-table-shell">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Payment Date</th>
                  <th>Plan</th>
                  <th>Plan Dates</th>
                  <th>Total Bill</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Billings</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((entry) => {
                  const payment = entry?.payment;

                  return (
                    <tr key={entry?.key}>
                      <td>{new Date(payment?.paymentDate || payment?.createdAt || 0).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</td>
                      <td>{formatDate(payment?.paymentDate || payment?.createdAt)}</td>
                      <td>{entry?.rowPlan?.name}</td>
                      <td>
                        <div className="stacked-cell">
                          <small>Start: {formatDate(entry?.rowPlan?.startDate)}</small>
                          <small>End: {formatDate(entry?.rowPlan?.endDate)}</small>
                        </div>
                      </td>
                      <td>
                        <div className="stacked-cell">
                          <small>Admission: {formatCurrency(entry?.admissionFee)}</small>
                          <small>Fee: {formatCurrency(entry?.planFee)}</small>
                          <small>Tax: {formatCurrency(entry?.tax)}</small>
                          <strong>{formatCurrency(entry?.totalBill)}</strong>
                        </div>
                      </td>
                      <td>{formatCurrency(entry?.paidAmount)}</td>
                      <td>{formatCurrency(entry?.dueAmount)}</td>
                      <td>
                        <span className={`mini-status ${entry?.status?.className}`}>
                          {entry?.status?.className === 'due' ? <Clock3 size={12} /> : <BadgeCheck size={12} />}
                          {entry?.status?.label}
                        </span>
                      </td>
                      <td>{payment?.paymentMethod || 'N/A'}</td>
                      <td>{entry?.paymentBillings?.length || 0}</td>
                      <td>
                        <div className="timeline-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => handleOpenBillingModal(entry)}
                            title="View Billing Details"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-note">No payment history available.</div>
        )}
      </section>

      {openBillingModal && (
        <div className="billing-modal-overlay" role="presentation" onClick={() => setOpenBillingModal(null)}>
          <div className="billing-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="billing-modal-head">
              <div>
                <h4>Billing Details For Payment</h4>
                <p>
                  {formatDate(openBillingModal?.payment?.paymentDate || openBillingModal?.payment?.createdAt)} | {openBillingModal?.rowPlan?.name}
                </p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setOpenBillingModal(null)} title="Close">
                <X size={14} />
              </button>
            </div>

            <div className="billing-meta-row">
              <span className="billing-pill">
                <small>Paid Amount</small>
                <strong>{formatCurrency(openBillingModal?.paymentPaidAmount)}</strong>
              </span>
              <span className="billing-pill">
                <small>Pending Due</small>
                <strong>{formatCurrency(openBillingModal?.paymentDueAmount)}</strong>
              </span>
            </div>

            {openBillingModal?.paymentBillings?.length > 0 ? (
              <div className="billing-table-shell">
                <table className="billing-table invoice-detail-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Billing Date</th>
                      <th>Sub Total</th>
                      <th>Grand Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openBillingModal.paymentBillings.map((billing) => (
                      <tr key={billing?._id || billing?.invoiceNumber || billing?.createdAt}>
                        <td>{billing?.invoiceNumber || 'N/A'}</td>
                        <td>{formatDate(billing?.billingDate || billing?.createdAt)}</td>
                        <td>{formatCurrency(billing?.subTotal)}</td>
                        <td>{formatCurrency(billing?.grandTotal)}</td>
                        <td>
                          <div className="billing-row-actions">
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => handleDownloadBilling(billing, openBillingModal?.rowPlan)}
                              title="Download Invoice"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => handleSendBilling(billing, openBillingModal?.rowPlan)}
                              title="Share Invoice"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-note">No billing record linked to this selected payment.</div>
            )}
          </div>
        </div>
      )}

      {openPlanHistoryModal && (
        <div className="billing-modal-overlay" role="presentation" onClick={() => setOpenPlanHistoryModal(false)}>
          <div className="billing-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="billing-modal-head">
              <div>
                <h4>Plan History</h4>
                <p>Track all plans this member has used based on payment records.</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setOpenPlanHistoryModal(false)} title="Close">
                <X size={14} />
              </button>
            </div>

            {planHistory.length > 0 ? (
              <div className="billing-table-shell">
                <table className="billing-table plan-history-table">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Plan Dates</th>
                      <th>Amount Breakdown</th>
                      <th>Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planHistory.map((entry) => {
                      const statusClass = Number(entry?.dueAmount || 0) > 0 ? 'due' : 'paid';
                      const statusLabel = statusClass === 'due' ? 'DUE' : 'GOOD';

                      return (
                        <tr key={`${entry.planName}-${entry.startDate}-${entry.endDate}`}>
                          <td>{entry.planName}</td>
                          <td>
                            <div className="stacked-cell">
                              <small>Start: {formatDate(entry.startDate)}</small>
                              <small>End: {formatDate(entry.endDate)}</small>
                            </div>
                          </td>
                          <td>
                            <div className="stacked-cell">
                              <small>Admission: {formatCurrency(entry.totalAdmissionFee)}</small>
                              <small>Plan Fee: {formatCurrency(entry.totalPlanFee)}</small>
                              <small>Tax: {formatCurrency(entry.totalTax)}</small>
                              <strong>Total Bill: {formatCurrency(entry.totalBill)}</strong>
                            </div>
                          </td>
                          <td>{formatCurrency(entry.dueAmount)}</td>
                          <td>
                            <span className={`mini-status ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-note">No plan history available.</div>
            )}
          </div>
        </div>
      )}

      {openClearDueModal && (
        <div className="billing-modal-overlay" role="presentation" onClick={() => setOpenClearDueModal(false)}>
          <div className="billing-modal clear-due-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="billing-modal-head">
              <div>
                <h4>Clear Due Amount</h4>
                <p>Pending due will be cleared for this payment cycle.</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setOpenClearDueModal(false)} title="Close">
                <X size={14} />
              </button>
            </div>

            <div className="clear-due-grid">
              <label>
                Payment Reference
                <input value={duePayment?._id || latestPayment?._id || 'N/A'} readOnly />
              </label>
              <label>
                Due Amount
                <input name="clearAmount" type="number" value={clearDueForm.clearAmount} readOnly />
              </label>
              <label>
                Payment Method
                <select name="paymentMethod" value={clearDueForm.paymentMethod} onChange={handleClearDueFormChange}>
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">CARD</option>
                </select>
              </label>
              <label>
                Payment Date
                <input name="paymentDate" type="date" value={clearDueForm.paymentDate} onChange={handleClearDueFormChange} />
              </label>
            </div>

            <div className="clear-due-actions">
              <button type="button" className="ghost-btn" onClick={() => setOpenClearDueModal(false)}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleConfirmClearDue} disabled={clearDueSubmitting}>
                {clearDueSubmitting ? 'Clearing...' : 'Confirm Clear Due'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetails;
