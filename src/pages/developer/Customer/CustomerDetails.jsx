// For identity proof modal
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  UserRound,
  CalendarDays,
  CreditCard,
  BadgeCheck,
  Clock3,
  Download,
  Share2,
  X,
} from 'lucide-react';
import './CustomerDetails.scss';
import { useAuth } from '../../../context/AuthContext';
import { uploadFileToCloudinary } from '../../../utils/uploadFileToCloudinary';

const API_URL = '/api/members/getallmembers';
const PLANS_API = '/api/plans/getallplans';
const CREATE_PAYMENT_API = '/api/payments/createpayment';

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatCurrency = (value) => `INR ${Number(value || 0).toLocaleString('en-IN')}`;

const formatBillingMonth = (value) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
};

const formatRupees = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
};

const sanitizePhoneNumber = (value) => {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

const toSafeCloudinaryId = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const toIsoDateStart = (dateStr) => {
  if (!dateStr) return null;
  const parsed = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const addDaysToDate = (dateStr, days) => {
  if (!dateStr || !Number.isFinite(Number(days))) return '';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + Number(days));
  return date.toISOString().slice(0, 10);
};

const resolveMemberId = (value) => String(value?._id || value?.id || value?.memberId || '');

const resolvePlanId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value?._id || value?.id || '');
};

const getDefaultAddForm = (memberId = '', planId = '') => {
  const today = new Date().toISOString().slice(0, 10);
  return {
    memberId,
    planId,
    planStartDate: today,
    planEndDate: '',
    planFee: '',
    paymentMethod: 'UPI',
    paymentDate: today,
  };
};

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
  const isPaid = !raw || ['PAID', 'COMPLETED', 'SUCCESS'].includes(raw);
  return {
    label: isPaid ? 'PAID' : raw,
    className: isPaid ? 'paid' : 'due',
  };
};

