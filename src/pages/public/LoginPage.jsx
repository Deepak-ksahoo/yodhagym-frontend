import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Fingerprint, ArrowLeft, Mail, Loader2, Edit3, Send } from 'lucide-react';
import { toast } from 'react-toastify';
import './LoginPage.scss';
import { API_BASE_URL } from '../../utils/api';

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const getPayload = (withOtp = false) => {
    const isEmail = identifier.includes('@');
    const payload = isEmail ? { email: identifier } : { number: identifier };
    if (withOtp) {
      payload.otp = otp;
    }
    return payload;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!identifier) {
      toast.warning('Please provide your Email or Phone Number.');
      return;
    }

    setLoading(true);

    try {
      const payload = getPayload(false);
      const response = await fetch(`${API_BASE_URL}/api/user/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();

      if (response.ok && result.success !== false) {
        setOtpSent(true);
        toast.success(result.message || 'OTP sent successfully!');
      } else {
        let errorMsg = result.message || 'Failed to send OTP.';
        if (errorMsg.toLowerCase().includes('not found')) {
          errorMsg = 'No active system access found for these credentials. Please contact administration.';
        }
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error("OTP send error:", err);
      toast.error('Server Error. Ensure your backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp) {
      toast.warning('Please enter the OTP.');
      return;
    }
    if (otp.length < 4) {
      toast.warning('OTP must be at least 4 digits.');
      return;
    }

    setLoading(true);

    try {
      const payload = getPayload(true);
      const response = await fetch(`${API_BASE_URL}/api/user/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();

      if (response.ok && (result.success === true || result.token)) {
        toast.success('Access Granted. Welcome back, Yodha!');
        login(result.data, result.token);

        const role = result.data && result.data.role ? result.data.role.toLowerCase() : 'member';
        
        if (role === 'developer') navigate('/dev/dashboard');
        else if (role === 'admin') navigate('/admin/dashboard');
        else if (role === 'trainer') navigate('/trainer/dashboard');
        else navigate('/member/dashboard');
        
      } else {
        toast.error(result.message || "Invalid OTP or Access Denied!");
      }
    } catch (err) {
      console.error("OTP verify error:", err);
      toast.error('Server Error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <button onClick={() => navigate('/')} className="back-btn">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="login-box">
        <div className="icon-wrapper">
          <Fingerprint className="icon" />
        </div>
        <h2>System <span>Access</span></h2>
        
        {!otpSent ? (
          <p>Enter your Email or Phone to receive an OTP.</p>
        ) : (
          <p>We've sent a secure OTP to your contact.</p>
        )}

        {!otpSent ? (
          <form onSubmit={handleSendOTP}>
            <div className="input-group">
              <label>Email / Phone Number</label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input 
                  type="text" 
                  placeholder="Enter your email or phone number" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={24} style={{ display: 'inline' }} /> : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Send size={18} /> Get OTP
                </span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div className="input-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Verification Code</span>
                <button 
                  type="button" 
                  onClick={() => { setOtpSent(false); setOtp(''); }}
                  className="edit-toggle"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Edit3 size={12} /> Edit Mail/Number
                </button>
              </label>
              <div className="input-wrapper">
                <input 
                  type="password" 
                  placeholder="Enter OTP here" 
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  style={{ 
                    paddingLeft: otp ? '1rem' : '3rem', 
                    textAlign: otp ? 'center' : 'left',
                    letterSpacing: otp ? '0.5em' : 'normal' 
                  }}
                />
                {!otp && <Fingerprint className="input-icon" />}
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={24} style={{ display: 'inline' }} /> : 'Verify & Enter System'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
