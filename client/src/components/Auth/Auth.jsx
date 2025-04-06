import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './auth.css';

const Auth = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // If already authenticated, redirect to home
    if (isAuthenticated && !loading) {
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);

  const handleGoogleLogin = () => {
    // Redirect to Google OAuth endpoint
    window.location.href = `${import.meta.env.VITE_API_ADDRESS}/auth/google`;
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Welcome to MV-Live</h1>
        <p className="auth-subtitle">Sign in to continue</p>
        
        <button 
          className="google-auth-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <img src="/google-icon.svg" alt="Google" className="google-icon" />
          {loading ? 'Please wait...' : 'Continue with Google'}
        </button>
        
        <p className="auth-info">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