const buildPaymentShareText = (entry, memberName = 'Member', receiptUrl = '') => {
  const payment = entry?.payment || {};
  const planName = entry?.rowPlan?.name || 'N/A';
  const billingMonth = formatBillingMonth(payment?.paymentDate || payment?.createdAt);
  const amount = formatRupees(entry?.paidAmount ?? entry?.totalBill ?? 0);

  return [
    '🏋️‍♂️ *YODHA GYM - INVOICE ALERT* 🏋️‍♂️',
    '',
    `Hello ${memberName},`,
    '',
    'Your gym subscription invoice for this month has been successfully generated. Please find the details below:',
    '',
    `📅 *Billing Month:* ${billingMonth}`,
    `💰 *Amount:* ${amount}`,
    '📊 *Status:* Paid / Confirmed',
    '',
    'You can view and download your official digital receipt by clicking the link below:',
    `🔗 ${receiptUrl}`,
    '',
    'Thank you for being a valued member of YODHA GYM! Stay strong, stay fit! 💪🔥',
  ].join('\n');
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
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [addPaymentSubmitting, setAddPaymentSubmitting] = useState(false);
  const [addPaymentForm, setAddPaymentForm] = useState(() => getDefaultAddForm());

  const fetchMemberDetails = useCallback(async (memberIdOverride) => {
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
      const selectedMemberId = memberIdOverride || sessionStorage.getItem('yodha_selected_member_id');
      const found = selectedMemberId
        ? members.find((item) => String(item?._id || item?.id) === String(selectedMemberId))
        : null;

      if (!found) {
        setError('Member details not found.');
        setMember(null);
      } else {
        setMember(found);
        const id = found?._id || found?.id;
        if (id) sessionStorage.setItem('yodha_selected_member_id', id);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch member details.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const stateMember = location.state?.member;
    if (stateMember) {
      setMember(stateMember);
      const id = stateMember?._id || stateMember?.id;
      if (id) sessionStorage.setItem('yodha_selected_member_id', id);
      setLoading(false);
      return;
    }

    fetchMemberDetails();
  }, [fetchMemberDetails, location.state]);

  const fetchPlans = useCallback(async () => {
    try {
      const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
      if (!authToken) {
        setPlans([]);
        setPlanMap({});
        setPlansLoading(false);
        return;
      }

      setPlansLoading(true);
      const response = await api.get(PLANS_API, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const list = response?.data?.plans || response?.data?.data || (Array.isArray(response?.data) ? response.data : []);
      const normalized = Array.isArray(list) ? list : [];
      const map = {};
      normalized.forEach((item) => {
        if (item?._id) {
          map[String(item._id)] = item?.planName || 'N/A';
        }
      });
      setPlans(normalized);
      setPlanMap(map);
    } catch {
      // Plan map is best-effort for historical display.
    } finally {
      setPlansLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

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
          admissionFee: payment?.admissionFee || linkedBillings[0]?.admissionFee || 0,
          planFee: payment?.planFee || payment?.totalBillAmount || linkedBillings[0]?.subTotal || 0,
          totalAmount: payment?.totalBillAmount || linkedBillings[0]?.grandTotal || 0,
        });
        const status = getPaymentStatus(payment);

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

  const paymentHistory = useMemo(() => allPaymentEntries, [allPaymentEntries]);

  const selectedAddPlan = useMemo(
    () => plans.find((planItem) => String(planItem?._id) === String(addPaymentForm.planId)),
    [addPaymentForm.planId, plans]
  );

  // useEffect(() => {
  //   if (!showAddPaymentModal || !selectedAddPlan || !addPaymentForm.planStartDate) return;

  //   const computedPlanEnd = addDaysToDate(addPaymentForm.planStartDate, Number(selectedAddPlan.durationInDays || 0));
  //   const computedPlanFee = String(toAmount(selectedAddPlan.price));

  //   setAddPaymentForm((prev) => {
  //     let hasChange = false;
  //     const next = { ...prev };

  //     if (prev.planEndDate !== computedPlanEnd) {
  //       next.planEndDate = computedPlanEnd;
  //       hasChange = true;
  //     }

  //     if (!prev.planFee || prev.planFee === computedPlanFee) {
  //       if (prev.planFee !== computedPlanFee) {
  //         next.planFee = computedPlanFee;
  //         hasChange = true;
  //       }
  //     }

  //     return hasChange ? next : prev;
  //   });
  // }, [addPaymentForm.planStartDate, selectedAddPlan, showAddPaymentModal]);

  const actionLabel = 'New Payment';
  const actionHint = 'Create a new payment entry for this member.';

  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/dev';
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(`${basePath}/customers`);
  };

  const handlePrimaryAction = () => {
    const memberId = resolveMemberId(member);
    const planId = resolvePlanId(member?.planId) || resolvePlanId(plan);
    setAddPaymentForm(getDefaultAddForm(memberId, planId));
    setShowAddPaymentModal(true);

    if (!plans.length && !plansLoading) {
      fetchPlans().catch(() => {
        toast.error('Failed to load plans. Please try again.');
      });
    }
  };

 const handleAddPaymentChange = (event) => {
    const { name, value } = event.target;

    setAddPaymentForm((prev) => {
      const next = { ...prev, [name]: value };

      // Agar Plan change hua hai
      if (name === 'planId') {
        if (!value) {
          next.planFee = '';
          next.planEndDate = '';
        } else {
          // Jo plan select kiya hai usko find karein
          const selectedPlan = plans.find((p) => String(p?._id) === String(value));
          if (selectedPlan) {
            next.planFee = String(toAmount(selectedPlan.price));
            if (next.planStartDate) {
              next.planEndDate = addDaysToDate(next.planStartDate, Number(selectedPlan.durationInDays || 0));
            }
          }
        }
      }

      // Agar Plan Start Date change hui hai
      if (name === 'planStartDate') {
        if (!value) {
          next.planEndDate = '';
        } else {
          const selectedPlan = plans.find((p) => String(p?._id) === String(prev.planId));
          if (selectedPlan) {
            next.planEndDate = addDaysToDate(value, Number(selectedPlan.durationInDays || 0));
          }
        }
      }

      return next;
    });
  };

  const handleNumberWheel = (event) => {
    event.currentTarget.blur();
  };

  const handleCreatePayment = async () => {
    const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
    if (!authToken) {
      toast.error('Missing auth token. Please login again.');
      return;
    }

    if (!addPaymentForm.memberId || !addPaymentForm.planId || !addPaymentForm.planStartDate || !addPaymentForm.planEndDate || !addPaymentForm.paymentMethod || !addPaymentForm.paymentDate) {
      toast.error('Please fill all required payment fields.');
      return;
    }

    const payload = {
      memberId: addPaymentForm.memberId,
      planId: addPaymentForm.planId,
      planStartDate: toIsoDateStart(addPaymentForm.planStartDate),
      planEndDate: toIsoDateStart(addPaymentForm.planEndDate),
      planFee: toAmount(addPaymentForm.planFee),
      paymentMethod: String(addPaymentForm.paymentMethod).toUpperCase(),
      paymentDate: toIsoDateStart(addPaymentForm.paymentDate),
    };

    try {
      setAddPaymentSubmitting(true);
      const response = await api.post(CREATE_PAYMENT_API, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Unable to create payment.');
      }

      toast.success('Payment created successfully.');
      setShowAddPaymentModal(false);
      await fetchMemberDetails(addPaymentForm.memberId);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create payment.');
    } finally {
      setAddPaymentSubmitting(false);
    }
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

  const fetchPaymentReceiptBlob = async (paymentId) => {
    if (!paymentId) {
      toast.error('Payment ID not found for this record.');
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

      return new Blob([response.data], {
        type: response.headers['content-type'] || 'application/pdf',
      });
    } catch (err) {
      console.error('Receipt download error:', err);
      toast.error(err?.response?.data?.message || 'Failed to download receipt from server.');
      return null;
    }
  };

  const handleDownloadPaymentSnapshot = async (entry) => {
    const receiptBlob = await fetchPaymentReceiptBlob(entry?.payment?._id);
    if (!receiptBlob) return;

    try {
      toast.info('Downloading receipt...');
      const url = URL.createObjectURL(receiptBlob);
      const link = document.createElement('a');
      link.href = url;

      const dateRaw = String(entry?.payment?.paymentDate || entry?.payment?.createdAt || '').slice(0, 10);
      link.download = `receipt-${dateRaw || 'payment'}.pdf`;

      link.click();
      URL.revokeObjectURL(url);
      toast.success('Receipt downloaded successfully.');
    } catch (err) {
      console.error('Receipt download error:', err);
      toast.error(err?.response?.data?.message || 'Failed to download receipt from server.');
    }
  };

  const handleSharePaymentSnapshot = async (entry) => {
    const phoneNumber = sanitizePhoneNumber(user?.number);
    if (!phoneNumber) {
      toast.error('Member phone number not available.');
      return;
    }

    toast.info('Preparing receipt link...');
    const receiptBlob = await fetchPaymentReceiptBlob(entry?.payment?._id);
    if (!receiptBlob) return;

    const receiptSeed = entry?.payment?.receiptNumber || entry?.payment?.paymentNumber || entry?.payment?._id || `payment-${Date.now()}`;
    const safeReceiptId = toSafeCloudinaryId(receiptSeed) || `payment-${Date.now()}`;
    const receiptFileName = `receipt-${safeReceiptId}.pdf`;
    const receiptFile = new File([receiptBlob], receiptFileName, {
      type: receiptBlob.type || 'application/pdf',
    });

    const uploadResult = await uploadFileToCloudinary(receiptFile, {
      folder: 'billing/receipts',
      publicId: `${safeReceiptId}-${Date.now()}`,
      tags: 'billing,receipt',
      resourceType: 'auto',
      returnDeleteToken: false,
    });

    if (!uploadResult?.url) {
      toast.error(uploadResult?.error || 'Failed to upload receipt to Cloudinary.');
      return;
    }

    const message = buildPaymentShareText(entry, user?.fullName || 'Member', uploadResult.url);
    const shareUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    const opened = window.open(shareUrl, '_blank');
    if (opened) {
      opened.opener = null;
      return;
    }
    window.location.href = shareUrl;
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
        <button type="button" className="primary-cta fresh" onClick={handlePrimaryAction}>
          <CreditCard size={16} />
          {actionLabel}
        </button>
      </section>

      <section className="details-grid single-card-mode">
        <article className="details-card compact-card full-width">
          <div className="card-head compact-head plan-head" style={{ flexDirection: 'row', alignItems: 'center' }}>
            <h3><UserRound size={16} /> Member & Plan Overview</h3>
            <div className="plan-validity-inline">
              <span className={`validity-tag ${planValidity.className}`}>{planValidity.label}</span>
              <small>{planValidity.hint}</small>
            </div>
          </div>
          <div className="info-grid unified-grid">
            <div className="info-cell">
              <span>Name</span>
              <strong>{user?.fullName || 'N/A'}</strong>
            </div>
            <div className="info-cell">
              <span>Phone</span>
              <strong>{user?.number || 'N/A'}</strong>
            </div>
            <div className="info-cell">
              <span>Email</span>
              <strong>{user?.email || 'N/A'}</strong>
            </div>
            <div className="info-cell">
              <span>Gender</span>
              <strong>{member?.gender || 'N/A'}</strong>
            </div>
            <div className="info-cell">
              <span>DOB</span>
              <strong>{formatDate(user?.dob)}</strong>
            </div>
            <div className="info-cell">
              <span>Plan Name</span>
              <strong>{plan?.planName || 'N/A'}</strong>
            </div>
            <div className="info-cell">
              <span>Start Date</span>
              <strong>{formatDate(member?.planStartDate)}</strong>
            </div>
            <div className="info-cell">
              <span>End Date</span>
              <strong>{formatDate(member?.planEndDate)}</strong>
            </div>
            <div className="info-cell">
              <span>Total Payable</span>
              <strong>{formatCurrency(latestFinancial?.totalBill || member?.totalAmount)}</strong>
            </div>
            <div className="info-cell">
              <span>Paid Amount</span>
              <strong>{formatCurrency(latestFinancial?.paid)}</strong>
            </div>
            <div className="info-cell">
              <span>Joined</span>
              <strong>{formatDate(member?.joiningDate || member?.createdAt)}</strong>
            </div>
            <div className="info-cell">
              <span>Address</span>
              <strong>{user?.address || 'N/A'}</strong>
            </div>
            <div className="info-cell">
              <span>Emergency</span>
              <strong>{member?.emergencyContact || 'N/A'}</strong>
            </div>
            <div className="info-cell">
              <span>Height / Weight</span>
              <strong>{member?.height || 'N/A'} cm / {member?.weight || 'N/A'} kg</strong>
            </div>
            <div className="info-cell">
              <span>Tag</span>
              <strong>{plan?.tag || 'N/A'}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="timeline-card">
        <h3><CalendarDays size={16} /> Payment Track</h3>
        {paymentHistory.length > 0 ? (
          <div className="finance-table-shell">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Payment Date</th>
                  <th>Plan</th>
                  <th>Plan Dates</th>
                  <th>Plan Fee</th>
                  <th>Paid Amount</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((entry) => {
                  const payment = entry?.payment;

                  return (
                    <tr key={entry?.key}>
                      <td>{formatDate(payment?.paymentDate || payment?.createdAt)}</td>
                      <td>{entry?.rowPlan?.name}</td>
                      <td>
                        <div className="stacked-cell">
                          <small>Start: {formatDate(entry?.rowPlan?.startDate)}</small>
                          <small>End: {formatDate(entry?.rowPlan?.endDate)}</small>
                        </div>
                      </td>
                      <td>{formatCurrency(entry?.planFee)}</td>
                      <td>{formatCurrency(entry?.paidAmount)}</td>
                      <td>
                        <span className={`mini-status ${entry?.status?.className}`}>
                          {entry?.status?.className === 'due' ? <Clock3 size={12} /> : <BadgeCheck size={12} />}
                          {entry?.status?.label}
                        </span>
                      </td>
                      <td>{payment?.paymentMethod || 'N/A'}</td>
                      <td>
                        <div className="timeline-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => handleDownloadPaymentSnapshot(entry)}
                            title="Download Summary"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => handleSharePaymentSnapshot(entry)}
                            title="Share Receipt"
                          >
                            <Share2 size={14} />
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

      {showAddPaymentModal && (
        <div className="add-payment-overlay" role="presentation" onClick={() => setShowAddPaymentModal(false)}>
          <div className="add-payment-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h3>Add Payment</h3>
              <button type="button" className="icon-btn" onClick={() => setShowAddPaymentModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="add-payment-summary">
              <div>
                <span>Member</span>
                <strong>{user?.fullName || 'N/A'}</strong>
                <small>{user?.number || user?.email || 'N/A'}</small>
              </div>
            </div>

            <div className="add-payment-form">
              <label className="modal-field">
                Plan*
                <select name="planId" value={addPaymentForm.planId} onChange={handleAddPaymentChange} disabled={plansLoading}>
                  <option value="">{plansLoading ? 'Loading plans...' : 'Select Plan'}</option>
                  {plans.map((planItem) => (
                    <option key={planItem?._id} value={planItem?._id}>
                      {planItem?.planName} ({formatCurrency(planItem?.price)})
                    </option>
                  ))}
                </select>
              </label>

              <label className="modal-field">
                Plan Start Date*
                <input name="planStartDate" type="date" value={addPaymentForm.planStartDate} onChange={handleAddPaymentChange} />
              </label>

              <label className="modal-field">
                Plan End Date*
                <input name="planEndDate" type="date" value={addPaymentForm.planEndDate} readOnly />
              </label>

              <label className="modal-field">
                Plan Fee*
                <input
                  name="planFee"
                  type="number"
                  value={addPaymentForm.planFee}
                  onChange={handleAddPaymentChange}
                  onWheel={handleNumberWheel}
                />
              </label>

              <label className="modal-field">
                Payment Method*
                <select name="paymentMethod" value={addPaymentForm.paymentMethod} onChange={handleAddPaymentChange}>
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">CARD</option>
                </select>
              </label>

              <label className="modal-field">
                Payment Date*
                <input name="paymentDate" type="date" value={addPaymentForm.paymentDate} onChange={handleAddPaymentChange} />
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setShowAddPaymentModal(false)}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleCreatePayment} disabled={addPaymentSubmitting}>
                {addPaymentSubmitting ? 'Adding...' : 'Add Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerDetails;
