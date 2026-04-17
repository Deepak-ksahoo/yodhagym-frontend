
import React, { useEffect, useState } from 'react';
import { PlusCircle, Pencil, Trash2, Sparkles, X, AlertTriangle } from 'lucide-react';
import './Plans.scss';
import { useAuth } from '../../../context/AuthContext';

const API_BASE = 'http://localhost:5000/api/plans';

const defaultForm = {
  planName: '',
  price: '',
  originalPrice: '',
  durationInDays: '',
  perDayPrice: '',
  tag: '',
  features: '', // comma separated
};

const Plans = () => {
  const { token } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [error, setError] = useState('');

  // Fetch all plans
  const fetchPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/getallplans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch plans');
      const data = await res.json();
      const list = data?.plans || data?.data || (Array.isArray(data) ? data : []);
      setPlans(list);
    } catch (err) {
      setError('Could not load plans.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      fetchPlans();
    } else {
      setLoading(false);
    }
  }, [token]);

  const formatCurrency = (value) => {
    const num = Number(value || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const totalPlans = plans.length;
  const bestDiscountPercent = totalPlans
    ? Math.max(
      ...plans.map((item) => {
        const original = Number(item.originalPrice || 0);
        const price = Number(item.price || 0);
        if (!original || original <= price) return 0;
        return Math.round(((original - price) / original) * 100);
      })
    )
    : 0;
  const bestValue = totalPlans
    ? Math.min(...plans.map((item) => Number(item.perDayPrice || Number(item.price || 0))))
    : 0;

  // Handle form input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Open modal for add/edit
  const openModal = (plan = null) => {
    if (plan) {
      setForm({
        planName: plan.planName || '',
        price: plan.price || '',
        originalPrice: plan.originalPrice || '',
        durationInDays: plan.durationInDays || '',
        perDayPrice: plan.perDayPrice || '',
        tag: plan.tag || '',
        features: plan.features?.join(', ') || '',
      });
      setEditId(plan._id || plan.id);
    } else {
      setForm(defaultForm);
      setEditId(null);
    }
    setShowModal(true);
  };

  // Add or update plan
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      ...form,
      price: Number(form.price),
      originalPrice: Number(form.originalPrice),
      durationInDays: Number(form.durationInDays),
      perDayPrice: Number(form.perDayPrice),
      features: form.features.split(',').map(f => f.trim()).filter(Boolean),
    };
    try {
      let res;
      if (editId) {
        res = await fetch(`${API_BASE}/updateplan`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: editId, ...payload }),
        });
      } else {
        res = await fetch(`${API_BASE}/createplans`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error('Failed to save plan');
      setShowModal(false);
      fetchPlans();
    } catch (err) {
      setError('Could not save plan.');
    }
  };

  // Delete plan
  const handleDelete = async (id) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setError('');
    try {
      const res = await fetch(`${API_BASE}/deleteplan`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: deleteTargetId }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      setDeleteTargetId(null);
      fetchPlans();
    } catch (err) {
      setError('Could not delete plan.');
    }
  };

  return (
    <div className="plans-page">
      <header className="plans-header">
        <div className="plans-headline">
          <h2 className="plans-title">Plans & Packages</h2>
        </div>
        <button type="button" className="add-plan" onClick={() => openModal()}>
          <PlusCircle size={18} />
          Add Plan
        </button>
      </header>

      <section className="plans-kpis">
        <article className="kpi-card">
          <p>Total Plans</p>
          <h4>{totalPlans}</h4>
        </article>
        <article className="kpi-card">
          <p>Best Discount</p>
          <h4>{bestDiscountPercent > 0 ? `${bestDiscountPercent}% OFF` : 'No Offer'}</h4>
        </article>
        <article className="kpi-card">
          <p>Best Per Day</p>
          <h4>{formatCurrency(bestValue)}</h4>
        </article>
      </section>

      {error && <div className="plans-error">{error}</div>}

      {loading ? (
        <section className="plans-grid plans-loading">
          {[1, 2, 3].map((item) => (
            <article key={item} className="plan-card skeleton-card" />
          ))}
        </section>
      ) : (
        <section className="plans-grid">
          {plans.length === 0 ? (
            <div className="plans-empty">No plans found.</div>
          ) : (
            plans.map((plan) => (
              <article key={plan._id || plan.id} className="plan-card">
                <div className="plan-glow" />
                <div className="plan-top">
                  <div className="plan-heading">
                    <span className="plan-badge">
                      <Sparkles size={14} />
                      {plan.tag || plan.highlight}
                    </span>
                    <h3>{plan.planName}</h3>
                  </div>
                  <div className="plan-price-wrap">
                    <div className="plan-price">{formatCurrency(plan.price)}</div>
                    {Number(plan.originalPrice) > Number(plan.price) && (
                      <div className="plan-original">{formatCurrency(plan.originalPrice)}</div>
                    )}
                  </div>
                </div>

                <div className="plan-meta">
                  <span>{plan.durationInDays} days</span>
                  <span>{formatCurrency(plan.perDayPrice)}/day</span>
                </div>

                {Number(plan.originalPrice) > Number(plan.price) && (
                  <div className="plan-savings">
                    Save {formatCurrency(Number(plan.originalPrice) - Number(plan.price))}
                  </div>
                )}

                <ul className="plan-features">
                  {plan.features?.map((item, idx) => (
                    <li key={idx}>
                      <span className="feature-dot" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="plan-actions">
                  <button type="button" className="ghost" onClick={() => openModal(plan)}>
                    <Pencil size={16} />
                    Edit
                  </button>
                  <button type="button" className="danger" onClick={() => handleDelete(plan._id || plan.id)}>
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {/* Modal for Add/Edit Plan */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal plan-modal">
            <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            <h3 className="modal-title">{editId ? 'Edit Plan' : 'Add Plan'}</h3>
            <form onSubmit={handleSubmit} className="plan-form plan-form-grid">
              <div className="form-row">
                <label>Plan Name</label>
                <input name="planName" value={form.planName} onChange={handleChange} required />
              </div>
              <div className="form-row">
                <label>Price (₹)</label>
                <input name="price" type="number" value={form.price} onChange={handleChange} required />
              </div>
              <div className="form-row">
                <label>Original Price (₹)</label>
                <input name="originalPrice" type="number" value={form.originalPrice} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label>Duration (days)</label>
                <input name="durationInDays" type="number" value={form.durationInDays} onChange={handleChange} required />
              </div>
              <div className="form-row">
                <label>Per Day Price (₹)</label>
                <input name="perDayPrice" type="number" value={form.perDayPrice} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label>Tag</label>
                <input name="tag" value={form.tag} onChange={handleChange} />
              </div>
              <div className="form-row form-row-full">
                <label>
                  Features
                  <span className="label-hint">(comma separated)</span>
                </label>
                <input name="features" value={form.features} onChange={handleChange} placeholder="e.g. Full gym access, Cardio zone access" />
              </div>
              <div className="modal-actions">
                <button type="submit" className="add-plan modal-submit">{editId ? 'Update' : 'Add'} Plan</button>
                <button type="button" className="ghost modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTargetId && (
        <div className="modal-overlay">
          <div className="modal delete-modal">
            <div className="delete-icon-wrap">
              <AlertTriangle size={20} />
            </div>
            <h3 className="modal-title">Delete This Plan?</h3>
            <p className="delete-text">This action will permanently remove this plan from your records.</p>
            <div className="modal-actions">
              <button type="button" className="danger modal-submit" onClick={confirmDelete}>Delete</button>
              <button type="button" className="ghost modal-cancel" onClick={() => setDeleteTargetId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Plans;
