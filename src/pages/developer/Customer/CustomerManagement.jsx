import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { toast } from 'react-toastify';
import {
  Search, UserPlus, Pencil, UserX, UserCheck, Eye,
  BadgeCheck, Clock, Loader2, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import './CustomerManagement.scss';
import { uploadImageToCloudinary } from '../../../utils/uploadImageToCloudinary';
import { useAuth } from '../../../context/AuthContext';

const MEMBER_LIST_API = '/api/members/getallmembers';
const CREATE_MEMBER_API = '/api/member/createmember';
const PLANS_API = '/api/plans/getallplans';
const UPDATE_MEMBER_API = '/api/members/memberprofileupdatebyadmin';
const TOGGLE_MEMBER_STATUS_API = '/api/members/suspendmemberbyadmin';

const getInputDate = (value) => {
  if (!value) return '';
  const raw = String(value);
  if (raw.includes('T')) return raw.split('T')[0];
  return raw;
};

const addDaysToDate = (dateStr, days) => {
  if (!dateStr || !Number.isFinite(days)) return '';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + Number(days));
  return date.toISOString().slice(0, 10);
};

const toMoney = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(numeric, 0);
};

const getDefaultAddForm = () => {
  const today = new Date().toISOString().slice(0, 10);
  return {
    fullName: '',
    email: '',
    number: '',
    address: '',
    dob: '',
    planId: '',
    gender: 'male',
    joiningDate: today,
    planStartDate: today,
    planEndDate: '',
    admissionFee: '',
    planFee: '',
    amountPaid: '',
    dueAmount: '0',
    paymentMethod: 'CASH',
    paymentDate: today,
    tax: '0',
  };
};

const getDefaultEditForm = () => ({
  memberId: '',
  fullName: '',
  number: '',
  email: '',
  address: '',
  gender: 'male',
  emergencyContact: '',
  dob: '',
  weight: '',
  height: '',
});

const toNullableNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
};

