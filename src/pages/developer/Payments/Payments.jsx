import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Search,
  Plus,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Clock3,
} from 'lucide-react';
import { toast } from 'react-toastify';
import './Payments.scss';
import { useAuth } from '../../../context/AuthContext';

const PAYMENTS_API = 'http://localhost:5000/api/payments/getallpayment';
const CREATE_PAYMENT_API = 'http://localhost:5000/api/payments/createpayment';
const MEMBERS_API = 'http://localhost:5000/api/members/getallmembers';
const PLANS_API = 'http://localhost:5000/api/plans/getallplans';
const DUE_MEMBER_TOAST_ID = 'payment-due-member-warning';

const normalizeDate = (value) => {
  if (!value) return '';
  const raw = String(value);
  if (raw.includes('T')) return raw.split('T')[0];
  return raw;
};

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

const formatMoneyCompact = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 'INR 0';
  if (amount < 100000) return 'Exact';
  return `INR ${new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount).toUpperCase()}`;
};

const toNumber = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(numeric, 0);
};

const addDaysToDate = (dateStr, days) => {
  if (!dateStr || !Number.isFinite(Number(days))) return '';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + Number(days));
  return date.toISOString().slice(0, 10);
};

const toIsoDateStart = (dateStr) => {
  if (!dateStr) return null;
  const parsed = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const getReadableReceipt = (item, index, currentPage, pageSize) => {
  const explicitReceipt = item?.receiptNumber || item?.invoiceNumber || item?.paymentNumber;
  if (explicitReceipt && !/^[a-f0-9]{24}$/i.test(String(explicitReceipt))) {
    return String(explicitReceipt).toUpperCase();
  }

  const sourceId = String(item?._id || item?.paymentId || '');
  const suffix = sourceId
    ? sourceId.slice(-6).toUpperCase()
    : String((currentPage - 1) * pageSize + index + 1).padStart(6, '0');

  const dateRaw = normalizeDate(item?.paymentDate || item?.createdAt || new Date().toISOString());
  const dateKey = dateRaw ? dateRaw.replace(/-/g, '') : '00000000';
  return `REC-${dateKey.slice(2)}-${suffix}`;
};

const getMemberIdFromRecord = (record) => {
  return String(record?._id || record?.memberId?._id || record?.memberId || '');
};

const getMemberDisplayName = (record) => {
  return record?.userId?.fullName || record?.user?.fullName || record?.fullName || 'Unknown Member';
};

const getMemberDisplayNumber = (record) => {
  return record?.userId?.number || record?.user?.number || record?.number || record?.phone || 'N/A';
};

const getMemberPendingDue = (record) => {
  const paymentList = Array.isArray(record?.payments) ? [...record.payments] : [];
  if (paymentList.length > 0) {
    paymentList.sort(
      (a, b) => new Date(b?.paymentDate || b?.createdAt || 0) - new Date(a?.paymentDate || a?.createdAt || 0)
    );
    const latestDue = toNumber(paymentList[0]?.dueAmount ?? paymentList[0]?.pendingAmount ?? 0);
    if (latestDue > 0) return latestDue;
  }

  return toNumber(record?.dueAmount ?? record?.pendingAmount ?? 0);
};

const getDefaultAddForm = () => {
  const today = new Date().toISOString().slice(0, 10);
  return {
    memberId: '',
    planId: '',
    planStartDate: today,
    planEndDate: '',
    planFee: '',
    amountPaid: '0',
    dueAmount: '0',
    paymentMethod: 'UPI',
    paymentDate: today,
    tax: '0',
  };
};

const Payments = () => {
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(getDefaultAddForm());
  const [customerQuery, setCustomerQuery] = useState('');
  const [showCustomerMenu, setShowCustomerMenu] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);

  const [meta, setMeta] = useState({
    totalRecords: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
    hasNextPage: false,
  });

  const fetchPayments = useCallback(async (page = 1) => {
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
        queryParams.searchFields = 'member.fullName,member.number,member.email,plan.planName,payment.paymentMethod,payment.paymentStatus';
      }

      const response = await axios.get(PAYMENTS_API, {
        params: queryParams,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Unable to fetch payments.');
      }

      const payload = response?.data?.data || response?.data;
      const records = payload?.payments || payload?.records || payload?.items || payload?.data || (Array.isArray(payload) ? payload : []);
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

      setPayments(safeRecords);
      setMeta((prev) => ({
        ...prev,
        totalRecords,
        totalPages,
        currentPage,
        hasNextPage,
      }));
    } catch (error) {
      setPayments([]);
      setErrorMessage(error?.response?.data?.message || error.message || 'Failed to load payment data.');
    } finally {
      setLoading(false);
    }
  }, [meta.pageSize, searchTerm, token]);

  useEffect(() => {
    fetchPayments(meta.currentPage);
  }, [fetchPayments, meta.currentPage]);

  const fetchCustomers = useCallback(async () => {
    const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
    if (!authToken) throw new Error('Missing auth token. Please login again.');

    setCustomersLoading(true);
    try {
      const response = await axios.get(MEMBERS_API, {
        params: { page: 1, limit: 300 },
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const payload = response?.data?.data;
      const records = payload?.members || payload?.payments || payload?.records || payload?.items || (Array.isArray(payload) ? payload : []);
      const safeRecords = Array.isArray(records) ? records : [];
      setCustomers(safeRecords);
    } finally {
      setCustomersLoading(false);
    }
  }, [token]);

  const fetchPlans = useCallback(async () => {
    const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
    if (!authToken) throw new Error('Missing auth token. Please login again.');

    setPlansLoading(true);
    try {
      const response = await axios.get(PLANS_API, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const data = response?.data;
      const list = data?.plans || data?.data || (Array.isArray(data) ? data : []);
      setPlans(Array.isArray(list) ? list : []);
    } finally {
      setPlansLoading(false);
    }
  }, [token]);

  const mappedRows = useMemo(() => {
    return payments.map((item, index) => {
      const memberObj = item?.userId || item?.memberId || item?.member || {};
      const planObj = item?.planId || item?.plan || {};

      const receiptId = getReadableReceipt(item, index, meta.currentPage, meta.pageSize);
      const memberName = memberObj?.fullName || memberObj?.name || item?.fullName || 'Unknown Member';
      const memberNumber = memberObj?.number || memberObj?.phone || 'N/A';
      const planName = planObj?.planName || planObj?.name || item?.planName || 'N/A';
      const method = String(item?.paymentMethod || item?.method || 'N/A').toUpperCase();
      const rawStatus = String(item?.paymentStatus || item?.status || '').toUpperCase();
      const dueAmount = toNumber(item?.dueAmount ?? item?.pendingAmount ?? 0);
      const amountPaid = toNumber(item?.amountPaid ?? item?.paidAmount ?? item?.amount ?? 0);

      const status = rawStatus || (dueAmount > 0 ? 'PENDING' : 'COMPLETED');
      const paymentDate = normalizeDate(item?.paymentDate || item?.createdAt || item?.updatedAt);
      const planStartDate = normalizeDate(item?.planStartDate);
      const planEndDate = normalizeDate(item?.planEndDate);

      return {
        id: String(item?._id || item?.paymentId || `${meta.currentPage}-${index}`),
        receiptId,
        memberName,
        memberNumber,
        planName,
        method,
        paymentDate,
        planStartDate,
        planEndDate,
        amountPaid,
        dueAmount,
        status,
      };
    });
  }, [meta.currentPage, meta.pageSize, payments]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return mappedRows;

    return mappedRows.filter((row) =>
      `${row.receiptId} ${row.memberName} ${row.memberNumber} ${row.planName} ${row.method} ${row.status}`
        .toLowerCase()
        .includes(query)
    );
  }, [mappedRows, searchTerm]);

  const customerOptions = useMemo(() => {
    return customers
      .map((record) => ({
        id: getMemberIdFromRecord(record),
        name: getMemberDisplayName(record),
        number: getMemberDisplayNumber(record),
        pendingDue: getMemberPendingDue(record),
      }))
      .filter((record) => Boolean(record.id));
  }, [customers]);

  const filteredCustomerOptions = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    if (!query) return customerOptions;
    return customerOptions.filter((option) =>
      `${option.name} ${option.number}`.toLowerCase().includes(query)
    );
  }, [customerOptions, customerQuery]);

  const selectedPlan = useMemo(
    () => plans.find((planItem) => String(planItem?._id) === String(addForm.planId)),
    [addForm.planId, plans]
  );

  const totalBillAmount = toNumber(addForm.planFee) + toNumber(addForm.tax);
  const dueAmount = Math.min(toNumber(addForm.dueAmount), totalBillAmount);
  const amountPaid = Math.max(totalBillAmount - dueAmount, 0);

  useEffect(() => {
    if (!showAddModal || !selectedPlan || !addForm.planStartDate) return;

    const computedPlanEnd = addDaysToDate(addForm.planStartDate, Number(selectedPlan.durationInDays || 0));
    const computedPlanFee = String(toNumber(selectedPlan.price));

    setAddForm((prev) => {
      if (prev.planEndDate === computedPlanEnd && prev.planFee === computedPlanFee) return prev;
      return {
        ...prev,
        planEndDate: computedPlanEnd,
        planFee: computedPlanFee,
      };
    });
  }, [addForm.planStartDate, selectedPlan, showAddModal]);

  useEffect(() => {
    if (!showAddModal) return;

    const computedDue = Math.min(toNumber(addForm.dueAmount), totalBillAmount);
    const computedPaid = Math.max(totalBillAmount - computedDue, 0);

    setAddForm((prev) => {
      const nextDue = String(computedDue);
      const nextPaid = String(computedPaid);
      if (prev.dueAmount === nextDue && prev.amountPaid === nextPaid) return prev;
      return {
        ...prev,
        dueAmount: nextDue,
        amountPaid: nextPaid,
      };
    });
  }, [addForm.dueAmount, showAddModal, totalBillAmount]);

  const visibleTotalPages = Math.max(meta.totalPages, meta.currentPage + (meta.hasNextPage ? 1 : 0));
  const canGoPrev = meta.currentPage > 1;
  const canGoNext = meta.hasNextPage || meta.currentPage < visibleTotalPages;

  const goToPage = (pageNumber) => {
    const maxAllowedPage = Math.max(meta.totalPages, meta.currentPage + (meta.hasNextPage ? 1 : 0));
    if (pageNumber < 1 || pageNumber > maxAllowedPage) return;

    setMeta((prev) => {
      if (prev.currentPage === pageNumber) return prev;
      return {
        ...prev,
        currentPage: pageNumber,
      };
    });
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setMeta((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleNumberWheel = (event) => {
    event.currentTarget.blur();
  };

  const openAddModal = async () => {
    setAddForm(getDefaultAddForm());
    setCustomerQuery('');
    setShowCustomerMenu(false);
    setShowAddModal(true);

    try {
      await Promise.all([fetchCustomers(), fetchPlans()]);
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Failed to load customers/plans.');
    }
  };

  const handleAddFormChange = (event) => {
    const { name, value } = event.target;

    setAddForm((prev) => {
      const next = { ...prev, [name]: value };

      const pickedPlan = plans.find((planItem) => String(planItem?._id) === String(name === 'planId' ? value : next.planId));

      if (name === 'planId') {
        if (pickedPlan) {
          const fee = toNumber(pickedPlan.price);
          next.planFee = String(fee);
          next.tax = '0';
          next.dueAmount = '0';
          if (next.planStartDate) {
            next.planEndDate = addDaysToDate(next.planStartDate, Number(pickedPlan.durationInDays || 0));
          }
          next.amountPaid = String(fee);
        } else {
          next.planFee = '';
          next.planEndDate = '';
          next.tax = '0';
          next.dueAmount = '0';
          next.amountPaid = '0';
        }
      }

      if (name === 'planStartDate' && pickedPlan && value) {
        next.planEndDate = addDaysToDate(value, Number(pickedPlan.durationInDays || 0));
      }

      if (name === 'dueAmount') {
        const cappedDue = Math.min(toNumber(value), toNumber(next.planFee) + toNumber(next.tax));
        next.dueAmount = String(cappedDue);
      }

      return next;
    });
  };

  const handleCustomerQueryChange = (event) => {
    const value = event.target.value;
    setCustomerQuery(value);
    setShowCustomerMenu(true);
    setAddForm((prev) => ({
      ...prev,
      memberId: '',
    }));
  };

  const handleCustomerSelect = (option) => {
    if (option.pendingDue > 0) {
      toast.error('Please clear your pending due before creating a new payment.', {
        toastId: DUE_MEMBER_TOAST_ID,
      });
      setCustomerQuery('');
      setAddForm((prev) => ({
        ...prev,
        memberId: '',
      }));
      setShowCustomerMenu(false);
      return;
    }

    setCustomerQuery(`${option.name} (${option.number})`);
    setAddForm((prev) => ({
      ...prev,
      memberId: option.id,
    }));
    setShowCustomerMenu(false);
  };

  const handleCreatePayment = async () => {
    const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
    if (!authToken) {
      toast.error('Missing auth token. Please login again.');
      return;
    }

    if (!addForm.memberId || !addForm.planId || !addForm.planStartDate || !addForm.planEndDate || !addForm.paymentMethod || !addForm.paymentDate) {
      toast.error('Please fill all required payment fields.');
      return;
    }

    const payload = {
      memberId: addForm.memberId,
      planId: addForm.planId,
      planStartDate: toIsoDateStart(addForm.planStartDate),
      planEndDate: toIsoDateStart(addForm.planEndDate),
      planFee: toNumber(addForm.planFee),
      amountPaid,
      dueAmount,
      paymentMethod: String(addForm.paymentMethod).toUpperCase(),
      paymentDate: toIsoDateStart(addForm.paymentDate),
      tax: toNumber(addForm.tax),
    };

    try {
      setSubmitLoading(true);
      const response = await axios.post(CREATE_PAYMENT_API, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Unable to create payment.');
      }

      toast.success('Payment created successfully.');
      setShowAddModal(false);
      setAddForm(getDefaultAddForm());

      if (meta.currentPage === 1) {
        fetchPayments(1);
      } else {
        setMeta((prev) => ({
          ...prev,
          currentPage: 1,
        }));
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Failed to create payment.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="payments-page">
      <header className="payments-header">
        <div>
          <h2 className="payments-title">Payments Control</h2>
          <p className="payments-subtitle">Live payment records with search and pagination.</p>
        </div>
        <button type="button" className="add-payment-btn" onClick={openAddModal}>
          <Plus size={16} />
          Add Payment
        </button>
      </header>

      <section className="payments-table-card">
        <div className="table-tools">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search receipt, member, plan, method, status..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {errorMessage && <div className="payments-error">{errorMessage}</div>}

        <div className="payments-meta">
          <span>
            Showing {meta.totalRecords > 0 ? (meta.currentPage - 1) * meta.pageSize + 1 : 0}-{Math.min(meta.currentPage * meta.pageSize, meta.totalRecords)} of {meta.hasNextPage ? `${meta.totalRecords}+` : meta.totalRecords}
          </span>
        </div>

        <div className="table-shell">
          {loading ? (
            <div className="loader-box">
              <Loader2 className="spinner" size={34} />
              <p>Loading payment records...</p>
            </div>
          ) : (
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Member</th>
                  <th>Plan</th>
                  <th>Method</th>
                  <th>Payment Date</th>
                  <th>Plan Date</th>
                  <th>Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length > 0 ? (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td className="receipt-cell" title={row.receiptId}>{row.receiptId}</td>
                      <td>
                        <div className="member-cell">
                          <strong title={row.memberName}>{row.memberName}</strong>
                          <small title={row.memberNumber}>{row.memberNumber}</small>
                        </div>
                      </td>
                      <td title={row.planName}>{row.planName}</td>
                      <td>{row.method}</td>
                      <td>{formatDate(row.paymentDate)}</td>
                      <td>
                        <div className="plan-date-cell">
                          <small>Start: {formatDate(row.planStartDate)}</small>
                          <small>End: {formatDate(row.planEndDate)}</small>
                        </div>
                      </td>
                      <td>
                        <div className="money-cell" title={formatMoney(row.amountPaid)}>
                          <strong>{formatMoney(row.amountPaid)}</strong>
                          <small>{formatMoneyCompact(row.amountPaid)}</small>
                        </div>
                      </td>
                      <td>
                        <div className="money-cell" title={formatMoney(row.dueAmount)}>
                          <strong>{formatMoney(row.dueAmount)}</strong>
                          <small>{formatMoneyCompact(row.dueAmount)}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`status-tag ${String(row.status).toLowerCase()}`}>
                          {String(row.status).toUpperCase() === 'COMPLETED' ? <BadgeCheck size={13} /> : <Clock3 size={13} />}
                          {String(row.status).toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="no-data">No payments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {!loading && (meta.currentPage > 1 || canGoNext || visibleTotalPages > 1) && (
        <div className="pagination">
          <button type="button" className="nav-btn" disabled={!canGoPrev} onClick={() => goToPage(meta.currentPage - 1)}>
            <ChevronLeft size={16} />
          </button>

          {[...Array(visibleTotalPages)].map((_, index) => (
            <button
              type="button"
              key={index + 1}
              className={`page-num ${meta.currentPage === index + 1 ? 'active' : ''}`}
              onClick={() => goToPage(index + 1)}
            >
              {index + 1}
            </button>
          ))}

          <button type="button" className="nav-btn" disabled={!canGoNext} onClick={() => goToPage(meta.currentPage + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {showAddModal && (
        <div className="add-payment-overlay" role="presentation" onClick={() => setShowAddModal(false)}>
          <div className="add-payment-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h3>Add Payment</h3>
              <button type="button" className="icon-btn" onClick={() => setShowAddModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="add-payment-form">
              <label className="modal-field">
                Customer*
                <div className="searchable-select">
                  <input
                    type="text"
                    value={customerQuery}
                    placeholder={customersLoading ? 'Loading customers...' : 'Type name or number'}
                    onChange={handleCustomerQueryChange}
                    onFocus={() => setShowCustomerMenu(true)}
                    onBlur={() => setTimeout(() => setShowCustomerMenu(false), 140)}
                    disabled={customersLoading}
                  />

                  {showCustomerMenu && !customersLoading && (
                    <div className="searchable-options">
                      {filteredCustomerOptions.length > 0 ? (
                        filteredCustomerOptions.map((option) => (
                          <button
                            type="button"
                            key={option.id}
                            className={`searchable-option ${option.pendingDue > 0 ? 'has-due' : ''}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleCustomerSelect(option)}
                          >
                            <span>{option.name} ({option.number})</span>
                            {option.pendingDue > 0 && <small>Due: {formatMoney(option.pendingDue)}</small>}
                          </button>
                        ))
                      ) : (
                        <div className="searchable-empty">No customer found.</div>
                      )}
                    </div>
                  )}
                </div>
              </label>

              <label className="modal-field">
                Plan*
                <select name="planId" value={addForm.planId} onChange={handleAddFormChange} disabled={plansLoading}>
                  <option value="">{plansLoading ? 'Loading plans...' : 'Select Plan'}</option>
                  {plans.map((planItem) => (
                    <option key={planItem?._id} value={planItem?._id}>
                      {planItem?.planName} ({formatMoney(planItem?.price)})
                    </option>
                  ))}
                </select>
              </label>

              <label className="modal-field">
                Plan Start Date*
                <input name="planStartDate" type="date" value={addForm.planStartDate} onChange={handleAddFormChange} />
              </label>

              <label className="modal-field">
                Plan End Date*
                <input name="planEndDate" type="date" value={addForm.planEndDate} readOnly />
              </label>

              <label className="modal-field">
                Plan Fee*
                <input name="planFee" type="number" value={addForm.planFee} readOnly onWheel={handleNumberWheel} />
              </label>

              <label className="modal-field">
                Tax
                <input name="tax" type="number" value={addForm.tax} onChange={handleAddFormChange} onWheel={handleNumberWheel} />
              </label>

              <label className="modal-field">
                Amount Paid*
                <input name="amountPaid" type="number" value={amountPaid} readOnly onWheel={handleNumberWheel} />
              </label>

              <label className="modal-field">
                Due Amount
                <input name="dueAmount" type="number" value={addForm.dueAmount} onChange={handleAddFormChange} onWheel={handleNumberWheel} />
              </label>

              <label className="modal-field">
                Payment Method*
                <select name="paymentMethod" value={addForm.paymentMethod} onChange={handleAddFormChange}>
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">CARD</option>
                </select>
              </label>

              <label className="modal-field">
                Payment Date*
                <input name="paymentDate" type="date" value={addForm.paymentDate} readOnly />
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleCreatePayment} disabled={submitLoading}>
                {submitLoading ? 'Adding...' : 'Add Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
