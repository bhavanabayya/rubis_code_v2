import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import { apiClient } from '../api/client';
import '../styles/Form.css';

const SignupPage: React.FC = () => {
  console.log('[COMPONENT MOUNT] SignupPage loaded');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const isSignIn = location.pathname === '/signin';
  const urlRole = searchParams.get('role');
  const isCompanyFlow = searchParams.get('type') === 'company' || urlRole !== null;
  const isCandidateFlow = searchParams.get('type') === 'candidate';
  console.log('[PAGE INFO] Mode:', isSignIn ? 'SignIn' : 'SignUp', 'URL Role:', urlRole, 'IsCompany:', isCompanyFlow, 'IsCandidate:', isCandidateFlow);
  
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
    userType: isCompanyFlow ? 'company' : (isCandidateFlow ? 'candidate' : 'company'),
    companyRole: urlRole === 'recruiter' ? 'recruiter' : 'admin',
    signInRole: 'admin', // For sign-in role validation
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Update companyRole if URL param changes
    if (urlRole) {
      if (urlRole === 'recruiter') {
        setFormData(prev => ({
          ...prev,
          userType: 'company',
          companyRole: 'recruiter'
        }));
      } else {
        // Default to admin for any other URL role
        setFormData(prev => ({
          ...prev,
          userType: 'company',
          companyRole: 'admin'
        }));
      }
    }
  }, [urlRole]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('[AUTH] Sign in attempt - Email:', formData.email, 'UserType:', formData.userType);
    try {
      let response;
      
      // Use appropriate login endpoint based on user type
      if (formData.userType === 'candidate') {
        response = await apiClient.candidateLogin(formData.email, formData.password);
        console.log('[AUTH SUCCESS] Candidate logged in - Email:', response.data.email);
      } else {
        response = await apiClient.companyLogin(formData.email, formData.password);
        console.log('[AUTH SUCCESS] Company user logged in - Email:', response.data.email, 'Role:', response.data.role);
      }

      // Save token and user info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('email', response.data.email);
      localStorage.setItem('role', response.data.role);
      if (response.data.full_name) localStorage.setItem('full_name', response.data.full_name);
      if (response.data.company_name) localStorage.setItem('company_name', response.data.company_name);

      // Redirect based on user type
      if (formData.userType === 'candidate') {
        console.log('[NAVIGATION] Redirecting to candidate dashboard');
        navigate('/candidate-dashboard');
      } else {
        console.log('[NAVIGATION] Redirecting to recruiter dashboard');
        navigate('/recruiter-dashboard');
      }
    } catch (err: any) {
      console.error('[AUTH ERROR] Sign in failed:', err);
      if (err.response?.status === 403) {
        setError('Access denied: Please check your credentials and user type.');
      } else {
        setError(err.response?.data?.detail || 'Sign in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignIn) {
      return handleSignIn(e);
    }

    setError('');

    if (formData.password !== formData.confirmPassword) {
      console.warn('[VALIDATION] Password mismatch');
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    console.log('[AUTH] Sign up attempt - Email:', formData.email, 'UserType:', formData.userType, 'CompanyRole:', formData.companyRole);
    try {
      let response;
      
      // Use appropriate signup endpoint based on user type
      if (formData.userType === 'candidate') {
        response = await apiClient.candidateSignup(
          formData.email,
          formData.fullName,
          formData.password
        );
        console.log('[AUTH SUCCESS] Candidate registered - Email:', response.data.email);
      } else {
        response = await apiClient.companySignup(
          formData.email,
          formData.fullName,
          formData.password,
          formData.companyRole
        );
        console.log('[AUTH SUCCESS] Company user registered - Email:', response.data.email, 'Role:', response.data.role);
      }

      // Save token and user info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('email', response.data.email);
      localStorage.setItem('role', response.data.role);
      if (response.data.full_name) localStorage.setItem('full_name', response.data.full_name);
      if (response.data.company_name) localStorage.setItem('company_name', response.data.company_name);

      // Redirect based on user type
      if (formData.userType === 'candidate') {
        console.log('[NAVIGATION] Redirecting to candidate dashboard');
        navigate('/candidate-dashboard');
      } else {
        console.log('[NAVIGATION] Redirecting to recruiter dashboard');
        navigate('/recruiter-dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer 
      title={isSignIn ? 'Sign In' : 'Sign Up'} 
      subtitle={isSignIn ? 
        (formData.userType === 'candidate' ? 'Sign in as a candidate' : 'Sign in as a company') : 
        (formData.userType === 'candidate' ? 'As a Candidate' : 'As a Company')
      }
    >
      <div
        style={{
          maxWidth: '450px',
          margin: '0 auto',
          padding: '40px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Back to Home Link */}
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            ← Back to Home
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {/* Company Role Selection for Company Signup/Signin */}
          {formData.userType === 'company' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px' }}>
                  Select Your Role
                </label>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', padding: '12px', border: formData.companyRole === 'admin' ? '2px solid var(--primary)' : '2px solid var(--border)', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', background: formData.companyRole === 'admin' ? 'rgba(102, 126, 234, 0.05)' : 'white' }}>
                    <input
                      type="radio"
                      name="companyRole"
                      value="admin"
                      checked={formData.companyRole === 'admin'}
                      onChange={handleChange}
                      style={{ marginRight: '12px', marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', fontSize: '13px' }}>ADMIN</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Full access to all company features and job postings</div>
                    </div>
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'flex-start', padding: '12px', border: formData.companyRole === 'hr' ? '2px solid var(--primary)' : '2px solid var(--border)', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', background: formData.companyRole === 'hr' ? 'rgba(102, 126, 234, 0.05)' : 'white' }}>
                    <input
                      type="radio"
                      name="companyRole"
                      value="hr"
                      checked={formData.companyRole === 'hr'}
                      onChange={handleChange}
                      style={{ marginRight: '12px', marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', fontSize: '13px' }}>HR</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Access to all company job postings and candidate management</div>
                    </div>
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'flex-start', padding: '12px', border: formData.companyRole === 'recruiter' ? '2px solid var(--primary)' : '2px solid var(--border)', borderRadius: '8px', cursor: 'pointer', background: formData.companyRole === 'recruiter' ? 'rgba(102, 126, 234, 0.05)' : 'white' }}>
                    <input
                      type="radio"
                      name="companyRole"
                      value="recruiter"
                      checked={formData.companyRole === 'recruiter'}
                      onChange={handleChange}
                      style={{ marginRight: '12px', marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', fontSize: '13px' }}>RECRUITER</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Post and manage your own job postings</div>
                    </div>
                  </label>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  This role determines which features you can access after signing in
                </div>
              </div>
            </>
          )}

          {/* Full Name - Only for signup */}
          {!isSignIn && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Your name"
                required
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '2px solid var(--border)',
                  width: '100%',
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid var(--border)',
                width: '100%',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={isSignIn ? "Your password" : "Min 8 chars, 1 uppercase, 1 digit, 1 special char"}
              required
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid var(--border)',
                width: '100%',
              }}
            />
            {!isSignIn && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Must be at least 8 characters with uppercase, digit, and special character
              </div>
            )}
          </div>

          {!isSignIn && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '2px solid var(--border)',
                  width: '100%',
                }}
              />
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '12px',
                background: 'rgba(255, 71, 87, 0.1)',
                color: 'var(--error)',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '700',
            }}
          >
            {loading ? (isSignIn ? 'Signing in...' : 'Creating Account...') : (isSignIn ? 'Sign In' : 'Sign Up')}
          </button>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => {
                const userTypeParam = formData.userType === 'candidate'
                  ? '?type=candidate'
                  : (formData.companyRole === 'recruiter' ? '?role=recruiter' : '?type=company');
                navigate(isSignIn ? `/signup${userTypeParam}` : `/signin${userTypeParam}`);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {isSignIn 
                ? "Don't have an account? Sign Up Here" 
                : 'Already have an account? Sign In Here'
              }
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
};

export default SignupPage;