const CustomerManagement = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [addForm, setAddForm] = useState(getDefaultAddForm());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState(getDefaultEditForm());
  const [statusUpdatingMemberId, setStatusUpdatingMemberId] = useState('');
  const [statusConfirm, setStatusConfirm] = useState({
    open: false,
    member: null,
    currentStatus: 'active',
  });
  const [identityProofFiles, setIdentityProofFiles] = useState([]);
  const [identityProofPreviews, setIdentityProofPreviews] = useState([]);
  const [amountPaidTouched, setAmountPaidTouched] = useState(false);
  const [dueAmountTouched, setDueAmountTouched] = useState(false);
  const [meta, setMeta] = useState({
    totalRecords: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
    hasNextPage: false,
  });
  const [editIdentityProofFiles, setEditIdentityProofFiles] = useState([]);
  const [editIdentityProofPreviews, setEditIdentityProofPreviews] = useState([]);
  // Track deleted images (URLs) for backend deletion
  const [editImagesToDelete, setEditImagesToDelete] = useState([]);
  // API Call to fetch data
  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
      if (!authToken) {
        throw new Error('Missing auth token. Please login again.');
      }

      const activeSearch = searchTerm.trim();
      const queryParams = {
        page,
        limit: meta.pageSize,
      };

      if (activeSearch) {
        queryParams.search = activeSearch;
        queryParams.searchFields = 'user.fullName,user.email,user.number,member.gender,member.emergencyContact,plan.planName,plan.tag';
      }

      const response = await api.get(MEMBER_LIST_API, {
        params: queryParams,
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.data.success) {
        const payload = response.data?.data;
        const records = payload?.payments || payload?.members || payload?.records || payload?.items || (Array.isArray(payload) ? payload : []);
        const safeRecords = Array.isArray(records) ? records : [];

        const totalRecordsRaw = payload?.totalRecords ?? payload?.total ?? response.data?.totalRecords ?? response.data?.total;
        const totalPagesRaw = payload?.totalPages ?? response.data?.totalPages;
        const currentPage = Number(payload?.currentPage ?? response.data?.currentPage ?? page);

        const hasApiTotalPages = Number.isFinite(Number(totalPagesRaw)) && Number(totalPagesRaw) > 0;
        const hasNextPage = hasApiTotalPages
          ? currentPage < Number(totalPagesRaw)
          : safeRecords.length >= meta.pageSize;

        const totalPages = hasApiTotalPages
          ? Number(totalPagesRaw)
          : Math.max(1, currentPage + (hasNextPage ? 1 : 0));

        const totalRecords = Number.isFinite(Number(totalRecordsRaw))
          ? Number(totalRecordsRaw)
          : (currentPage - 1) * meta.pageSize + safeRecords.length + (hasNextPage ? 1 : 0);

        setPayments(safeRecords);
        setMeta(prev => ({
          ...prev,
          totalRecords,
          totalPages,
          currentPage,
          hasNextPage,
        }));
      } else {
        setPayments([]);
        setErrorMessage(response.data?.message || 'Failed to load members.');
      }
    } catch (error) {
      console.error('API Error:', error.message);
      setPayments([]);
      setErrorMessage(error?.response?.data?.message || error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [meta.pageSize, searchTerm, token]);

  useEffect(() => {
    fetchData(meta.currentPage);
  }, [fetchData, meta.currentPage]);

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
      if (!authToken) throw new Error('Missing auth token. Please login again.');

      const response = await api.get(PLANS_API, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const data = response?.data;
      const list = data?.plans || data?.data || (Array.isArray(data) ? data : []);
      setPlans(Array.isArray(list) ? list : []);
    } catch (error) {
      setSubmitError(error?.response?.data?.message || error.message || 'Failed to load plans.');
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && showAddModal && plans.length === 0 && !plansLoading) {
      fetchPlans();
    }
  }, [token, showAddModal, plans.length, plansLoading, fetchPlans]);

  const selectedPlan = plans.find((item) => String(item?._id) === String(addForm.planId));
  const totalBillAmount = toMoney(addForm.admissionFee) + toMoney(addForm.planFee) + toMoney(addForm.tax);
  const dueAmount = toMoney(addForm.dueAmount);
  const paymentStatus = dueAmount <= 0 ? 'COMPLETED' : 'PENDING';

  useEffect(() => {
    if (!showAddModal || !selectedPlan || !addForm.planStartDate) return;
    const nextPlanEnd = addDaysToDate(addForm.planStartDate, Number(selectedPlan.durationInDays || 0));
    const nextPlanFee = String(selectedPlan.price || '');
    setAddForm((prev) => {
      if (prev.planEndDate === nextPlanEnd && prev.planFee === nextPlanFee) return prev;
      return {
        ...prev,
        planEndDate: nextPlanEnd,
        planFee: nextPlanFee,
      };
    });
  }, [showAddModal, selectedPlan, addForm.planStartDate]);

  useEffect(() => {
    if (!showAddModal) return;
    setAddForm((prev) => {
      const currentAmount = toMoney(prev.amountPaid);
      const currentDue = toMoney(prev.dueAmount);

      let nextAmount = currentAmount;
      let nextDue = currentDue;

      if (!amountPaidTouched && !dueAmountTouched) {
        nextAmount = totalBillAmount;
        nextDue = 0;
      } else if (amountPaidTouched) {
        nextDue = Math.max(totalBillAmount - currentAmount, 0);
      } else {
        const clampedDue = Math.min(currentDue, totalBillAmount);
        nextDue = clampedDue;
        nextAmount = Math.max(totalBillAmount - clampedDue, 0);
      }

      const nextAmountStr = nextAmount > 0 ? String(nextAmount) : '';
      const nextDueStr = String(nextDue);

      if (prev.amountPaid === nextAmountStr && prev.dueAmount === nextDueStr) return prev;

      return {
        ...prev,
        amountPaid: nextAmountStr,
        dueAmount: nextDueStr,
      };
    });
  }, [showAddModal, amountPaidTouched, dueAmountTouched, totalBillAmount]);

  const filteredRows = payments.filter((item) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    const user = item?.userId || item?.memberId || item || {};
    const member = item?.memberId || item?.member || {};
    const plan = item?.planId || item?.plan || {};
    const planName = plan?.planName || plan?.name || item?.planName || '';
    const planTag = plan?.tag || item?.tag || '';

    return `${user?.fullName || ''} ${user?.email || ''} ${user?.number || ''} ${member?.gender || item?.gender || ''} ${member?.emergencyContact || item?.emergencyContact || ''} ${planName} ${planTag}`
      .toLowerCase()
      .includes(query);
  });

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    setMeta((prev) => ({
      ...prev,
      currentPage: 1,
    }));
  };

  const visibleTotalPages = Math.max(meta.totalPages, meta.currentPage + (meta.hasNextPage ? 1 : 0));
  const canGoPrev = meta.currentPage > 1;
  const canGoNext = meta.hasNextPage || meta.currentPage < visibleTotalPages;

  // Pagination Handlers
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

  const openAddModal = () => {
    setSubmitError('');
    setAddForm(getDefaultAddForm());
    setIdentityProofFiles([]);
    setAmountPaidTouched(false);
    setDueAmountTouched(false);
    setShowAddModal(true);
  };

  const handleIdentityProofChange = (event) => {
    const incoming = Array.from(event.target.files || []);
    // Only allow image types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const valid = incoming.filter((file) => allowedTypes.includes(file.type));

    if (valid.length !== incoming.length) {
      setSubmitError('Only image files (JPG, JPEG, PNG, WEBP, GIF) are allowed for Aadhar.');
    }

    setIdentityProofFiles((prev) => {
      const merged = [...prev, ...valid];
      const unique = merged.filter(
        (file, index, list) =>
          index === list.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size)
      );
      const limited = unique.slice(0, 3);
      if (unique.length > 3) {
        setSubmitError('You can upload maximum 3 identity proof files.');
      }
      // Set previews
      setIdentityProofPreviews(limited.map((file) => URL.createObjectURL(file)));
      return limited;
    });

    if (valid.length > 0 && valid.length === incoming.length) {
      setSubmitError('');
    }

    event.target.value = '';
  };

  const handleRemoveIdentityProofFile = (indexToRemove) => {
    setIdentityProofFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setIdentityProofPreviews((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleNumberWheel = (event) => {
    event.currentTarget.blur();
  };

  const handleAddFormChange = (event) => {
    const { name, value } = event.target;

    if (name === 'planId') {
      setAmountPaidTouched(false);
      setDueAmountTouched(false);
    }

    if (name === 'amountPaid') {
      setAmountPaidTouched(true);
      setDueAmountTouched(false);
    }

    if (name === 'dueAmount') {
      setDueAmountTouched(true);
      setAmountPaidTouched(false);
    }

    setAddForm((prev) => {
      const next = { ...prev, [name]: value };
      const pickedPlan = plans.find((plan) => String(plan?._id) === String(name === 'planId' ? value : next.planId));

      if (name === 'planId') {
        if (pickedPlan) {
          next.planFee = String(pickedPlan.price || '');
          next.admissionFee = '0';
          next.tax = '0';
          if (next.planStartDate) {
            next.planEndDate = addDaysToDate(next.planStartDate, Number(pickedPlan.durationInDays || 0));
          }
          const selectedPlanTotal = toMoney(next.planFee) + toMoney(next.admissionFee) + toMoney(next.tax);
          next.amountPaid = selectedPlanTotal > 0 ? String(selectedPlanTotal) : '';
          next.dueAmount = '0';
        } else {
          next.planFee = '';
          next.planEndDate = '';
          next.amountPaid = '';
          next.dueAmount = '0';
        }
      }

      if (name === 'planStartDate' && pickedPlan && value) {
        next.planEndDate = addDaysToDate(value, Number(pickedPlan.durationInDays || 0));
      }

      const updatedTotal = toMoney(next.admissionFee) + toMoney(next.planFee) + toMoney(next.tax);

      if (name === 'amountPaid') {
        const paid = toMoney(value);
        next.dueAmount = String(Math.max(updatedTotal - paid, 0));
      }

      if (name === 'dueAmount') {
        const due = Math.min(toMoney(value), updatedTotal);
        next.dueAmount = String(due);
        next.amountPaid = updatedTotal > 0 ? String(Math.max(updatedTotal - due, 0)) : '';
      }

      return next;
    });
  };

  const handleCreateMember = async () => {
    setSubmitError('');
    const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
    if (!authToken) {
      setSubmitError('Missing auth token. Please login again.');
      return;
    }

    if (!addForm.fullName || !addForm.email || !addForm.number || !addForm.address || !addForm.dob || !addForm.planId || !addForm.joiningDate || !addForm.planStartDate || !addForm.planEndDate) {
      setSubmitError('Please fill all required fields before submitting.');
      return;
    }

    // Upload identity proof images to Cloudinary
    let identityProofUrls = [];
    if (identityProofFiles.length > 0) {
      setSubmitLoading(true);
      try {
        const uploads = await Promise.all(
          identityProofFiles.map(async (file) => {
            const url = await uploadImageToCloudinary(file);
            if (!url) throw new Error('Aadhar image upload failed');
            return url;
          })
        );
        identityProofUrls = uploads;
      } catch (err) {
        setSubmitLoading(false);
        setSubmitError('Aadhar image upload failed. Please try again.');
        return;
      }
    }

    const payload = {
      user: {
        fullName: addForm.fullName.trim(),
        email: addForm.email.trim(),
        number: addForm.number.trim(),
        address: addForm.address.trim(),
        dob: addForm.dob,
        identityProof: identityProofUrls,
      },
      planId: addForm.planId,
      gender: addForm.gender,
      joiningDate: addForm.joiningDate,
      planStartDate: addForm.planStartDate,
      planEndDate: addForm.planEndDate,
      admissionFee: Number(addForm.admissionFee || 0),
      planFee: Number(addForm.planFee || 0),
      amountPaid: Number(addForm.amountPaid || 0),
      dueAmount: Number(addForm.dueAmount || 0),
      paymentStatus,
      paymentMethod: addForm.paymentMethod,
      paymentDate: addForm.paymentDate,
      tax: Number(addForm.tax || 0),
    };

    try {
      setSubmitLoading(true);
      const response = await api.post(CREATE_MEMBER_API, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response?.data?.success) {
        setShowAddModal(false);
        setAddForm(getDefaultAddForm());
        setIdentityProofFiles([]);
        if (meta.currentPage === 1) {
          fetchData(1);
        } else {
          setMeta((prev) => ({
            ...prev,
            currentPage: 1,
          }));
        }
      } else {
        setSubmitError(response?.data?.message || 'Unable to create member.');
      }
    } catch (error) {
      setSubmitError(error?.response?.data?.message || error.message || 'Failed to create member.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleViewDetails = (member) => {
    const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/dev';
    const selectedMemberId = member?._id || member?.id || '';
    if (selectedMemberId) {
      sessionStorage.setItem('yodha_selected_member_id', selectedMemberId);
    }
    navigate(`${basePath}/customers/details`, { state: { member } });
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditError('');
    setEditForm(getDefaultEditForm());
  };

  const handleOpenEditModal = (member) => {
    const user = member?.userId || member?.memberId || member || {};
    setEditError('');

    // 1. Purani images (URLs) nikaalo
    const existingImages = Array.isArray(user?.identityProof) ? user.identityProof : [];

    // 2. Previews set karo taaki modal khulte hi dikhne lagein
    setEditIdentityProofPreviews(existingImages);
    setEditIdentityProofFiles([]); // Nayi files ko reset karo
    setEditImagesToDelete([]); // Reset deleted images tracker

    setEditForm({
      memberId: String(member?._id || member?.id || ''),
      fullName: user?.fullName || user?.name || '',
      number: user?.number || user?.phone || '',
      email: user?.email || '',
      address: user?.address || member?.address || '',
      gender: member?.gender || 'male',
      emergencyContact: member?.emergencyContact || member?.memberId?.emergencyContact || '',
      dob: getInputDate(user?.dob),
      weight: member?.weight === undefined || member?.weight === null ? '' : String(member.weight),
      height: member?.height === undefined || member?.height === null ? '' : String(member.height),
      // 3. Identity proof ko form state mein rakho
      identityProof: existingImages,
    });

    setShowEditModal(true);
  };

  const handleEditIdentityProofChange = (event) => {
    const incoming = Array.from(event.target.files || []);

    // 1. Check for image types only
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const valid = incoming.filter((file) => allowedTypes.includes(file.type));

    if (valid.length !== incoming.length) {
      setEditError('Only image files (JPG, PNG, etc.) are allowed.');
      event.target.value = '';
      return;
    }

    // 2. Max 3 Validation Logic
    const existingCount = (editForm.identityProof || []).length;
    const alreadySelectedNewCount = editIdentityProofFiles.length;
    const totalCurrentlyInState = existingCount + alreadySelectedNewCount;

    const remainingQuota = 3 - totalCurrentlyInState;

    if (incoming.length > remainingQuota) {
      setEditError(`You can only have a maximum of 3 images total. You already have ${totalCurrentlyInState}, so you can only add ${remainingQuota} more.`);
      // Sirf quota jitna hi files lo, baaki discard kar do
      const limitedIncoming = incoming.slice(0, remainingQuota);

      if (limitedIncoming.length > 0) {
        updateEditFilesState(limitedIncoming);
      }
    } else {
      updateEditFilesState(incoming);
    }

    event.target.value = '';
  };

  // Helper function to update state (cleaner code)
  const updateEditFilesState = (newFiles) => {
    setEditIdentityProofFiles((prev) => [...prev, ...newFiles]);

    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setEditIdentityProofPreviews((prev) => [...prev, ...newPreviews]);
    setEditError(''); // Clear error if successful
  };

  const handleRemoveEditProof = (index) => {
    const existingCount = (editForm.identityProof || []).length;
    if (index < existingCount) {
      // Purani image delete kar rahe ho
      const removedUrl = editForm.identityProof[index];
      // Track for backend deletion
      setEditImagesToDelete((prev) => [...prev, removedUrl]);
      const updatedExisting = editForm.identityProof.filter((_, i) => i !== index);
      setEditForm(prev => ({ ...prev, identityProof: updatedExisting }));
      setEditIdentityProofPreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      // Nayi select ki hui file remove kar rahe ho
      const fileIndex = index - existingCount;
      const updatedFiles = editIdentityProofFiles.filter((_, i) => i !== fileIndex);
      setEditIdentityProofFiles(updatedFiles);
      setEditIdentityProofPreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleEditFormChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateMember = async () => {
    const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
    if (!authToken) {
      setEditError('Session expired. Please login again.');
      return;
    }

    setEditSubmitting(true);
    setEditError('');

    try {
      // 1. Pehle purani bachi hui images ka array lo
      let finalImagesArray = [...(editForm.identityProof || [])];

      // 2. Agar user ne nayi images select ki hain (editIdentityProofFiles state mein)
      // toh unhe Cloudinary par upload karo
      if (editIdentityProofFiles && editIdentityProofFiles.length > 0) {
        try {
          const uploadPromises = editIdentityProofFiles.map(file => uploadImageToCloudinary(file));
          const uploadedUrls = await Promise.all(uploadPromises);

          // Purani bachi hui images + Nayi uploaded images ko merge karo
          finalImagesArray = [...finalImagesArray, ...uploadedUrls];
        } catch (uploadErr) {
          throw new Error("Image upload failed. Update cancel ho gaya.");
        }
      }

      // 3. Ab Final Payload banao (Isme identityProof zaroor hona chahiye)
      const payload = {
        memberId: editForm.memberId,
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        number: editForm.number.trim(),
        address: editForm.address.trim(),
        dob: editForm.dob || null,
        gender: editForm.gender,
        emergencyContact: editForm.emergencyContact.trim(),
        weight: Number(editForm.weight) || 0,
        height: Number(editForm.height) || 0,
        identityProof: finalImagesArray,
        imagesToDelete: editImagesToDelete, // <--- Backend ko batayein kya delete karna hai
      };

      console.log("Sending Final Payload:", payload); // Debugging ke liye check karo

      const response = await api.put(UPDATE_MEMBER_API, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.data.success) {
        toast.success('Member updated with images!');
        setEditIdentityProofFiles([]); // Reset files
        setEditIdentityProofPreviews([]); // Reset previews
        setEditImagesToDelete([]); // Reset deleted images tracker
        closeEditModal();
        fetchData(meta.currentPage);
      } else {
        setEditError(response.data.message || 'Update failed');
      }
    } catch (error) {
      console.error("Update Error:", error);
      setEditError(error.response?.data?.message || error.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const normalizeAccountStatus = (item) => {
    const raw = String(
      item?.accountStatus
      || item?.memberId?.accountStatus
      || item?.userId?.accountStatus
      || 'active'
    ).toLowerCase();
    return raw.includes('suspend') ? 'suspended' : 'active';
  };

  const openStatusConfirmModal = (memberItem, currentStatus) => {
    setStatusConfirm({
      open: true,
      member: memberItem,
      currentStatus,
    });
  };

  const closeStatusConfirmModal = () => {
    setStatusConfirm({
      open: false,
      member: null,
      currentStatus: 'active',
    });
  };

  const handleToggleAccountStatus = async (memberItem, currentStatus) => {
    const authToken = (token || localStorage.getItem('yodha_token') || '').trim();
    if (!authToken) {
      const message = 'Missing auth token. Please login again.';
      setErrorMessage(message);
      toast.error(message);
      return false;
    }

    const memberId = String(memberItem?._id || memberItem?.id || '');
    if (!memberId) {
      const message = 'Unable to update account status for this member.';
      setErrorMessage(message);
      toast.error(message);
      return false;
    }

    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const user = memberItem?.userId || memberItem?.memberId || memberItem || {};
    const memberName = user?.fullName || user?.name || 'Member';

    try {
      setStatusUpdatingMemberId(memberId);
      setErrorMessage('');
      const response = await api.patch(
        TOGGLE_MEMBER_STATUS_API,
        {
          memberId,
          accountStatus: nextStatus,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to update account status.');
      }

      fetchData(meta.currentPage);
      toast.success(nextStatus === 'suspended' ? `${memberName} suspended successfully.` : `${memberName} activated successfully.`);
      return true;
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Failed to update account status.';
      setErrorMessage(message);
      toast.error(message);
      return false;
    } finally {
      setStatusUpdatingMemberId('');
    }
  };

  const handleConfirmStatusToggle = async () => {
    if (!statusConfirm.member) {
      closeStatusConfirmModal();
      return;
    }

    const success = await handleToggleAccountStatus(statusConfirm.member, statusConfirm.currentStatus);
    if (success) {
      closeStatusConfirmModal();
    }
  };

  const formatDate = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPlanValidity = (startDate, endDate) => {
    if (!endDate) {
      return { label: 'N/A', className: 'unknown', hint: 'No end date' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = startDate ? new Date(startDate) : null;
    const end = new Date(endDate);
    start?.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'CLOSED', className: 'closed', hint: 'Plan finished' };
    }

    if (start && today < start) {
      return { label: 'UPCOMING', className: 'upcoming', hint: `Starts in ${Math.ceil((start - today) / (1000 * 60 * 60 * 24))} day(s)` };
    }

    if (diffDays <= 5) {
      return { label: 'CLOSING SOON', className: 'soon', hint: `${diffDays} day(s) left` };
    }

    return { label: 'ACTIVE', className: 'active', hint: `${diffDays} day(s) left` };
  };

  const confirmUser = statusConfirm.member?.userId || statusConfirm.member?.memberId || statusConfirm.member || {};
  const confirmMemberName = confirmUser?.fullName || confirmUser?.name || 'this member';
  const confirmAction = statusConfirm.currentStatus === 'suspended' ? 'activate' : 'suspend';
  const confirmMemberId = String(statusConfirm.member?._id || statusConfirm.member?.id || '');
  const isConfirmUpdating = statusConfirm.open && statusUpdatingMemberId === confirmMemberId;

  return (
    <div className="customer-page">
      <header className="customer-header">
        <div>
          <h2 className="customer-title">Customer Control</h2>
          <p className="customer-subtitle">Manage payments, plans, and member profiles.</p>
        </div>
        <button type="button" className="add-customer" onClick={openAddModal}>
          <UserPlus size={18} />
          Add Customer
        </button>
      </header>

      <div className="customer-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input type="text" placeholder="Search fullName, email, number, gender, emergency, plan, tag..." value={searchTerm} onChange={handleSearchChange} />
        </div>
        <div className="toolbar-meta">
          <span>
            Showing {meta.totalRecords > 0 ? (meta.currentPage - 1) * meta.pageSize + 1 : 0}-{Math.min(meta.currentPage * meta.pageSize, meta.totalRecords)} of {meta.hasNextPage ? `${meta.totalRecords}+` : meta.totalRecords}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="toolbar-meta" style={{ marginBottom: '1rem', color: '#ff8f8f' }}>
          {errorMessage}
        </div>
      )}

      <div className="table-shell">
        {loading ? (
          <div className="loader-box">
            <Loader2 className="spinner" size={40} />
            <p>Syncing Yodha Database...</p>
          </div>
        ) : (
          <table className="customer-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Plan</th>
                <th>Payment</th>
                <th>Paid Amount</th>
                <th>Plan Dates</th>
                <th>Plan Validity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(filteredRows) && filteredRows.length > 0 ? (
                filteredRows.map((item, index) => {
                  const user = item?.userId || item?.memberId || item || {};
                  const fullName = user?.fullName || user?.name || 'Unknown Member';
                  const contact = user?.number || user?.phone || user?.email || 'No contact';
                  const planName = item?.planId?.planName || item?.planId?.name || item?.planName || item?.plan?.planName || item?.plan?.name || 'N/A';

                  const paymentRecord = Array.isArray(item?.payments) && item.payments.length > 0
                    ? [...item.payments].sort(
                      (a, b) => new Date(b?.paymentDate || b?.createdAt || 0) - new Date(a?.paymentDate || a?.createdAt || 0)
                    )[0]
                    : null;

                  const billingRecord = Array.isArray(item?.billings) && item.billings.length > 0
                    ? [...item.billings].sort(
                      (a, b) => new Date(b?.billingDate || b?.createdAt || 0) - new Date(a?.billingDate || a?.createdAt || 0)
                    )[0]
                    : null;

                  const totalAmount = Number(
                    paymentRecord?.totalBillAmount
                    ?? billingRecord?.grandTotal
                    ?? item?.totalAmount
                    ?? 0
                  ) || 0;

                  let amountPaid = Number(
                    paymentRecord?.amountPaid
                    ?? billingRecord?.subTotal
                    ?? 0
                  ) || 0;

                  let dueAmount = Number(
                    paymentRecord?.dueAmount
                    ?? Math.max(totalAmount - amountPaid, 0)
                  ) || 0;

                  if (dueAmount === 0 && totalAmount > 0 && amountPaid === 0) {
                    amountPaid = totalAmount;
                  }

                  const rawStatus = String(
                    paymentRecord?.paymentStatus
                    || item?.paymentStatus
                    || item?.status
                    || ''
                  ).toUpperCase();

                  const isCompleted = rawStatus
                    ? ['COMPLETED', 'PAID', 'SUCCESS'].includes(rawStatus)
                    : dueAmount <= 0;

                  const paymentStatus = isCompleted ? 'PAID' : 'DUE';
                  const statusClass = isCompleted ? 'completed' : 'due';

                  const joinedAt = item?.joiningDate || item?.createdAt || item?.joinedAt || item?.updatedAt;
                  const planStartAt = item?.planStartDate || joinedAt;
                  const planEndAt = item?.planEndDate;
                  const validity = getPlanValidity(planStartAt, planEndAt);
                  const planClass = String(planName).toLowerCase().split(' ')[0];
                  const accountStatus = normalizeAccountStatus(item);
                  const isStatusUpdating = statusUpdatingMemberId === String(item?._id || item?.id || '');
                  const accountActionTitle = accountStatus === 'suspended' ? 'Activate Member' : 'Suspend Member';

                  return (
                    <tr key={item?._id || `${fullName}-${joinedAt || index}`}>
                      <td data-label="Member">
                        <div className="member-cell">
                          <div className="member-avatar">
                            {fullName.slice(0, 1) || 'Y'}
                          </div>
                          <div className="member-meta">
                            <strong title={fullName}>{fullName}</strong>
                            <small title={contact}>{contact}</small>
                          </div>
                        </div>
                      </td>
                      <td data-label="Plan">
                        <span className={`plan-tag ${planClass}`} title={planName}>
                          {planName}
                        </span>
                      </td>
                      <td data-label="Payment">
                        <span className={`status-tag ${statusClass}`}>
                          {paymentStatus === 'DUE' ? <Clock size={14} /> : <BadgeCheck size={14} />}
                          {paymentStatus}
                        </span>
                      </td>
                      <td data-label="Paid Amount">
                        <div className="price-info">
                          <strong>₹{amountPaid}</strong>
                          <small>Due: ₹{dueAmount}</small>
                        </div>
                      </td>
                      <td data-label="Plan Dates">
                        <div className="plan-dates">
                          <small>Start: {formatDate(planStartAt)}</small>
                          <small>End: {formatDate(planEndAt)}</small>
                          <small className="joined-meta">Joined: {formatDate(joinedAt)}</small>
                        </div>
                      </td>
                      <td data-label="Plan Validity">
                        <div className="validity-wrap">
                          <span className={`validity-tag ${validity.className}`}>{validity.label}</span>
                          <small>{validity.hint}</small>
                        </div>
                      </td>
                      <td data-label="Status">
                        <span className={`account-tag ${accountStatus}`}>
                          {accountStatus === 'suspended' ? 'SUSPENDED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td data-label="Actions">
                        <div className="action-group">
                          <button type="button" className="ghost" title="View Details" onClick={() => handleViewDetails(item)}>
                            <Eye size={16} />
                          </button>
                          <button type="button" className="ghost" title="Edit Member" onClick={() => handleOpenEditModal(item)}>
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className={accountStatus === 'suspended' ? 'ghost activate' : 'danger'}
                            title={accountActionTitle}
                            disabled={isStatusUpdating}
                            onClick={() => openStatusConfirmModal(item, accountStatus)}
                          >
                            {isStatusUpdating ? (
                              <Loader2 size={16} className="spin-icon" />
                            ) : accountStatus === 'suspended' ? (
                              <UserCheck size={16} />
                            ) : (
                              <UserX size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">No members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showEditModal && (
        <div className="edit-member-overlay" role="presentation" onClick={closeEditModal}>
          <div className="edit-member-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="edit-member-head">
              <div>
                <h3>Edit Member Basic Details</h3>
                <p>Update personal details quickly. Existing values are auto-filled.</p>
              </div>
              <button type="button" className="icon-btn" onClick={closeEditModal}>
                <X size={16} />
              </button>
            </div>

            {editError && <div className="add-form-error">{editError}</div>}

            <div className="edit-form-grid">
              <div className="form-field span-3 edit-profile-preview">
                <div className="preview-avatar">
                  <span>{(editForm.fullName || 'M').trim().slice(0, 1).toUpperCase()}</span>
                </div>
                <div className="preview-meta">
                  <strong>{editForm.fullName || 'Member Name'}</strong>
                  <small>{editForm.number || 'No number added'}</small>
                </div>
              </div>

              <div className="form-field span-3 edit-section-title">
                <strong>Personal Details</strong>
                <small>Basic identity and contact information</small>
              </div>

              <label className="form-field">Full Name*
                <input name="fullName" value={editForm.fullName} onChange={handleEditFormChange} />
              </label>

              <label className="form-field">Mobile Number*
                <input name="number" value={editForm.number} onChange={handleEditFormChange} />
              </label>

              <label className="form-field">Email*
                <input name="email" type="email" value={editForm.email} onChange={handleEditFormChange} />
              </label>

              <label className="form-field">Address
                <input name="address" value={editForm.address} onChange={handleEditFormChange} />
              </label>

              <label className="form-field">Gender
                <select name="gender" value={editForm.gender} onChange={handleEditFormChange}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="form-field">Emergency Number
                <input name="emergencyContact" value={editForm.emergencyContact} onChange={handleEditFormChange} />
              </label>

              <label className="form-field">Date of Birth
                <input name="dob" type="date" value={editForm.dob} onChange={handleEditFormChange} />
              </label>

              <div className="form-field span-3 edit-section-title">
                <strong>Physical Details</strong>
                <small>Height and weight update</small>
              </div>

              <div className="form-field span-3 identity-proof-field">
                <span>Update Aadhar / Identity Proof (Max 3)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleEditIdentityProofChange}
                />
                {editIdentityProofPreviews.length > 0 && (
                  <div className="selected-proof-files">
                    {editIdentityProofPreviews.map((preview, index) => (
                      <div className="proof-chip" key={`edit-proof-${index}`}>
                        <img src={preview} alt="Aadhar" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, marginRight: 8 }} />
                        <button type="button" onClick={() => handleRemoveEditProof(index)}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="form-field">Weight (kg)
                <input name="weight" type="number" value={editForm.weight} onChange={handleEditFormChange} onWheel={handleNumberWheel} />
              </label>

              <label className="form-field">Height (cm)
                <input name="height" type="number" value={editForm.height} onChange={handleEditFormChange} onWheel={handleNumberWheel} />
              </label>
            </div>

            <div className="add-member-actions">
              <button type="button" className="ghost-btn" onClick={closeEditModal}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleUpdateMember} disabled={editSubmitting}>
                {editSubmitting ? 'Updating...' : 'Update Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="add-member-overlay" role="presentation" onClick={() => setShowAddModal(false)}>
          <div className="add-member-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="add-member-head">
              <div>
                <h3>Add New Member</h3>
                <p>Quick entry with auto plan fee, plan end date, due amount, and payment status.</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setShowAddModal(false)}>
                <X size={16} />
              </button>
            </div>

            {submitError && <div className="add-form-error">{submitError}</div>}

            <div className="add-form-grid">
              <label className="form-field">Full Name*<input name="fullName" value={addForm.fullName} onChange={handleAddFormChange} /></label>
              <label className="form-field">Email*<input name="email" type="email" value={addForm.email} onChange={handleAddFormChange} /></label>
              <label className="form-field">Number*<input name="number" value={addForm.number} onChange={handleAddFormChange} /></label>

              <label className="form-field">Address*<input name="address" value={addForm.address} onChange={handleAddFormChange} /></label>
              <label className="form-field">Date of Birth*<input name="dob" type="date" value={addForm.dob} onChange={handleAddFormChange} /></label>
              <label className="form-field">Plan*
                <select name="planId" value={addForm.planId} onChange={handleAddFormChange} disabled={plansLoading}>
                  <option value="">{plansLoading ? 'Loading Plans...' : 'Select Plan'}</option>
                  {plans.map((planItem) => (
                    <option key={planItem?._id} value={planItem?._id}>{planItem?.planName} (₹{planItem?.price})</option>
                  ))}
                </select>
              </label>

              <label className="form-field">Gender*
                <select name="gender" value={addForm.gender} onChange={handleAddFormChange}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="form-field">Joining Date*<input name="joiningDate" type="date" value={addForm.joiningDate} onChange={handleAddFormChange} /></label>
              <label className="form-field">Plan Start Date*<input name="planStartDate" type="date" value={addForm.planStartDate} onChange={handleAddFormChange} /></label>

              <label className="form-field">Plan End Date*<input name="planEndDate" type="date" value={addForm.planEndDate} readOnly /></label>
              <label className="form-field">Plan Fee*<input name="planFee" type="number" value={addForm.planFee} readOnly onWheel={handleNumberWheel} /></label>
              <label className="form-field">Admission Fee (Optional)<input name="admissionFee" type="number" placeholder="0" value={addForm.admissionFee} onChange={handleAddFormChange} onWheel={handleNumberWheel} /></label>

              <label className="form-field">Tax<input name="tax" type="number" value={addForm.tax} onChange={handleAddFormChange} onWheel={handleNumberWheel} /></label>
              <label className="form-field">Amount Paid*<input name="amountPaid" type="number" value={addForm.amountPaid} onChange={handleAddFormChange} onWheel={handleNumberWheel} /></label>

              <label className="form-field">Due Amount<input name="dueAmount" type="number" value={addForm.dueAmount} onChange={handleAddFormChange} onWheel={handleNumberWheel} /></label>
              <label className="form-field">Payment Status<input value={paymentStatus} readOnly /></label>
              <label className="form-field">Payment Method*
                <select name="paymentMethod" value={addForm.paymentMethod} onChange={handleAddFormChange}>
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">CARD</option>
                </select>
              </label>

              <label className="form-field">Payment Date*<input name="paymentDate" type="date" value={addForm.paymentDate} readOnly /></label>

              <div className="form-field span-3 identity-proof-field">
                <span>Aadhar Image (Max 3, JPG/JPEG/PNG/WEBP/GIF)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleIdentityProofChange}
                />
                {identityProofPreviews.length > 0 && (
                  <div className="selected-proof-files">
                    {identityProofPreviews.map((preview, index) => (
                      <div className="proof-chip" key={`proof-preview-${index}`}>
                        <img src={preview} alt={`Aadhar Preview ${index + 1}`} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, marginRight: 8 }} />
                        <span>{identityProofFiles[index]?.name}</span>
                        <button type="button" onClick={() => handleRemoveIdentityProofFile(index)} aria-label="Remove file">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="add-member-actions">
              <button type="button" className="ghost-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="button" className="primary-btn" onClick={handleCreateMember} disabled={submitLoading}>
                {submitLoading ? 'Creating Member...' : 'Create Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusConfirm.open && (
        <div className="status-confirm-overlay" role="presentation" onClick={closeStatusConfirmModal}>
          <div className="status-confirm-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4>Confirm Status Change</h4>
            <p>
              Are you sure you want to {confirmAction} <strong>{confirmMemberName}</strong>?
            </p>

            <div className="status-confirm-actions">
              <button type="button" className="ghost-btn" onClick={closeStatusConfirmModal} disabled={isConfirmUpdating}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleConfirmStatusToggle}
                disabled={isConfirmUpdating}
              >
                {isConfirmUpdating
                  ? 'Please wait...'
                  : (statusConfirm.currentStatus === 'suspended' ? 'Activate' : 'Suspend')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && (meta.currentPage > 1 || canGoNext || visibleTotalPages > 1) && (
        <div className="pagination">
          <button
            className="nav-btn"
            disabled={!canGoPrev}
            onClick={() => goToPage(meta.currentPage - 1)}
          >
            <ChevronLeft size={18} />
          </button>

          {[...Array(visibleTotalPages)].map((_, i) => (
            <button
              key={i + 1}
              className={`page-num ${meta.currentPage === i + 1 ? 'active' : ''}`}
              onClick={() => goToPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}

          <button
            className="nav-btn"
            disabled={!canGoNext}
            onClick={() => goToPage(meta.currentPage + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;