import React, { useEffect, useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  User,
  Briefcase,
  BriefcaseBusiness,
  Pencil,
  Trash2,
  X,
  Plus,
  Upload,
  Users,
  Search,
  Award,
  Activity,
  Eye,
  Check,
} from "lucide-react";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./TrainerManagement.scss";
import { API_BASE_URL } from "../../../utils/api";

const TRAINER_API = `${API_BASE_URL}/api/trainer/all`;
const ADD_TRAINER_API = `${API_BASE_URL}/api/trainer/add`;
const UPDATE_TRAINER_API = `${API_BASE_URL}/api/trainer/update`;
const UPDATE_TRAINER_API_ALT = `${API_BASE_URL}/api/trainers/update`;
const DELETE_TRAINER_API = `${API_BASE_URL}/api/trainer/delete`;
const DELETE_TRAINER_API_ALT = `${API_BASE_URL}/api/trainers/delete`;

const SPECIALIZATIONS_LIST = [
  "Yoga",
  "Strength",
  "HIIT",
  "CrossFit",
  "Zumba",
  "Pilates",
  "Cardio",
  "Nutrition",
  "Physiotherapy",
  "Aerobics",
];

const TrainerManagement = () => {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTrainerId, setEditTrainerId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const initialFormState = {
    fullName: "",
    email: "",
    number: "",
    gender: "Male",
    dob: "",
    specialization: [],
    experience: "",
    certification: "",
    salary: "",
    shiftTime: "Morning",
    joiningDate: "",
    address: "",
    identityProof: [],
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchTrainers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("yodha_token") || "";
      const res = await fetch(`${TRAINER_API}?page=1&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.list)) {
        setTrainers(data.list);
      } else if (data.success && (!data.list || data.list.length === 0)) {
        setTrainers([]);
      } else {
        setTrainers([]);
        // Optionally show error only if not empty
        if (!data.success) toast.error("Failed to load trainers");
      }
    } catch (err) {
      setTrainers([]);
      toast.error("Failed to load trainers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  const formatDateForInput = (dateValue) => {
    if (!dateValue) return "";
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return "";
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditTrainerId("");
    setFormData(initialFormState);
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setEditTrainerId("");
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (trainer) => {
    const existingIdentityProof = Array.isArray(trainer.identityProof)
      ? trainer.identityProof
      : Array.isArray(trainer.userId?.identityProof)
        ? trainer.userId.identityProof
        : [];

    setIsEditMode(true);
    setEditTrainerId(trainer._id || "");
    setFormData({
      fullName: trainer.userId?.fullName || "",
      email: trainer.userId?.email || "",
      number: trainer.userId?.number || "",
      gender: trainer.gender || "Male",
      dob: formatDateForInput(trainer.dob),
      specialization: Array.isArray(trainer.specialization)
        ? trainer.specialization
        : [],
      experience: trainer.experience ?? "",
      certification: trainer.certification || "",
      salary: trainer.salary ?? "",
      shiftTime: trainer.shiftTime || "Morning",
      joiningDate: formatDateForInput(trainer.joiningDate),
      address: trainer.address || trainer.userId?.address || "",
      identityProof: existingIdentityProof,
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleSpecialization = (spec) => {
    setFormData((prev) => {
      const isSelected = prev.specialization.includes(spec);
      return {
        ...prev,
        specialization: isSelected
          ? prev.specialization.filter((s) => s !== spec)
          : [...prev.specialization, spec],
      };
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (formData.identityProof.length + files.length > 3) {
      return toast.warning("Max 3 images allowed");
    }
    setFormData((prev) => ({
      ...prev,
      identityProof: [...prev.identityProof, ...files],
    }));
  };

  const removeFile = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      identityProof: prev.identityProof.filter(
        (_, idx) => idx !== indexToRemove,
      ),
    }));
  };

  const CLOUDINARY_URL =
    "https://api.cloudinary.com/v1_1/dztmcw3mm/image/upload";
  const CLOUDINARY_PRESET = "gym_unsigned";

  const uploadImagesToCloudinary = async (files) => {
    const uploadedUrls = [];
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", CLOUDINARY_PRESET);
      try {
        const response = await fetch(CLOUDINARY_URL, {
          method: "POST",
          body: form,
        });
        const data = await response.json();
        if (data.secure_url) uploadedUrls.push(data.secure_url);
      } catch (error) {
        console.error("Upload error:", error);
      }
    }
    return uploadedUrls;
  };

  const updateTrainerRequest = async (token, payload) => {
    const updateUrls = [UPDATE_TRAINER_API, UPDATE_TRAINER_API_ALT];

    for (const url of updateUrls) {
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (_e) {
        data = {};
      }

      const routeNotFound =
        res.status === 404 ||
        String(data?.message || "")
          .toLowerCase()
          .includes("route not found");

      if (!routeNotFound) {
        return { ok: res.ok, data };
      }
    }

    return {
      ok: false,
      data: {
        message: "Route not found for trainer update API",
      },
    };
  };

  const deleteTrainerRequest = async (token, payload) => {
    const deleteUrls = [DELETE_TRAINER_API, DELETE_TRAINER_API_ALT];

    for (const url of deleteUrls) {
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (_e) {
        data = {};
      }

      const routeNotFound =
        res.status === 404 ||
        String(data?.message || "")
          .toLowerCase()
          .includes("route not found");

      if (!routeNotFound) {
        return { ok: res.ok, data };
      }
    }

    return {
      ok: false,
      data: {
        message: "Route not found for trainer delete API",
      },
    };
  };

  const openDeleteModal = (trainer) => {
    setDeleteTarget({
      trainerId: trainer?._id || "",
      trainerName: trainer?.userId?.fullName || "this trainer",
    });
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  const handleDeleteTrainer = async () => {
    if (!deleteTarget?.trainerId) {
      toast.error("Trainer id missing for delete");
      return;
    }

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("yodha_token") || "";
      const { ok, data } = await deleteTrainerRequest(token, {
        trainerId: deleteTarget.trainerId,
      });

      if (ok && data.success) {
        toast.success("Trainer deleted successfully");
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
        fetchTrainers();
      } else {
        toast.error(data.message || "Failed to delete trainer");
      }
    } catch (err) {
      toast.error(err?.message || "Server error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.specialization.length === 0)
      return toast.warning("Select specialization");
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("yodha_token") || "";
      const existingImageUrls = formData.identityProof.filter(
        (item) => typeof item === "string",
      );
      const newImageFiles = formData.identityProof.filter(
        (item) => item instanceof File,
      );
      const uploadedImageUrls =
        newImageFiles.length > 0
          ? await uploadImagesToCloudinary(newImageFiles)
          : [];
      const finalIdentityProof = [...existingImageUrls, ...uploadedImageUrls];

      const payload = {
        ...formData,
        salary: Number(formData.salary) || 0,
        experience: Number(formData.experience) || 0,
        identityProof: finalIdentityProof,
      };

      if (isEditMode) {
        if (!editTrainerId) {
          toast.error("Trainer id missing for update");
          return;
        }

        const { ok, data } = await updateTrainerRequest(token, {
          trainerId: editTrainerId,
          ...payload,
        });

        if (ok && data.success) {
          toast.success("Trainer updated successfully");
          handleCloseModal();
          fetchTrainers();
        } else {
          toast.error(data.message || "Failed to update trainer");
        }
      } else {
        const res = await fetch(ADD_TRAINER_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
          toast.success("Trainer added successfully");
          handleCloseModal();
          fetchTrainers();
        } else {
          toast.error(data.message || "Failed to add trainer");
        }
      }
    } catch (err) {
      toast.error(err?.message || "Server error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTrainers = trainers.filter(
    (t) =>
      t.userId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.specialization?.some((s) =>
        s.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  const formatDate = (dateValue) =>
    dateValue ? new Date(dateValue).toLocaleDateString("en-GB") : "N/A";

  return (
    <div className="trainer-dashboard">
      <header className="dashboard-header">
        <div className="title-section">
          <div className="icon-hub">
            <BriefcaseBusiness size={28} />
          </div>
          <div>
            <h1>Trainer Hub</h1>
            <p>Onboard and manage your fitness elite</p>
          </div>
        </div>

        <div className="action-bar">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search trainer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className="prime-add-btn"
            onClick={openAddModal}
          >
            <Plus size={20} /> Add New Elite
          </button>
        </div>
      </header>

      {isModalOpen && (
        <div className="modal-veil">
          <div className="modal-stage">
            <div className="modal-header-premium">
              <div className="header-text">
                <h3>{isEditMode ? "Edit Trainer" : "Onboard Trainer"}</h3>
                <p>
                  {isEditMode
                    ? "Record loaded for editing"
                    : "Fill in the professional details"}
                </p>
              </div>
              <button
                className="close-stage-btn"
                onClick={handleCloseModal}
              >
                <X />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="premium-form">
              <div className="form-sections-wrapper">
                {/* LEFT COLUMN: Personal & Upload */}
                <div className="form-column">
                  <h4 className="section-title">
                    <User size={16} /> Personal Profile
                  </h4>

                  <div className="input-grid-row single">
                    <div className="field-box">
                      <label>Full Name</label>
                      <input
                        name="fullName"
                        placeholder="e.g. John Doe"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="input-grid-row double">
                    <div className="field-box">
                      <label>Email Address</label>
                      <input
                        name="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="field-box">
                      <label>Contact Number</label>
                      <input
                        name="number"
                        type="number"
                        className="no-spinners"
                        placeholder="10-digit number"
                        value={formData.number}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="input-grid-row double">
                    <div className="field-box">
                      <label>Gender</label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="field-box">
                      <label>Date of Birth</label>
                      <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="input-grid-row single">
                    <div className="field-box">
                      <label>Address</label>
                      <textarea
                        name="address"
                        placeholder="Residential Address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  {/* MOVED HERE: Identity Proof on the Left Side */}
                  <h4 className="section-title mt-20">
                    <Activity size={16} /> Identity Verification
                  </h4>
                  <div className="premium-upload-box">
                    <label className="upload-label">
                      <Upload size={20} />
                      <div className="text-area">
                        <span>Upload Identity Proofs</span>
                        <small>Max 3 images (JPG, PNG)</small>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        multiple
                        onChange={handleFileChange}
                      />
                    </label>

                    {formData.identityProof.length > 0 && (
                      <div className="image-preview-zone">
                        {formData.identityProof.map((fileOrUrl, i) => (
                          <div key={i} className="img-thumb-box">
                            <img
                              src={
                                typeof fileOrUrl === "string"
                                  ? fileOrUrl
                                  : URL.createObjectURL(fileOrUrl)
                              }
                              alt={`proof-${i}`}
                            />
                            <button
                              type="button"
                              className="remove-btn"
                              onClick={() => removeFile(i)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Professional */}
                <div className="form-column">
                  <h4 className="section-title">
                    <Briefcase size={16} /> Professional Details
                  </h4>

                  <div className="field-box full-width mb-20">
                    <label>Specializations (Select multiple)</label>
                    <div className="specialization-grid">
                      {SPECIALIZATIONS_LIST.map((spec) => (
                        <span
                          key={spec}
                          className={`spec-pill ${formData.specialization.includes(spec) ? "selected" : ""}`}
                          onClick={() => toggleSpecialization(spec)}
                        >
                          {formData.specialization.includes(spec) && (
                            <Check size={12} />
                          )}{" "}
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="input-grid-row double">
                    <div className="field-box">
                      <label>Experience (Yrs)</label>
                      <input
                        name="experience"
                        type="number"
                        className="no-spinners"
                        placeholder="e.g. 5"
                        value={formData.experience}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="field-box">
                      <label>Joining Date</label>
                      <input
                        type="date"
                        name="joiningDate"
                        value={formData.joiningDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="input-grid-row double">
                    <div className="field-box">
                      <label>Salary (INR)</label>
                      <input
                        name="salary"
                        type="number"
                        className="no-spinners"
                        placeholder="e.g. 25000"
                        value={formData.salary}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="field-box">
                      <label>Shift Time</label>
                      <select
                        name="shiftTime"
                        value={formData.shiftTime}
                        onChange={handleInputChange}
                      >
                        <option value="Morning">Morning</option>
                        <option value="Evening">Evening</option>
                        <option value="Full Day">Full Day</option>
                      </select>
                    </div>
                  </div>

                  <div className="input-grid-row single">
                    <div className="field-box">
                      <label>Certifications</label>
                      <input
                        name="certification"
                        placeholder="e.g., ACE, Gold's Gym"
                        value={formData.certification}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-global-actions">
                <button
                  type="button"
                  className="action-cancel"
                  onClick={handleCloseModal}
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="action-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? isEditMode
                      ? "Updating..."
                      : "Onboarding..."
                    : isEditMode
                      ? "Update Trainer"
                      : "Confirm Onboarding"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="mini-confirm-overlay" onClick={closeDeleteModal}>
          <div
            className="mini-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h4>Delete Trainer?</h4>
            <p>
              Are you sure you want to delete
              <span className="highlight-name"> {deleteTarget?.trainerName}</span>
              ?
            </p>
            <small>This action cannot be undone.</small>

            <div className="mini-confirm-actions">
              <button
                type="button"
                className="mini-cancel-btn"
                onClick={closeDeleteModal}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="mini-delete-btn"
                onClick={handleDeleteTrainer}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "OK, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="trainer-glory-grid">
        {loading ? (
          <div className="loader-central">
            <div className="spinner"></div>
            <p>Fetching Elite...</p>
          </div>
        ) : filteredTrainers.length === 0 ? (
          <div className="empty-state-card">
            <Users size={60} />
            <h3>No Trainers Found</h3>
          </div>
        ) : (
          filteredTrainers.map((t) => (
            <div key={t._id} className="compact-trainer-card">
              <div className="card-top-header">
                <div className="avatar-shield">
                  {t.userId?.fullName?.charAt(0).toUpperCase()}
                </div>
                <div className="header-info">
                  <div className="name-row">
                    <h3 className="text-white">{t.userId?.fullName}</h3>
                    <span
                      className={`status-dot ${t.accountStatus?.toLowerCase() === "active" ? "active" : "inactive"}`}
                    ></span>
                  </div>
                  <div className="sub-badges">
                    <span className="badge gender-badge">
                      {t.gender || "N/A"}
                    </span>
                    {t.certification && (
                      <span className="badge cert-badge">
                        <Award size={10} /> {t.certification}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="info-data-grid">
                <div className="data-box">
                  <span className="label">Exp</span>
                  <strong>{t.experience ? `${t.experience} Yrs` : "N/A"}</strong>
                </div>
                <div className="data-box">
                  <span className="label">Shift</span>
                  <strong>{t.shiftTime || "N/A"}</strong>
                </div>
                <div className="data-box">
                  <span className="label">Salary</span>
                  <strong>
                    {typeof t.salary === "number"
                      ? `₹${t.salary.toLocaleString()}`
                      : "N/A"}
                  </strong>
                </div>
                <div className="data-box">
                  <span className="label">Joined</span>
                  <strong>{formatDate(t.joiningDate)}</strong>
                </div>
              </div>

              <div className="card-middle-section">
                <div className="skill-tags">
                  {(t.specialization || ["N/A"]).map((s, i) => (
                    <span key={i} className="tag">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="contact-lines">
                  <div className="line">
                    <Phone size={14} /> <span>{t.userId?.number || "N/A"}</span>
                  </div>
                  <div className="line">
                    <Mail size={14} /> <span>{t.userId?.email || "N/A"}</span>
                  </div>
                  <div className="line">
                    <User size={14} /> <span>DOB: {formatDate(t.dob)}</span>
                  </div>
                  <div className="line address-line">
                    <MapPin size={14} />
                    <span>{t.address || t.userId?.address || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="card-action-footer">
                <button className="btn-view-details">
                  <Eye size={16} /> Details
                </button>
                <div className="action-icons">
                  <button className="icon-btn edit" onClick={() => openEditModal(t)}>
                    <Pencil size={16} />
                  </button>
                  <button className="icon-btn delete" onClick={() => openDeleteModal(t)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default TrainerManagement;
