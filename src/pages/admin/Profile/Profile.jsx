import React, { useEffect, useRef, useState } from 'react';
import { Camera, ShieldCheck, MapPin, Mail, Phone, Pencil } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext'; // ✅ ADDED
import { uploadImageToCloudinary } from '../../../utils/uploadImageToCloudinary';
import './Profile.scss';

const API = 'http://localhost:5000/api/user/admin-profile';

const Profile = () => {
  const [admin, setAdmin] = useState(null);
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // File or URL
  const fileInputRef = useRef(null);

  const { updateUser } = useAuth(); // ✅ ADDED

  // ✅ Fetch Profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('yodha_token');
        const res = await axios.get(API, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.success) {
          setAdmin(res.data.data);
          setForm(res.data.data);
        }
      } catch (err) {
        console.error(err);
        setAdmin(null);
      }
    };

    fetchProfile();
  }, []);

  // ✅ Input Change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✅ Update API with Loading
  const handleSave = async () => {
    try {
      setLoading(true);
      let profilePicUrl = form.profilePic || '';

      // If a new image is selected, upload it first
      if (selectedImage && selectedImage instanceof File) {
        setUploading(true);
        const url = await uploadImageToCloudinary(selectedImage);
        setUploading(false);
        if (url) {
          profilePicUrl = url;
        } else {
          toast.error('Image upload failed');
          setLoading(false);
          return;
        }
      }

      const token = localStorage.getItem('yodha_token');
      const payload = {
        fullName: form.fullName,
        email: form.email,
        number: form.number,
        address: form.address,
        dob: form.dob ? new Date(form.dob).toISOString() : null,
        profilePic: profilePicUrl,
      };

      const res = await axios.patch(API, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.data?.success) {
        setAdmin(res.data.data);
        setForm(res.data.data);
        setSelectedImage(null);
        updateUser(res.data.data); // ✅🔥 MAIN FIX
        setEdit(false);
        toast.success('Profile updated successfully ✅');
      }
    } catch (err) {
      console.error(err);
      toast.error('Update failed ❌');
    } finally {
      setLoading(false);
    }
  };

  // Handle image file selection and upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedImage(file);
    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, profilePic: previewUrl }));
  };

  if (!admin) {
    return (
      <div className="profile-page">
        <div className="profile-header">
          <h2>My Profile</h2>
        </div>
        <div className="loader">Loading...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* HEADER */}
      <header className="profile-header">
        <div>
          <h2 className="profile-title">My Profile</h2>
          <p className="profile-subtitle">
            Update your admin profile details anytime.
          </p>
        </div>

        <button
          type="button"
          className="edit-btn"
          onClick={() => {
            setEdit((v) => !v);
            setForm(admin);
          }}
        >
          <Pencil size={16} />
          {edit ? 'Cancel' : 'Edit'}
        </button>
      </header>

      <section className="profile-grid">
        {/* LEFT CARD */}
        <aside className="profile-card">
          <div className="avatar-ring">
            <div className="avatar" style={{ width: 110, height: 110, borderRadius: '50%', overflow: 'hidden', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '4px solid #2bdcff' }}>
              {form.profilePic ? (
                <img
                  src={form.profilePic}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                <span style={{ fontSize: 40, color: '#fff' }}>{admin.fullName?.charAt(0) || 'A'}</span>
              )}
            </div>

            {/* ✅ SHOW ONLY IN EDIT MODE */}
            {edit && (
              <>
                <button
                  type="button"
                  className="avatar-btn"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  disabled={uploading}
                  style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '50%', border: 'none', padding: 6, cursor: 'pointer' }}
                >
                  <Camera size={16} /> Change
                </button>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  disabled={uploading}
                />
              </>
            )}
          </div>

          <h3>{admin.fullName}</h3>
          <p>{admin.role}</p>

          <div className="badge">
            <ShieldCheck size={14} />
            {admin.accountStatus === 'active'
              ? 'Active Admin'
              : 'Inactive'}
          </div>

          <div className="profile-info">
            <div>
              <Mail size={16} />
              <span>{admin.email}</span>
            </div>

            <div>
              <Phone size={16} />
              <span>{admin.number}</span>
            </div>

            <div>
              <MapPin size={16} />
              <span>{admin.address}</span>
            </div>
          </div>

          <div className="meta">
            <div>
              <span>Date of Birth</span>
              <strong>
                {admin.dob
                  ? new Date(admin.dob).toLocaleDateString('en-IN')
                  : '-'}
              </strong>
            </div>

            <div>
              <span>Joined</span>
              <strong>
                {admin.createdAt
                  ? new Date(admin.createdAt).toLocaleDateString('en-IN')
                  : '-'}
              </strong>
            </div>
          </div>
        </aside>

        {/* FORM */}
        <form className="profile-form">
          <h4>Personal Details</h4>

          <div className="field-grid">
            <label>
              Full Name
              <input
                name="fullName"
                type="text"
                value={form.fullName || ''}
                onChange={handleChange}
                disabled={!edit}
              />
            </label>

            <label>
              Email Address
              <input
                name="email"
                type="email"
                value={form.email || ''}
                onChange={handleChange}
                disabled={!edit}
              />
            </label>

            <label>
              Phone
              <input
                name="number"
                type="tel"
                value={form.number || ''}
                onChange={handleChange}
                disabled={!edit}
              />
            </label>

            <label>
              Address
              <input
                name="address"
                type="text"
                value={form.address || ''}
                onChange={handleChange}
                disabled={!edit}
              />
            </label>

            <label>
              Date of Birth
              <input
                name="dob"
                type="date"
                value={form.dob ? form.dob.slice(0, 10) : ''}
                onChange={handleChange}
                disabled={!edit}
              />
            </label>

            <label>
              Account Status
              <input
                name="accountStatus"
                type="text"
                value={form.accountStatus || ''}
                disabled
              />
            </label>
          </div>

          {/* ✅ SHOW ONLY IN EDIT MODE */}
          {edit && (
            <div className="form-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setForm(admin)}
                disabled={loading}
              >
                Reset
              </button>

              <button
                type="button"
                className="primary"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span> Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          )}
        </form>
      </section>
    </div>
  );
};

export default Profile;