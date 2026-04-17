import React from 'react';
import { Camera, ShieldCheck, MapPin, Mail, Phone, Pencil } from 'lucide-react';
import './Profile.scss';

const Profile = () => {
  const developer = {
    name: 'Deepak Sahoo',
    role: 'Developer',
    email: 'deepak@yodhagym.in',
    phone: '+91 90000 11223',
    location: 'Bhubaneswar, Odisha',
    codeName: 'YodhaCore',
    joined: '15 Jan 2024'
  };

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div>
          <h2 className="profile-title">My Profile</h2>
          <p className="profile-subtitle">Update your developer profile details anytime.</p>
        </div>
        <button type="button" className="edit-btn">
          <Pencil size={16} />
          Edit Mode
        </button>
      </header>

      <section className="profile-grid">
        <aside className="profile-card">
          <div className="avatar-ring">
            <div className="avatar">D</div>
            <button type="button" className="avatar-btn">
              <Camera size={16} />
            </button>
          </div>

          <h3>{developer.name}</h3>
          <p>{developer.role}</p>
          <div className="badge">
            <ShieldCheck size={14} />
            Super Access
          </div>

          <div className="profile-info">
            <div>
              <Mail size={16} />
              <span>{developer.email}</span>
            </div>
            <div>
              <Phone size={16} />
              <span>{developer.phone}</span>
            </div>
            <div>
              <MapPin size={16} />
              <span>{developer.location}</span>
            </div>
          </div>

          <div className="meta">
            <div>
              <span>Codename</span>
              <strong>{developer.codeName}</strong>
            </div>
            <div>
              <span>Joined</span>
              <strong>{developer.joined}</strong>
            </div>
          </div>
        </aside>

        <form className="profile-form">
          <h4>Personal Details</h4>

          <div className="field-grid">
            <label>
              Full Name
              <input type="text" defaultValue={developer.name} />
            </label>
            <label>
              Email Address
              <input type="email" defaultValue={developer.email} />
            </label>
            <label>
              Phone
              <input type="tel" defaultValue={developer.phone} />
            </label>
            <label>
              Location
              <input type="text" defaultValue={developer.location} />
            </label>
            <label>
              Role
              <input type="text" defaultValue={developer.role} />
            </label>
            <label>
              Codename
              <input type="text" defaultValue={developer.codeName} />
            </label>
          </div>

          <label className="full">
            Bio
            <textarea rows="4" defaultValue="Builder of the Yodha system. Focused on speed, security, and clean UI." />
          </label>

          <div className="form-actions">
            <button type="button" className="ghost">Reset</button>
            <button type="button" className="primary">Save Changes</button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default Profile;
