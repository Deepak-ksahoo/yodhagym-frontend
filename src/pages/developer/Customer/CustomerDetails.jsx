import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../../utils/api";
import { toast } from "react-toastify";
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
} from "lucide-react";
import "./CustomerDetails.scss";
import { useAuth } from "../../../context/AuthContext";
import { uploadFileToCloudinary } from "../../../utils/uploadFileToCloudinary";

const API_URL = "/api/members/getallmembers";
const PLANS_API = "/api/plans/getallplans";
const CREATE_PAYMENT_API = "/api/payments/createpayment";
const CLEAR_DUE_PAYMENT_API = "/api/payments/clearduepayment";

const formatDate = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value) =>
  `INR ${Number(value || 0).toLocaleString("en-IN")}`;

const formatRupees = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "₹0";
  return `₹${amount.toLocaleString("en-IN")}`;
};

const sanitizePhoneNumber = (value) => {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("0"))
    return `91${digits.slice(1)}`;
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

const toIsoDateStart = (dateStr) => {
  if (!dateStr) return null;
  const parsed = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const addDaysToDate = (dateStr, days) => {
  if (!dateStr || !Number.isFinite(Number(days))) return "";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + Number(days));
  return date.toISOString().slice(0, 10);
};

const resolveMemberId = (value) =>
  String(value?._id || value?.id || value?.memberId || "");
const resolvePlanId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value?._id || value?.id || "");
};

const getDefaultAddForm = (memberId = "", planId = "") => {
  const today = new Date().toISOString().slice(0, 10);
  return {
    memberId,
    planId,
    planStartDate: today,
    planEndDate: "",
    planFee: "",
    paidAmount: "",
    dueAmount: "0",
    paymentMethod: "UPI",
    paymentDate: today,
  };
};

const getDateValue = (value) => new Date(value || 0).getTime();

const toAmount = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(numeric, 0);
};

const getPaymentStatus = (dueAmount) => {
  const hasDue = Number(dueAmount || 0) > 0;
  return {
    label: hasDue ? "PARTIAL" : "PAID",
    className: hasDue ? "due" : "paid",
  };
};

const CustomerDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [member, setMember] = useState(location.state?.member || null);
  const [loading, setLoading] = useState(!location.state?.member);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [addPaymentSubmitting, setAddPaymentSubmitting] = useState(false);
  const [addPaymentForm, setAddPaymentForm] = useState(() =>
    getDefaultAddForm(),
  );
  const [showIdentityModal, setShowIdentityModal] = useState(false);

  const [showClearDueModal, setShowClearDueModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [clearingDue, setClearingDue] = useState(false);

  const fetchMemberDetails = useCallback(
    async (memberIdOverride) => {
      setLoading(true);
      try {
        const authToken = (
          token ||
          localStorage.getItem("yodha_token") ||
          ""
        ).trim();
        if (!authToken)
          throw new Error("Missing auth token. Please login again.");

        const response = await api.get(`${API_URL}?page=1&limit=250`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        const payload = response?.data?.data;
        const members =
          payload?.members || payload?.records || payload?.items || [];
        const selectedMemberId =
          memberIdOverride ||
          sessionStorage.getItem("yodha_selected_member_id");
        const found = members.find(
          (item) => String(item?._id || item?.id) === String(selectedMemberId),
        );

        if (!found) {
          setMember(null);
        } else {
          setMember(found);
          const id = found?._id || found?.id;
          if (id) sessionStorage.setItem("yodha_selected_member_id", id);
        }
      } catch (err) {
        toast.error("Failed to fetch member details.");
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    const stateMember = location.state?.member;
    if (stateMember) {
      setMember(stateMember);
      const id = stateMember?._id || stateMember?.id;
      if (id) sessionStorage.setItem("yodha_selected_member_id", id);
      setLoading(false);
      return;
    }
    fetchMemberDetails();
  }, [fetchMemberDetails, location.state]);

  const fetchPlans = useCallback(async () => {
    try {
      const authToken = (
        token ||
        localStorage.getItem("yodha_token") ||
        ""
      ).trim();
      if (!authToken) return;

      setPlansLoading(true);
      const response = await api.get(PLANS_API, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const list =
        response?.data?.plans ||
        response?.data?.data ||
        (Array.isArray(response?.data) ? response.data : []);
      setPlans(Array.isArray(list) ? list : []);
    } catch {
      toast.error("Failed to load plans.");
    } finally {
      setPlansLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // MOVED THESE FUNCTIONS INSIDE THE COMPONENT
  const handleOpenClearDueModal = (payment) => {
    setSelectedPayment(payment);
    setShowClearDueModal(true);
  };

  const handleClearDuePayment = async () => {
    if (!selectedPayment?._id) {
      toast.error("Payment not found.");
      return;
    }

    const authToken = (
      token ||
      localStorage.getItem("yodha_token") ||
      ""
    ).trim();

    if (!authToken) {
      toast.error("Missing auth token.");
      return;
    }

    try {
      setClearingDue(true);

      const response = await api.patch(
        CLEAR_DUE_PAYMENT_API,
        {
          paymentId: selectedPayment._id,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (!response?.data?.success) {
        throw new Error(
          response?.data?.message || "Unable to clear due payment.",
        );
      }

      toast.success("Due amount cleared successfully.");

      setShowClearDueModal(false);
      setSelectedPayment(null);

      await fetchMemberDetails(resolveMemberId(member));
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to clear due amount.",
      );
    } finally {
      setClearingDue(false);
    }
  };

  const payments = useMemo(() => {
    if (!Array.isArray(member?.payments)) return [];
    return [...member.payments].sort(
      (a, b) =>
        getDateValue(b?.paymentDate || b?.createdAt) -
        getDateValue(a?.paymentDate || a?.createdAt),
    );
  }, [member]);

  const user = member?.userId || {};
  const identityProofArr = Array.isArray(user?.identityProof)
    ? user.identityProof
    : [];
  const plan = member?.planId || {};

  const handleBack = () => {
    const basePath = location.pathname.startsWith("/admin") ? "/admin" : "/dev";
    navigate(`${basePath}/customers`);
  };

  const handlePrimaryAction = () => {
    const memberId = resolveMemberId(member);
    const planId = resolvePlanId(member?.planId) || resolvePlanId(plan);
    const defaultForm = getDefaultAddForm(memberId, planId);

    if (planId && plans.length > 0) {
      const selectedPlan = plans.find((p) => String(p?._id) === String(planId));
      if (selectedPlan) {
        defaultForm.planFee = String(toAmount(selectedPlan.price));
        defaultForm.paidAmount = defaultForm.planFee;
        defaultForm.dueAmount = "0";
        defaultForm.planEndDate = addDaysToDate(
          defaultForm.planStartDate,
          Number(selectedPlan.durationInDays || 0),
        );
      }
    }

    setAddPaymentForm(defaultForm);
    setShowAddPaymentModal(true);
    if (!plans.length && !plansLoading) {
      fetchPlans();
    }
  };

  const handleAddPaymentChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === "planFee" || name === "paidAmount" || name === "dueAmount") {
      if (value === "") {
        nextValue = "";
      } else if (!value.startsWith("0.")) {
        nextValue = value.replace(/^0+/, "") || "0";
      }
    }

    setAddPaymentForm((prev) => {
      const next = { ...prev, [name]: nextValue };

      if (name === "planId") {
        if (!value) {
          next.planFee = "";
          next.paidAmount = "";
          next.planEndDate = "";
          next.dueAmount = "0";
        } else {
          const selectedPlan = plans.find(
            (p) => String(p?._id) === String(value),
          );
          if (selectedPlan) {
            const today = new Date().toISOString().slice(0, 10);
            next.planStartDate = today;
            next.planEndDate = addDaysToDate(
              today,
              Number(selectedPlan.durationInDays || 0),
            );
            next.planFee = String(toAmount(selectedPlan.price));
            next.paidAmount = next.planFee;
            next.dueAmount = "0";
          }
        }
      }

      if (name === "planStartDate") {
        if (!value) {
          next.planEndDate = "";
        } else {
          const selectedPlan = plans.find(
            (p) => String(p?._id) === String(prev.planId),
          );
          if (selectedPlan) {
            next.planEndDate = addDaysToDate(
              value,
              Number(selectedPlan.durationInDays || 0),
            );
          }
        }
      }

      if (name === "planFee" || name === "paidAmount") {
        const fee = Number(next.planFee || 0);
        const paid = Number(next.paidAmount || 0);
        next.dueAmount = String(Math.max(0, fee - paid));
      }

      if (name === "dueAmount") {
        const fee = Number(next.planFee || 0);
        const due = Number(next.dueAmount || 0);
        next.paidAmount = String(Math.max(0, fee - due));
      }

      return next;
    });
  };

  const handleNumberWheel = (event) => {
    event.currentTarget.blur();
  };

  const handleCreatePayment = async () => {
    const authToken = (
      token ||
      localStorage.getItem("yodha_token") ||
      ""
    ).trim();
    if (!authToken) {
      toast.error("Missing auth token. Please login again.");
      return;
    }

    if (
      !addPaymentForm.memberId ||
      !addPaymentForm.planId ||
      !addPaymentForm.planStartDate ||
      !addPaymentForm.planEndDate ||
      !addPaymentForm.paymentMethod ||
      !addPaymentForm.paymentDate
    ) {
      toast.error("Please fill all required payment fields.");
      return;
    }

    const payload = {
      memberId: addPaymentForm.memberId,
      planId: addPaymentForm.planId,
      planStartDate: toIsoDateStart(addPaymentForm.planStartDate),
      planEndDate: toIsoDateStart(addPaymentForm.planEndDate),
      planFee: toAmount(addPaymentForm.planFee),
      dueAmount: toAmount(addPaymentForm.dueAmount),
      paymentMethod: String(addPaymentForm.paymentMethod).toUpperCase(),
      paymentDate: toIsoDateStart(addPaymentForm.paymentDate),
    };

    try {
      setAddPaymentSubmitting(true);
      const response = await api.post(CREATE_PAYMENT_API, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Unable to create payment.");
      }

      toast.success("Payment created successfully.");
      setShowAddPaymentModal(false);
      await fetchMemberDetails(addPaymentForm.memberId);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create payment.",
      );
    } finally {
      setAddPaymentSubmitting(false);
    }
  };

  const fetchPaymentReceiptBlob = async (paymentId) => {
    if (!paymentId) return null;
    const authToken = (
      token ||
      localStorage.getItem("yodha_token") ||
      ""
    ).trim();
    try {
      const response = await api.post(
        "/api/payment/receipt",
        { paymentId: String(paymentId) },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          responseType: "blob",
        },
      );
      return new Blob([response.data], {
        type: response.headers["content-type"] || "application/pdf",
      });
    } catch {
      toast.error("Failed to fetch invoice.");
      return null;
    }
  };

  const handleDownloadPaymentSnapshot = async (payItem) => {
    const receiptBlob = await fetchPaymentReceiptBlob(payItem?._id);
    if (!receiptBlob) return;
    const url = URL.createObjectURL(receiptBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${String(payItem?.paymentDate || "").slice(0, 10)}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSharePaymentSnapshot = async (payItem) => {
    const phoneNumber = sanitizePhoneNumber(user?.number);
    if (!phoneNumber) {
      toast.error("Phone number unavailable.");
      return;
    }

    const receiptBlob = await fetchPaymentReceiptBlob(payItem?._id);
    if (!receiptBlob) return;

    const receiptFile = new File([receiptBlob], `receipt-${payItem._id}.pdf`, {
      type: "application/pdf",
    });
    const uploadResult = await uploadFileToCloudinary(receiptFile, {
      folder: "billing/receipts",
    });

    if (!uploadResult?.url) {
      toast.error("Cloudinary transfer error.");
      return;
    }

    const msg = encodeURIComponent(
      `🏋️‍♂️ *YODHA GYM RECEIPT* 🏋️‍♂️\n\nHello ${user.fullName || "Member"},\n\nYour payment of ${formatRupees(payItem.amountPaid)} has been recorded.\nDue Remaining: ${formatRupees(payItem.dueAmount)}\nDownload Receipt: ${uploadResult.url}`,
    );
    window.open(`https://wa.me/${phoneNumber}?text=${msg}`, "_blank");
  };

  const getPlanValidity = (startDate, endDate) => {
    if (!endDate)
      return { label: "N/A", className: "unknown", hint: "No end date" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0)
      return { label: "CLOSED", className: "closed", hint: "Plan ended" };
    return {
      label: "ACTIVE",
      className: "active",
      hint: `${daysLeft} day(s) left`,
    };
  };

  const planValidity = getPlanValidity(
    member?.planStartDate,
    member?.planEndDate,
  );

  return (
    <div className="customer-details-page">
      <div className="details-head">
        <button type="button" className="back-btn" onClick={handleBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="headline headline-wrap">
          <div className="headline-meta">
            <h2>{user?.fullName || "Member Details"}</h2>
            <span className="headline-subtext">
              {user?.email || user?.number || "Profile View"}
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

      {showIdentityModal && (
        <div
          className="identity-modal-overlay"
          onClick={() => setShowIdentityModal(false)}
        >
          <div
            className="identity-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="identity-modal-head">
              <h3>Identity Document Preview</h3>
              <button
                type="button"
                className="identity-modal-close"
                onClick={() => setShowIdentityModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="identity-modal-grid">
              {identityProofArr.map((img, idx) => (
                <div key={idx} className="identity-proof-item">
                  <img src={img} alt="Document" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className="action-rail">
        <button
          type="button"
          className="primary-cta fresh"
          onClick={handlePrimaryAction}
        >
          <CreditCard size={16} /> New Payment (Renew)
        </button>
      </section>

      <section className="details-grid single-card-mode">
        <article className="details-card compact-card full-width">
          <div className="card-head compact-head plan-head">
            <h3>
              <UserRound size={16} /> Member & Plan Overview
            </h3>
            <div className="plan-validity-inline">
              <span className={`validity-tag ${planValidity.className}`}>
                {planValidity.label}
              </span>
              <small>{planValidity.hint}</small>
            </div>
          </div>
          <div className="info-grid unified-grid">
            <div className="info-cell">
              <span>Name</span>
              <strong>{user?.fullName || "N/A"}</strong>
            </div>
            <div className="info-cell">
              <span>Phone</span>
              <strong>{user?.number || "N/A"}</strong>
            </div>
            <div className="info-cell">
              <span>Email</span>
              <strong>{user?.email || "N/A"}</strong>
            </div>
            <div className="info-cell">
              <span>Gender</span>
              <strong>{member?.gender || "N/A"}</strong>
            </div>
            <div className="info-cell">
              <span>DOB</span>
              <strong>{formatDate(user?.dob)}</strong>
            </div>
            <div className="info-cell">
              <span>Plan Component</span>
              <strong>{plan?.planName || "N/A"}</strong>
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
              <span>Current Status Due</span>
              <strong>{formatCurrency(member?.dueAmount || 0)}</strong>
            </div>
            <div className="info-cell">
              <span>Total Package Value</span>
              <strong>{formatCurrency(member?.totalAmount || 0)}</strong>
            </div>
            <div className="info-cell">
              <span>Address</span>
              <strong>{user?.address || "N/A"}</strong>
            </div>
            <div className="info-cell">
              <span>Emergency Call</span>
              <strong>{member?.emergencyContact || "N/A"}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="timeline-card">
        <h3>
          <CalendarDays size={16} /> Payment Track Record
        </h3>
        {payments.length > 0 ? (
          <div className="finance-table-shell">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Payment Date</th>
                  <th>Duration Period</th>
                  <th>Total Amount</th>
                  <th>Paid Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const statusInfo = getPaymentStatus(p.dueAmount);
                  return (
                    <tr key={p._id}>
                      <td>{formatDate(p.paymentDate || p.createdAt)}</td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            fontSize: "0.85rem",
                          }}
                        >
                          <span>S: {formatDate(p.planStartDate)}</span>
                          <span>E: {formatDate(p.planEndDate)}</span>
                        </div>
                      </td>
                      <td>{formatCurrency(p.totalBillAmount)}</td>
                      <td>{formatCurrency(p.amountPaid)}</td>
                      <td>{formatCurrency(p.dueAmount)}</td>
                      <td>
                        {statusInfo.className === "due" ? (
                          <button
                            type="button"
                            onClick={() => handleOpenClearDueModal(p)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor: "#fff3cd", // Light warning yellow
                              color: "#856404", // Dark warning text
                              border: "1px solid #ffeeba",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "0.8rem",
                              fontWeight: "bold",
                              cursor: "pointer",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            }}
                          >
                            <Clock3 size={12} />
                            {statusInfo.label}
                          </button>
                        ) : (
                          <span
                            className={`mini-status ${statusInfo.className}`}
                          >
                            <BadgeCheck size={12} />
                            {statusInfo.label}
                          </span>
                        )}
                      </td>
                      <td>{p.paymentMethod || "CASH"}</td>
                      <td>
                        <div className="timeline-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => handleDownloadPaymentSnapshot(p)}
                          >
                            <Download size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => handleSharePaymentSnapshot(p)}
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
          <div className="empty-note">No payment logs captured.</div>
        )}
      </section>

      {showAddPaymentModal && (
        <div
          className="add-payment-overlay"
          onClick={() => setShowAddPaymentModal(false)}
        >
          <div
            className="add-payment-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3>Add Next Renewal Payment</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowAddPaymentModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="add-payment-form">
              <label className="modal-field">
                Plan Component*
                <select
                  name="planId"
                  value={addPaymentForm.planId}
                  onChange={handleAddPaymentChange}
                >
                  <option value="">Select Target Plan</option>
                  <option
                    disabled
                    style={{ fontStyle: "italic", color: "#999" }}
                  >
                    -- Loading/Select Plans --
                  </option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.planName} (₹{p.price})
                    </option>
                  ))}
                </select>
              </label>
              <label className="modal-field">
                Plan Start Date*
                <input
                  name="planStartDate"
                  type="date"
                  value={addPaymentForm.planStartDate}
                  onChange={handleAddPaymentChange}
                />
              </label>
              <label className="modal-field">
                Calculated End Date*
                <input
                  name="planEndDate"
                  type="date"
                  value={addPaymentForm.planEndDate}
                  onChange={handleAddPaymentChange}
                />
              </label>

              <label className="modal-field">
                Total Base Fee*
                <input
                  name="planFee"
                  type="number"
                  value={addPaymentForm.planFee}
                  onChange={handleAddPaymentChange}
                  onWheel={handleNumberWheel}
                />
              </label>
              <label className="modal-field">
                Amount Paid*
                <input
                  name="paidAmount"
                  type="number"
                  value={addPaymentForm.paidAmount}
                  onChange={handleAddPaymentChange}
                  onWheel={handleNumberWheel}
                />
              </label>
              <label className="modal-field">
                Due Amount
                <input
                  name="dueAmount"
                  type="number"
                  value={addPaymentForm.dueAmount}
                  onChange={handleAddPaymentChange}
                  onWheel={handleNumberWheel}
                />
              </label>

              <label className="modal-field">
                Payment Method*
                <select
                  name="paymentMethod"
                  value={addPaymentForm.paymentMethod}
                  onChange={handleAddPaymentChange}
                >
                  <option value="UPI">UPI</option>
                  <option value="CASH">CASH</option>
                  <option value="CARD">CARD</option>
                </select>
              </label>
              <label className="modal-field">
                Transaction Date*
                <input
                  name="paymentDate"
                  type="date"
                  value={addPaymentForm.paymentDate}
                  onChange={handleAddPaymentChange}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowAddPaymentModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleCreatePayment}
                disabled={addPaymentSubmitting}
              >
                {addPaymentSubmitting ? "Processing..." : "Save Payment Logs"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearDueModal && (
        <div
          className="add-payment-overlay"
          onClick={() => {
            if (!clearingDue) {
              setShowClearDueModal(false);
              setSelectedPayment(null);
            }
          }}
        >
          <div
            className="add-payment-modal"
            style={{ maxWidth: "420px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h3>Clear Due Amount</h3>

              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  if (!clearingDue) {
                    setShowClearDueModal(false);
                    setSelectedPayment(null);
                  }
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                padding: "20px",
                textAlign: "center",
              }}
            >
              <p>Are you sure you want to clear this due amount?</p>

              <h2 style={{ marginTop: "10px" }}>
                {formatCurrency(selectedPayment?.dueAmount)}
              </h2>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="ghost-btn"
                disabled={clearingDue}
                onClick={() => {
                  setShowClearDueModal(false);
                  setSelectedPayment(null);
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-btn"
                disabled={clearingDue}
                onClick={handleClearDuePayment}
              >
                {clearingDue ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetails;
